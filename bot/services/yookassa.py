"""
Сервис для работы с ЮKassa.
Онлайн-оплата картой прямо в Telegram.
"""
import asyncio
import logging
from uuid import uuid4
from typing import Optional
from dataclasses import dataclass

from yookassa import Configuration, Payment
from yookassa.domain.response import PaymentResponse

from core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    """Результат создания платежа"""
    success: bool
    payment_id: Optional[str] = None
    payment_url: Optional[str] = None
    error: Optional[str] = None


class YooKassaService:
    """Сервис для работы с ЮKassa"""

    def __init__(self):
        self._configured = False
        self._configure()

    def _configure(self):
        """Настройка SDK"""
        if settings.YOOKASSA_SHOP_ID and settings.YOOKASSA_SECRET_KEY:
            Configuration.account_id = settings.YOOKASSA_SHOP_ID
            Configuration.secret_key = settings.YOOKASSA_SECRET_KEY
            self._configured = True
            logger.info("YooKassa configured successfully")
        else:
            logger.warning("YooKassa not configured: missing SHOP_ID or SECRET_KEY")

    @property
    def is_available(self) -> bool:
        """Доступна ли онлайн-оплата"""
        return self._configured

    async def create_payment(
        self,
        amount: float,
        order_id: int,
        description: str,
        user_id: int,
    ) -> PaymentResult:
        """
        Создать платёж в ЮKassa.

        Args:
            amount: Сумма в рублях
            order_id: ID заказа в нашей системе
            description: Описание платежа
            user_id: Telegram ID пользователя

        Returns:
            PaymentResult с URL для оплаты или ошибкой
        """
        if not self._configured:
            return PaymentResult(
                success=False,
                error="Онлайн-оплата временно недоступна"
            )

        try:
            # Формируем return_url с параметрами
            return_url = settings.formatted_yookassa_return_url

            # Run sync Payment.create() in thread pool to avoid blocking event loop
            payment_data = {
                "amount": {
                    "value": f"{amount:.2f}",
                    "currency": "RUB"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": return_url
                },
                "capture": True,  # Автоматическое подтверждение
                "description": description,
                "metadata": {
                    "order_id": order_id,
                    "user_id": user_id,
                }
            }
            idempotence_key = uuid4().hex
            payment = await asyncio.to_thread(Payment.create, payment_data, idempotence_key)

            logger.info(f"Payment created: {payment.id} for order #{order_id}")

            return PaymentResult(
                success=True,
                payment_id=payment.id,
                payment_url=payment.confirmation.confirmation_url
            )

        except Exception as e:
            logger.error(f"Failed to create payment: {e}")
            return PaymentResult(
                success=False,
                error=str(e)
            )

    async def check_payment(self, payment_id: str) -> Optional[PaymentResponse]:
        """
        Проверить статус платежа.

        Args:
            payment_id: ID платежа в ЮKassa

        Returns:
            PaymentResponse или None если ошибка
        """
        if not self._configured:
            return None

        try:
            # Run sync Payment.find_one() in thread pool to avoid blocking event loop
            payment = await asyncio.to_thread(Payment.find_one, payment_id)
            return payment
        except Exception as e:
            logger.error(f"Failed to check payment {payment_id}: {e}")
            return None

    async def is_payment_succeeded(self, payment_id: str) -> bool:
        """Проверить, прошёл ли платёж успешно"""
        payment = await self.check_payment(payment_id)
        if payment:
            return payment.status == "succeeded"
        return False


# Singleton instance
_yookassa_service: Optional[YooKassaService] = None


def get_yookassa_service() -> YooKassaService:
    """Получить инстанс сервиса ЮKassa"""
    global _yookassa_service
    if _yookassa_service is None:
        _yookassa_service = YooKassaService()
    return _yookassa_service

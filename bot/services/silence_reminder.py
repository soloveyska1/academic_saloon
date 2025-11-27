"""
Напоминание клиенту если админ долго не отвечает.
Отправляет сообщение через 15 минут после создания заказа,
если цена ещё не назначена.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
import pytz

from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select

from database.models.orders import Order, OrderStatus
from core.config import settings

logger = logging.getLogger(__name__)
MSK = pytz.timezone("Europe/Moscow")

# Время в минутах до напоминания
SILENCE_THRESHOLD_MINUTES = 15


class SilenceReminder:
    """
    Отслеживает заказы без ответа админа.
    Отправляет напоминание клиенту если долго нет цены.
    """

    def __init__(self, bot: Bot, session_maker: async_sessionmaker):
        self.bot = bot
        self.session_maker = session_maker
        self._running = False
        self._task: Optional[asyncio.Task] = None
        # Храним ID заказов, по которым уже отправили напоминание
        self._notified_orders: set[int] = set()

    async def check_pending_orders(self):
        """Проверить заказы, ожидающие оценки"""
        async with self.session_maker() as session:
            # Ищем заказы в статусе PENDING (ожидают оценки)
            threshold = datetime.now(MSK) - timedelta(minutes=SILENCE_THRESHOLD_MINUTES)

            query = select(Order).where(
                Order.status == OrderStatus.PENDING.value,
                Order.price == 0,  # Цена ещё не назначена
            )

            result = await session.execute(query)
            orders = result.scalars().all()

            for order in orders:
                try:
                    # Пропускаем если уже уведомляли
                    if order.id in self._notified_orders:
                        continue

                    # Проверяем время создания
                    created_at = order.created_at
                    if created_at.tzinfo is None:
                        created_at = MSK.localize(created_at)

                    if created_at < threshold:
                        # Прошло больше 15 минут — отправляем напоминание
                        await self._send_reminder(order)
                        self._notified_orders.add(order.id)

                except Exception as e:
                    logger.error(f"Error checking order {order.id}: {e}")

    async def _send_reminder(self, order: Order):
        """Отправить напоминание клиенту"""
        text = f"""⏳ <b>Хозяин сейчас занят</b>

Твоя заявка #{order.id} в очереди.
Обычно отвечаю быстрее, но сейчас небольшой завал.

Скоро напишу с ценой! А если срочно —
можешь написать напрямую: @{settings.SUPPORT_USERNAME}

Спасибо за терпение! 🤠"""

        try:
            await self.bot.send_message(
                chat_id=order.user_id,
                text=text,
            )
            logger.info(f"Silence reminder sent for order #{order.id} to user {order.user_id}")
        except Exception as e:
            logger.error(f"Failed to send silence reminder: {e}")

    async def _check_loop(self):
        """Цикл проверки заказов"""
        while self._running:
            try:
                await self.check_pending_orders()
            except Exception as e:
                logger.error(f"Error in silence reminder loop: {e}")

            # Проверяем каждые 3 минуты
            await asyncio.sleep(180)

    def start(self):
        """Запустить фоновую проверку"""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._check_loop())
            logger.info("Silence reminder service started")

    def stop(self):
        """Остановить фоновую проверку"""
        self._running = False
        if self._task:
            self._task.cancel()

    def clear_notification(self, order_id: int):
        """Убрать заказ из списка уведомлённых (если нужно повторно уведомить)"""
        self._notified_orders.discard(order_id)


# Глобальный экземпляр
_reminder: Optional[SilenceReminder] = None


def init_silence_reminder(bot: Bot, session_maker: async_sessionmaker) -> SilenceReminder:
    """Инициализировать сервис напоминаний"""
    global _reminder
    _reminder = SilenceReminder(bot, session_maker)
    _reminder.start()
    return _reminder


def get_silence_reminder() -> Optional[SilenceReminder]:
    """Получить глобальный сервис напоминаний"""
    return _reminder

"""
Сервис бонусной системы — начисление и списание бонусов
"""
import logging
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from aiogram import Bot

from database.models.users import User


logger = logging.getLogger(__name__)

# Описания причин изменения баланса для уведомлений
BONUS_REASON_DESCRIPTIONS = {
    "order_created": "Бонус за новый заказ",
    "referral_bonus": "Реферальный бонус",
    "admin_adjustment": "Корректировка админом",
    "order_discount": "Использовано на заказ",
    "compensation": "Компенсация",
    "order_cashback": "Кешбэк за заказ",
}


class BonusReason(str, Enum):
    """Причины изменения баланса"""
    ORDER_CREATED = "order_created"          # Бонус за создание заказа
    REFERRAL_BONUS = "referral_bonus"        # Бонус за реферала
    ADMIN_ADJUSTMENT = "admin_adjustment"    # Корректировка админом
    ORDER_DISCOUNT = "order_discount"        # Списание на заказ
    COMPENSATION = "compensation"            # Компенсация
    ORDER_CASHBACK = "order_cashback"        # Кешбэк за выполненный заказ


# Настройки бонусов
BONUS_FOR_ORDER = 50  # Бонусы за создание заказа
REFERRAL_PERCENT = 5  # Процент рефереру от оплаты

# Кешбэк по рангам (% от суммы заказа)
# Резидент -> Партнёр -> VIP-Клиент -> Премиум
RANK_CASHBACK = {
    0: 0,      # Резидент - 0%
    1: 3,      # Партнёр - 3%
    2: 5,      # VIP-Клиент - 5%
    3: 7,      # Премиум - 7%
}


class BonusService:
    """Сервис управления бонусами"""

    @staticmethod
    async def add_bonus(
        session: AsyncSession,
        user_id: int,
        amount: float,
        reason: BonusReason,
        description: str | None = None,
        bot: Bot | None = None,
    ) -> float:
        """
        Начисляет бонусы пользователю

        Args:
            session: Сессия БД
            user_id: Telegram ID пользователя
            amount: Сумма бонусов
            reason: Причина начисления
            description: Описание для лога
            bot: Бот для логирования

        Returns:
            Новый баланс пользователя
        """
        query = select(User).where(User.telegram_id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            return 0.0

        old_balance = user.balance
        user.balance += amount
        await session.commit()

        # Логируем в консоль
        logger.info(
            f"Bonus added: user={user_id}, amount=+{amount:.0f}₽, "
            f"reason={reason.value}, balance: {old_balance:.0f}₽ → {user.balance:.0f}₽"
        )

        # ═══ WEBSOCKET REAL-TIME УВЕДОМЛЕНИЕ ═══
        try:
            from bot.services.realtime_notifications import send_balance_notification
            reason_text = BONUS_REASON_DESCRIPTIONS.get(reason.value, description or reason.value)
            await send_balance_notification(
                telegram_id=user_id,
                change=float(amount),
                new_balance=float(user.balance),
                reason=reason_text,
                reason_key=reason.value,
            )
        except Exception as e:
            logger.warning(f"[WS] Failed to send balance notification: {e}")

        return user.balance

    @staticmethod
    async def deduct_bonus(
        session: AsyncSession,
        user_id: int,
        amount: float,
        reason: BonusReason,
        description: str | None = None,
        bot: Bot | None = None,
        user: User | None = None,
    ) -> tuple[bool, float]:
        """
        Списывает бонусы с баланса

        Args:
            session: Сессия БД
            user_id: Telegram ID пользователя
            amount: Сумма к списанию
            reason: Причина списания
            description: Описание для лога
            bot: Бот для логирования
            user: Уже загруженный объект User (чтобы избежать проблем с сессией)

        Returns:
            (успех, новый баланс)
        """
        # Используем переданный user или загружаем новый
        if user is None:
            query = select(User).where(User.telegram_id == user_id)
            result = await session.execute(query)
            user = result.scalar_one_or_none()

        if not user or user.balance < amount:
            return False, user.balance if user else 0.0

        old_balance = user.balance
        user.balance -= amount
        # НЕ делаем commit здесь - пусть вызывающий код сам решает когда коммитить

        # Логируем в консоль
        logger.info(
            f"Bonus deducted: user={user_id}, amount=-{amount:.0f}₽, "
            f"reason={reason.value}, balance: {old_balance:.0f}₽ → {user.balance:.0f}₽"
        )

        # ═══ WEBSOCKET REAL-TIME УВЕДОМЛЕНИЕ О СПИСАНИИ ═══
        try:
            from bot.services.realtime_notifications import send_balance_notification
            reason_text = BONUS_REASON_DESCRIPTIONS.get(reason.value, description or reason.value)
            await send_balance_notification(
                telegram_id=user_id,
                change=-float(amount),  # Отрицательное значение для списания
                new_balance=float(user.balance),
                reason=reason_text,
                reason_key=reason.value,
            )
        except Exception as e:
            logger.warning(f"[WS] Failed to send deduction notification: {e}")

        return True, user.balance

    @staticmethod
    async def get_balance(session: AsyncSession, user_id: int) -> float:
        """Получает баланс пользователя"""
        query = select(User.balance).where(User.telegram_id == user_id)
        result = await session.execute(query)
        balance = result.scalar_one_or_none()
        return balance or 0.0

    @staticmethod
    async def process_order_bonus(
        session: AsyncSession,
        bot: Bot,
        user_id: int,
    ) -> float:
        """
        Начисляет бонус за создание заказа

        Returns:
            Сумма начисленных бонусов
        """
        return await BonusService.add_bonus(
            session=session,
            user_id=user_id,
            amount=BONUS_FOR_ORDER,
            reason=BonusReason.ORDER_CREATED,
            description=f"Бонус за новый заказ (+{BONUS_FOR_ORDER}₽)",
            bot=bot,
        )

    @staticmethod
    async def process_referral_bonus(
        session: AsyncSession,
        bot: Bot,
        referrer_id: int,
        order_amount: float,
        referred_user_id: int,
    ) -> float:
        """
        Начисляет бонус рефереру за оплаченный заказ

        Args:
            referrer_id: ID того, кто пригласил
            order_amount: Сумма заказа
            referred_user_id: ID приглашённого пользователя

        Returns:
            Сумма начисленных бонусов
        """
        bonus_amount = order_amount * REFERRAL_PERCENT / 100

        if bonus_amount < 1:
            return 0.0

        # Получаем информацию о приглашённом для лога
        query = select(User).where(User.telegram_id == referred_user_id)
        result = await session.execute(query)
        referred_user = result.scalar_one_or_none()
        referred_name = referred_user.fullname or f"ID:{referred_user_id}" if referred_user else f"ID:{referred_user_id}"

        await BonusService.add_bonus(
            session=session,
            user_id=referrer_id,
            amount=bonus_amount,
            reason=BonusReason.REFERRAL_BONUS,
            description=f"Реферал {referred_name} оплатил заказ ({REFERRAL_PERCENT}% от {order_amount:.0f}₽)",
            bot=bot,
        )

        # Увеличиваем счётчик заработка с рефералов
        ref_query = select(User).where(User.telegram_id == referrer_id)
        ref_result = await session.execute(ref_query)
        referrer = ref_result.scalar_one_or_none()
        if referrer:
            referrer.referral_earnings += bonus_amount
            await session.commit()

        return bonus_amount

    @staticmethod
    async def add_order_cashback(
        session: AsyncSession,
        bot: Bot,
        user_id: int,
        order_id: int,
        order_amount: float,
    ) -> float:
        """
        Начисляет кешбэк за выполненный заказ на основе ранга пользователя

        Args:
            session: Сессия БД
            bot: Бот для уведомлений
            user_id: Telegram ID пользователя
            order_id: ID заказа
            order_amount: Сумма заказа

        Returns:
            Сумма начисленного кешбэка
        """
        # Получаем пользователя и его ранг
        query = select(User).where(User.telegram_id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            logger.warning(f"[Cashback] User {user_id} not found")
            return 0.0

        # Определяем ранг по total_spent
        # Используем orders_count как альтернативу для определения уровня
        completed_orders = user.orders_count or 0

        # Определяем процент кешбэка по количеству выполненных заказов
        if completed_orders >= 15:
            cashback_percent = 7   # Премиум
        elif completed_orders >= 7:
            cashback_percent = 5   # VIP-Клиент
        elif completed_orders >= 3:
            cashback_percent = 3   # Партнёр
        else:
            cashback_percent = 0   # Резидент

        if cashback_percent == 0:
            logger.info(f"[Cashback] User {user_id} has 0% cashback (Резидент level)")
            return 0.0

        # Рассчитываем кешбэк
        cashback_amount = order_amount * cashback_percent / 100

        if cashback_amount < 1:
            logger.info(f"[Cashback] Cashback for user {user_id} too small: {cashback_amount:.2f}")
            return 0.0

        # Начисляем кешбэк
        await BonusService.add_bonus(
            session=session,
            user_id=user_id,
            amount=cashback_amount,
            reason=BonusReason.ORDER_CASHBACK,
            description=f"Кешбэк {cashback_percent}% за заказ #{order_id}",
            bot=bot,
        )

        logger.info(
            f"[Cashback] User {user_id} received {cashback_amount:.0f}₽ "
            f"({cashback_percent}% of {order_amount:.0f}₽) for order #{order_id}"
        )

        return cashback_amount

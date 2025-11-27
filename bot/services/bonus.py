"""
Сервис бонусной системы — начисление и списание бонусов
"""
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from aiogram import Bot

from database.models.users import User
from bot.services.logger import BotLogger, LogEvent


class BonusReason(str, Enum):
    """Причины изменения баланса"""
    ORDER_CREATED = "order_created"          # Бонус за создание заказа
    REFERRAL_BONUS = "referral_bonus"        # Бонус за реферала
    ADMIN_ADJUSTMENT = "admin_adjustment"    # Корректировка админом
    ORDER_DISCOUNT = "order_discount"        # Списание на заказ
    COMPENSATION = "compensation"            # Компенсация


# Настройки бонусов
BONUS_FOR_ORDER = 50  # Бонусы за создание заказа
REFERRAL_PERCENT = 5  # Процент рефереру от оплаты


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

        # Логируем в канал
        if bot:
            reason_labels = {
                BonusReason.ORDER_CREATED: "🎁 Бонус за заказ",
                BonusReason.REFERRAL_BONUS: "👥 Бонус за реферала",
                BonusReason.ADMIN_ADJUSTMENT: "⚙️ Корректировка",
                BonusReason.COMPENSATION: "🤝 Компенсация",
            }

            log_text = description or reason_labels.get(reason, "Начисление")

            await BotLogger.log(
                bot=bot,
                event=LogEvent.BONUS_ADDED,
                user_id=user_id,
                extra_data={
                    "amount": f"+{amount:.0f}₽",
                    "reason": log_text,
                    "balance": f"{old_balance:.0f}₽ → {user.balance:.0f}₽",
                },
                session=session,
            )

        return user.balance

    @staticmethod
    async def deduct_bonus(
        session: AsyncSession,
        user_id: int,
        amount: float,
        reason: BonusReason,
        description: str | None = None,
        bot: Bot | None = None,
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

        Returns:
            (успех, новый баланс)
        """
        query = select(User).where(User.telegram_id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if not user or user.balance < amount:
            return False, user.balance if user else 0.0

        old_balance = user.balance
        user.balance -= amount
        await session.commit()

        # Логируем
        if bot:
            log_text = description or "Списание бонусов"

            await BotLogger.log(
                bot=bot,
                event=LogEvent.BONUS_DEDUCTED,
                user_id=user_id,
                extra_data={
                    "amount": f"-{amount:.0f}₽",
                    "reason": log_text,
                    "balance": f"{old_balance:.0f}₽ → {user.balance:.0f}₽",
                },
                session=session,
            )

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

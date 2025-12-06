"""
Сервис бонусной системы — начисление и списание бонусов
"""
import logging
from datetime import datetime
from enum import Enum
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from aiogram import Bot

from database.models.users import User
from database.models.transactions import BalanceTransaction
from database.models.levels import RankLevel

MSK_TZ = ZoneInfo("Europe/Moscow")


logger = logging.getLogger(__name__)

# Описания причин изменения баланса для уведомлений
BONUS_REASON_DESCRIPTIONS = {
    "order_created": "Бонус за новый заказ",
    "referral_bonus": "Реферальный бонус",
    "admin_adjustment": "Корректировка админом",
    "order_discount": "Использовано на заказ",
    "compensation": "Компенсация",
    "order_cashback": "Кешбэк за заказ",
    "bonus_expired": "Сгорание бонусов",
    "daily_luck": "Ежедневный бонус",
    "coupon": "Купон",
    "order_refund": "Возврат бонусов",
}


class BonusReason(str, Enum):
    """Причины изменения баланса"""
    ORDER_CREATED = "order_created"          # Бонус за создание заказа
    REFERRAL_BONUS = "referral_bonus"        # Бонус за реферала
    ADMIN_ADJUSTMENT = "admin_adjustment"    # Корректировка админом
    ORDER_DISCOUNT = "order_discount"        # Списание на заказ
    COMPENSATION = "compensation"            # Компенсация
    ORDER_CASHBACK = "order_cashback"        # Кешбэк за выполненный заказ
    BONUS_EXPIRED = "bonus_expired"          # Сгорание бонусов
    DAILY_LUCK = "daily_luck"                # Ежедневная удача / бонус
    COUPON = "coupon"                        # Промокод
    ORDER_REFUND = "order_refund"            # Возврат бонусов при отмене заказа


# Настройки бонусов
BONUS_FOR_ORDER = 50  # Бонусы за создание заказа
REFERRAL_PERCENT = 5  # Процент рефереру от оплаты

class BonusService:
    """Сервис управления бонусами"""

    @staticmethod
    def _build_reason_text(reason: BonusReason, description: str | None) -> str:
        return BONUS_REASON_DESCRIPTIONS.get(reason.value, description or reason.value)

    @staticmethod
    def _log_transaction(
        session: AsyncSession,
        user_id: int,
        amount: float,
        reason: BonusReason,
        description: str,
        tx_type: str,
    ) -> None:
        transaction = BalanceTransaction(
            user_id=user_id,
            amount=float(amount),
            type=tx_type,
            reason=reason.value,
            description=description,
        )
        session.add(transaction)

    @staticmethod
    async def _get_cashback_percent(session: AsyncSession, total_spent: float) -> float:
        """Получает процент кешбэка на основе конфигурации рангов в БД."""
        levels_result = await session.execute(
            select(RankLevel).order_by(RankLevel.min_spent.desc())
        )
        levels = levels_result.scalars().all()

        for level in levels:
            if total_spent >= (level.min_spent or 0):
                return float(level.cashback_percent or 0)

        return 0.0

    @staticmethod
    async def add_bonus(
        session: AsyncSession,
        user_id: int,
        amount: float,
        reason: BonusReason,
        description: str | None = None,
        bot: Bot | None = None,
        auto_commit: bool = True,
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

        # Обновляем дату последнего начисления и сбрасываем флаг уведомления о сгорании
        user.last_bonus_at = datetime.now(MSK_TZ)
        user.bonus_expiry_notified = False

        reason_text = BonusService._build_reason_text(reason, description)
        BonusService._log_transaction(
            session=session,
            user_id=user_id,
            amount=amount,
            reason=reason,
            description=reason_text,
            tx_type="credit",
        )

        if auto_commit:
            await session.commit()

        # Логируем в консоль
        logger.info(
            f"Bonus added: user={user_id}, amount=+{amount:.0f}₽, "
            f"reason={reason.value}, balance: {old_balance:.0f}₽ → {user.balance:.0f}₽"
        )

        # ═══ WEBSOCKET REAL-TIME УВЕДОМЛЕНИЕ ═══
        try:
            from bot.services.realtime_notifications import send_balance_notification
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
        auto_commit: bool = True,
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
        reason_text = BonusService._build_reason_text(reason, description)

        BonusService._log_transaction(
            session=session,
            user_id=user_id,
            amount=amount,
            reason=reason,
            description=reason_text,
            tx_type="debit",
        )

        if auto_commit:
            await session.commit()

        # Логируем в консоль
        logger.info(
            f"Bonus deducted: user={user_id}, amount=-{amount:.0f}₽, "
            f"reason={reason.value}, balance: {old_balance:.0f}₽ → {user.balance:.0f}₽"
        )

        # ═══ WEBSOCKET REAL-TIME УВЕДОМЛЕНИЕ О СПИСАНИИ ═══
        try:
            from bot.services.realtime_notifications import send_balance_notification
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

        # Получаем конфигурацию рангов из БД
        cashback_percent = await BonusService._get_cashback_percent(session, user.total_spent)

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

    @staticmethod
    async def expire_bonus(
        session: AsyncSession,
        bot: Bot,
        user: User,
        expire_percent: int = 20,
    ) -> float:
        """
        Списывает сгоревшие бонусы у пользователя

        Args:
            session: Сессия БД
            bot: Бот для уведомлений
            user: Пользователь
            expire_percent: Процент сгорания (по умолчанию 20%)

        Returns:
            Сумма сгоревших бонусов
        """
        if user.balance <= 0:
            return 0.0

        expire_amount = int(user.balance * expire_percent / 100)
        if expire_amount < 1:
            return 0.0

        old_balance = user.balance
        user.balance -= expire_amount

        reason_text = BonusService._build_reason_text(BonusReason.BONUS_EXPIRED, None)
        BonusService._log_transaction(
            session=session,
            user_id=user.telegram_id,
            amount=expire_amount,
            reason=BonusReason.BONUS_EXPIRED,
            description=reason_text,
            tx_type="debit",
        )

        # Сбрасываем таймер - следующее сгорание через 30 дней
        user.last_bonus_at = datetime.now(MSK_TZ)
        user.bonus_expiry_notified = False

        await session.commit()

        logger.info(
            f"[BonusExpiry] User {user.telegram_id} lost {expire_amount:.0f}₽ "
            f"({expire_percent}% of {old_balance:.0f}₽), new balance: {user.balance:.0f}₽"
        )

        # ═══ WEBSOCKET УВЕДОМЛЕНИЕ О СГОРАНИИ ═══
        try:
            from bot.services.realtime_notifications import send_balance_notification
            await send_balance_notification(
                telegram_id=user.telegram_id,
                change=-float(expire_amount),
                new_balance=float(user.balance),
                reason=reason_text,
                reason_key=BonusReason.BONUS_EXPIRED.value,
            )
        except Exception as e:
            logger.warning(f"[WS] Failed to send expiry notification: {e}")

        # ═══ TELEGRAM УВЕДОМЛЕНИЕ ═══
        try:
            await bot.send_message(
                user.telegram_id,
                f"🔥 <b>Бонусы сгорели!</b>\n\n"
                f"Сгорело: <code>−{expire_amount:.0f}₽</code>\n"
                f"Остаток: <code>{user.balance:.0f}₽</code>\n\n"
                f"💡 <i>Используй бонусы, чтобы они не сгорали!</i>\n"
                f"Следующее сгорание через 30 дней.",
            )
        except Exception as e:
            logger.warning(f"Failed to send Telegram expiry notification: {e}")

        return float(expire_amount)

    @staticmethod
    async def send_expiry_warning(
        bot: Bot,
        user: User,
        days_left: int,
        burn_amount: int,
    ) -> bool:
        """
        Отправляет предупреждение о скором сгорании бонусов

        Args:
            bot: Бот для уведомлений
            user: Пользователь
            days_left: Дней до сгорания
            burn_amount: Сколько сгорит

        Returns:
            Успешно ли отправлено
        """
        try:
            # WebSocket уведомление
            from bot.services.realtime_notifications import send_custom_notification
            await send_custom_notification(
                telegram_id=user.telegram_id,
                title="⚠️ Бонусы скоро сгорят!",
                message=f"Через {days_left} дн. сгорит {burn_amount}₽",
                notification_type="bonus_warning",
                icon="fire",
                color="#f59e0b",
                action="view_profile",
                data={"days_left": days_left, "burn_amount": burn_amount},
            )
        except Exception as e:
            logger.warning(f"[WS] Failed to send expiry warning: {e}")

        try:
            # Telegram уведомление
            await bot.send_message(
                user.telegram_id,
                f"⚠️ <b>Бонусы скоро сгорят!</b>\n\n"
                f"Через <b>{days_left} дн.</b> сгорит <code>{burn_amount}₽</code>\n"
                f"Текущий баланс: <code>{user.balance:.0f}₽</code>\n\n"
                f"💡 <i>Используй бонусы на заказ, чтобы не потерять их!</i>",
            )
            return True
        except Exception as e:
            logger.warning(f"Failed to send Telegram expiry warning: {e}")
            return False

    @staticmethod
    async def process_bonus_expiry(
        session: AsyncSession,
        bot: Bot,
    ) -> dict:
        """
        Обрабатывает сгорание бонусов для всех пользователей.
        Вызывается по расписанию (раз в день).

        Returns:
            Статистика: warnings_sent, bonuses_expired, total_burned
        """
        from datetime import timedelta

        now = datetime.now(MSK_TZ)
        stats = {
            "warnings_sent": 0,
            "bonuses_expired": 0,
            "total_burned": 0.0,
        }

        # Получаем всех пользователей с бонусами
        query = select(User).where(User.balance > 0)
        result = await session.execute(query)
        users = result.scalars().all()

        for user in users:
            # Пропускаем пользователей без даты начисления
            if user.last_bonus_at is None:
                continue

            expiry_date = user.last_bonus_at + timedelta(days=User.BONUS_EXPIRY_DAYS)
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=MSK_TZ)

            days_left = (expiry_date - now).days
            burn_amount = int(user.balance * User.BONUS_EXPIRY_PERCENT / 100)

            # Бонусы истекли - сжигаем
            if days_left <= 0:
                burned = await BonusService.expire_bonus(session, bot, user)
                stats["bonuses_expired"] += 1
                stats["total_burned"] += burned

            # Скоро истекут - отправляем предупреждение (только если ещё не отправляли)
            elif days_left <= User.BONUS_EXPIRY_WARNING_DAYS and not user.bonus_expiry_notified:
                success = await BonusService.send_expiry_warning(bot, user, days_left, burn_amount)
                if success:
                    user.bonus_expiry_notified = True
                    await session.commit()
                    stats["warnings_sent"] += 1

        logger.info(
            f"[BonusExpiry] Processed: warnings={stats['warnings_sent']}, "
            f"expired={stats['bonuses_expired']}, burned={stats['total_burned']:.0f}₽"
        )

        return stats

"""
Smart Notification Scheduler.

Background service that sends contextual notifications:
- Payment reminders (2h, 24h, 3d after price set)
- Deadline reminders (3d, 1d, day-of)
- Post-delivery follow-up (3d after completion → review request)
- Re-engagement (14d after last order)

Uses Redis for dedup (each notification sent only once per order).
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import pytz
from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from bot.services.order_pause import auto_resume_if_needed
from bot.utils.formatting import format_price
from core.config import settings
from core.redis_pool import get_redis
from database.models.orders import (
    LEGACY_WAITING_PAYMENT_STATUSES,
    Order,
    OrderStatus,
    get_status_meta,
)
from database.models.users import User

logger = logging.getLogger(__name__)
MSK = pytz.timezone("Europe/Moscow")

# Check interval (minutes)
CHECK_INTERVAL = 300  # 5 min
ORDER_LIFECYCLE_REPLAY_BATCH = 20

# Redis key prefix for dedup
NOTIF_PREFIX = "notif:sent"


class NotificationScheduler:
    """Sends smart contextual notifications on a schedule."""

    def __init__(self, bot: Bot, session_maker: async_sessionmaker):
        self.bot = bot
        self.session_maker = session_maker
        self._running = False
        self._task: Optional[asyncio.Task] = None

    # ══════════════════════════════════════════════════════════
    #  DEDUP HELPERS
    # ══════════════════════════════════════════════════════════

    async def _was_sent(self, key: str) -> bool:
        """Check if notification was already sent (Redis dedup)."""
        try:
            redis = await get_redis()
            return bool(await redis.exists(f"{NOTIF_PREFIX}:{key}"))
        except Exception:
            return False

    async def _mark_sent(self, key: str, ttl: int = 86400 * 7):
        """Mark notification as sent with TTL (default 7 days)."""
        try:
            redis = await get_redis()
            await redis.set(f"{NOTIF_PREFIX}:{key}", "1", ex=ttl)
        except Exception:
            pass

    async def _send(self, chat_id: int, text: str, keyboard=None) -> bool:
        """Send notification to user. Returns True on success."""
        try:
            await self.bot.send_message(
                chat_id=chat_id,
                text=text,
                reply_markup=keyboard,
                disable_notification=False,
            )
            return True
        except Exception as e:
            logger.warning(f"[Scheduler] Failed to send to {chat_id}: {e}")
            return False

    def _order_keyboard(self, order_id: int, text: str = "Открыть заказ") -> InlineKeyboardMarkup:
        """Standard order action keyboard."""
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text=text,
                web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/orders/{order_id}")
            )],
        ])

    # ══════════════════════════════════════════════════════════
    #  ORDER LIFECYCLE REDRIVE
    # ══════════════════════════════════════════════════════════

    async def _replay_order_lifecycle_events(self):
        """Retry pending/failed order lifecycle fanout events."""
        async with self.session_maker() as session:
            from bot.services.order_status_service import replay_pending_order_lifecycle_events

            summary = await replay_pending_order_lifecycle_events(
                session=session,
                bot=self.bot,
                limit=ORDER_LIFECYCLE_REPLAY_BATCH,
            )
            if summary.processed:
                logger.info(
                    "[Scheduler] Order lifecycle replay processed=%s dispatched=%s failed=%s skipped=%s",
                    summary.processed,
                    summary.dispatched,
                    summary.failed,
                    summary.skipped,
                )

    # ══════════════════════════════════════════════════════════
    #  PAUSED ORDER AUTO-RESUME
    # ══════════════════════════════════════════════════════════

    async def _check_paused_orders(self):
        """Resume paused orders whose freeze window has expired."""
        async with self.session_maker() as session:
            now = datetime.now(timezone.utc)
            query = select(Order).where(
                Order.status == OrderStatus.PAUSED.value,
                Order.pause_until.isnot(None),
                Order.pause_until <= now,
            )
            result = await session.execute(query)
            orders = result.scalars().all()

            resumed_orders: list[tuple[Order, str]] = []
            for order in orders:
                resumed_status = auto_resume_if_needed(order, now=now)
                if resumed_status:
                    resumed_orders.append((order, resumed_status))

            if not resumed_orders:
                return

            await session.commit()

            for order, resumed_status in resumed_orders:
                user_result = await session.execute(select(User).where(User.telegram_id == order.user_id))
                user = user_result.scalar_one_or_none()

                try:
                    from bot.services.realtime_notifications import send_order_status_notification
                    await send_order_status_notification(
                        telegram_id=order.user_id,
                        order_id=order.id,
                        new_status=order.status,
                        old_status=OrderStatus.PAUSED.value,
                        extra_data={"pause_event": "expired"},
                    )
                except Exception as e:
                    logger.warning(f"[Scheduler] Failed to send pause-resume WS for order #{order.id}: {e}")

                try:
                    from bot.handlers.order_chat import get_or_create_topic
                    from bot.services.live_cards import send_or_update_card

                    await send_or_update_card(
                        bot=self.bot,
                        order=order,
                        session=session,
                        client_username=user.username if user else None,
                        client_name=user.fullname if user else None,
                        extra_text="▶️ Пауза завершилась автоматически",
                    )
                    conv, topic_id = await get_or_create_topic(self.bot, session, order.user_id, order.id)
                    if topic_id:
                        await self.bot.send_message(
                            chat_id=settings.ADMIN_GROUP_ID,
                            message_thread_id=topic_id,
                            text=(
                                "<b>Пауза завершилась автоматически</b>\n\n"
                                f"Заказ <code>#{order.id}</code> снова активен."
                            ),
                        )
                except Exception as e:
                    logger.warning(f"[Scheduler] Failed to update paused card for order #{order.id}: {e}")

                try:
                    await self._send(
                        order.user_id,
                        f"<b>Пауза завершена</b>\n\n"
                        f"Заказ #{order.id} снова активен.\n"
                        f"Статус: <b>{get_status_meta(resumed_status).get('label', resumed_status)}</b>",
                        self._order_keyboard(order.id),
                    )
                except Exception as e:
                    logger.warning(f"[Scheduler] Failed to notify user about auto-resume for order #{order.id}: {e}")

    # ══════════════════════════════════════════════════════════
    #  PAYMENT REMINDERS
    # ══════════════════════════════════════════════════════════

    async def _check_payment_reminders(self):
        """
        Remind users who haven't paid yet.
        Triggers: 2h, 24h, 3d after price was set
        (status = waiting_payment, including legacy confirmed rows).
        """
        async with self.session_maker() as session:
            now = datetime.now(MSK)

            # Orders waiting for payment
            query = select(Order).where(
                Order.status.in_(LEGACY_WAITING_PAYMENT_STATUSES),
                Order.price > 0,
            )
            result = await session.execute(query)
            orders = result.scalars().all()

            for order in orders:
                # Determine how long since price was set
                price_set_at = order.updated_at or order.created_at
                if price_set_at.tzinfo is None:
                    price_set_at = MSK.localize(price_set_at)

                elapsed = now - price_set_at
                elapsed_hours = elapsed.total_seconds() / 3600

                # 2h reminder
                if 2 <= elapsed_hours < 24:
                    key = f"pay_2h:{order.id}"
                    if not await self._was_sent(key):
                        sent = await self._send(
                            order.user_id,
                            f"<b>Напоминание об оплате</b>\n\n"
                            f"Заказ #{order.id} · {format_price(order.price)}\n\n"
                            f"<i>Оплатите, чтобы мы начали работу.</i>",
                            self._order_keyboard(order.id, "Перейти к оплате"),
                        )
                        if sent:
                            await self._mark_sent(key)

                # 24h reminder
                elif 24 <= elapsed_hours < 72:
                    key = f"pay_24h:{order.id}"
                    if not await self._was_sent(key):
                        sent = await self._send(
                            order.user_id,
                            f"<b>Оплата ожидается</b>\n\n"
                            f"Заказ #{order.id} ожидает оплаты уже сутки.\n\n"
                            f"<i>Нужна помощь с оплатой? Напишите в поддержку.</i>",
                            self._order_keyboard(order.id, "Перейти к оплате"),
                        )
                        if sent:
                            await self._mark_sent(key)

                # 3d reminder (last)
                elif elapsed_hours >= 72:
                    key = f"pay_3d:{order.id}"
                    if not await self._was_sent(key):
                        sent = await self._send(
                            order.user_id,
                            f"<b>Последнее напоминание</b>\n\n"
                            f"Заказ #{order.id} будет отменён, если оплата "
                            f"не поступит в ближайшее время.",
                            self._order_keyboard(order.id, "Перейти к оплате"),
                        )
                        if sent:
                            await self._mark_sent(key)

    # ══════════════════════════════════════════════════════════
    #  DEADLINE REMINDERS
    # ══════════════════════════════════════════════════════════

    async def _check_deadline_reminders(self):
        """
        Remind users about approaching deadlines.
        Triggers: 3d, 1d, day-of for active orders.
        """
        async with self.session_maker() as session:
            now = datetime.now(MSK)
            today = now.date()

            # Active orders with deadline set
            active_statuses = [
                OrderStatus.IN_PROGRESS.value,
                OrderStatus.PAID.value,
                OrderStatus.PAID_FULL.value,
            ]
            query = select(Order).where(
                Order.status.in_(active_statuses),
                Order.deadline.isnot(None),
                Order.deadline != "",
            )
            result = await session.execute(query)
            orders = result.scalars().all()

            for order in orders:
                # Parse deadline (stored as text like "15.03.2026")
                deadline_date = self._parse_deadline(order.deadline)
                if not deadline_date:
                    continue

                days_until = (deadline_date - today).days

                # Day-of reminder
                if days_until == 0:
                    key = f"ddl_today:{order.id}"
                    if not await self._was_sent(key):
                        sent = await self._send(
                            order.user_id,
                            f"<b>Дедлайн сегодня</b>\n\n"
                            f"Заказ #{order.id} — сдача сегодня.\n"
                            f"Работа в процессе, держим на контроле.",
                            self._order_keyboard(order.id),
                        )
                        if sent:
                            await self._mark_sent(key)

                # 1 day reminder
                elif days_until == 1:
                    key = f"ddl_1d:{order.id}"
                    if not await self._was_sent(key):
                        sent = await self._send(
                            order.user_id,
                            f"<b>Дедлайн завтра</b>\n\n"
                            f"Заказ #{order.id} — сдача завтра.\n"
                            f"Всё по плану.",
                            self._order_keyboard(order.id),
                        )
                        if sent:
                            await self._mark_sent(key)

                # 3 days reminder
                elif days_until == 3:
                    key = f"ddl_3d:{order.id}"
                    if not await self._was_sent(key):
                        sent = await self._send(
                            order.user_id,
                            f"<b>До дедлайна 3 дня</b>\n\n"
                            f"Заказ #{order.id} — сдача через 3 дня.\n"
                            f"Работа идёт по графику.",
                            self._order_keyboard(order.id),
                        )
                        if sent:
                            await self._mark_sent(key)

    @staticmethod
    def _parse_deadline(deadline_str: str):
        """Try to parse deadline string into a date."""
        if not deadline_str:
            return None
        for fmt in ("%d.%m.%Y", "%d.%m.%y", "%Y-%m-%d"):
            try:
                return datetime.strptime(deadline_str.strip(), fmt).date()
            except ValueError:
                continue
        return None

    # ══════════════════════════════════════════════════════════
    #  POST-DELIVERY FOLLOW-UP
    # ══════════════════════════════════════════════════════════

    async def _check_followup(self):
        """
        Ask for feedback 3 days after order completion.
        """
        async with self.session_maker() as session:
            now = datetime.now(MSK)
            three_days_ago = now - timedelta(days=3)
            four_days_ago = now - timedelta(days=4)

            # Completed 3-4 days ago
            query = select(Order).where(
                Order.status == OrderStatus.COMPLETED.value,
                Order.updated_at >= four_days_ago,
                Order.updated_at <= three_days_ago,
            )
            result = await session.execute(query)
            orders = result.scalars().all()

            for order in orders:
                key = f"followup:{order.id}"
                if not await self._was_sent(key):
                    keyboard = InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(
                            text="Оставить отзыв",
                            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
                        )],
                        [InlineKeyboardButton(
                            text="Новый заказ",
                            web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/create-order")
                        )],
                    ])

                    sent = await self._send(
                        order.user_id,
                        f"<b>Как всё прошло?</b>\n\n"
                        f"Заказ #{order.id} завершён 3 дня назад.\n"
                        f"Будем рады вашему отзыву — он помогает нам становиться лучше.",
                        keyboard,
                    )
                    if sent:
                        await self._mark_sent(key, ttl=86400 * 30)

    # ══════════════════════════════════════════════════════════
    #  RE-ENGAGEMENT
    # ══════════════════════════════════════════════════════════

    async def _check_reengagement(self):
        """
        Nudge users who haven't ordered in 14+ days.
        """
        from database.models.users import User

        async with self.session_maker() as session:
            now = datetime.now(MSK)
            two_weeks_ago = now - timedelta(days=14)
            three_weeks_ago = now - timedelta(days=21)

            # Users whose last order was 14-21 days ago
            from sqlalchemy import func
            subquery = (
                select(
                    Order.user_id,
                    func.max(Order.created_at).label("last_order")
                )
                .group_by(Order.user_id)
                .subquery()
            )

            query = (
                select(User)
                .join(subquery, User.id == subquery.c.user_id)
                .where(
                    subquery.c.last_order >= three_weeks_ago,
                    subquery.c.last_order <= two_weeks_ago,
                    User.is_banned.is_(False),
                )
                .limit(20)  # Process in batches
            )
            result = await session.execute(query)
            users = result.scalars().all()

            for user in users:
                key = f"reengage:{user.id}:{now.strftime('%Y%W')}"
                if not await self._was_sent(key):
                    keyboard = InlineKeyboardMarkup(inline_keyboard=[
                        [InlineKeyboardButton(
                            text="Создать заказ",
                            web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/create-order")
                        )],
                    ])

                    sent = await self._send(
                        user.telegram_id,
                        "<b>Давно не виделись</b>\n\n"
                        "Новая сессия или задание? Мы на связи и готовы помочь.",
                        keyboard,
                    )
                    if sent:
                        await self._mark_sent(key, ttl=86400 * 14)

    # ══════════════════════════════════════════════════════════
    #  MAIN LOOP
    # ══════════════════════════════════════════════════════════

    async def _run_checks(self):
        """Run all notification checks."""
        try:
            await self._replay_order_lifecycle_events()
        except Exception as e:
            logger.error(f"[Scheduler] Order lifecycle replay error: {e}")

        try:
            await self._check_paused_orders()
        except Exception as e:
            logger.error(f"[Scheduler] Paused order check error: {e}")

        try:
            await self._check_payment_reminders()
        except Exception as e:
            logger.error(f"[Scheduler] Payment reminders error: {e}")

        try:
            await self._check_deadline_reminders()
        except Exception as e:
            logger.error(f"[Scheduler] Deadline reminders error: {e}")

        try:
            await self._check_followup()
        except Exception as e:
            logger.error(f"[Scheduler] Follow-up error: {e}")

        try:
            await self._check_reengagement()
        except Exception as e:
            logger.error(f"[Scheduler] Re-engagement error: {e}")

    async def _loop(self):
        """Background loop."""
        while self._running:
            try:
                await self._run_checks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[Scheduler] Loop error: {e}")

            try:
                await asyncio.sleep(CHECK_INTERVAL)
            except asyncio.CancelledError:
                break

    def start(self):
        """Start the scheduler."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("[Scheduler] Notification scheduler started")

    def stop(self):
        """Stop the scheduler."""
        self._running = False
        if self._task:
            self._task.cancel()


# Global instance
_scheduler: Optional[NotificationScheduler] = None


def init_notification_scheduler(bot: Bot, session_maker: async_sessionmaker) -> NotificationScheduler:
    """Initialize and start the notification scheduler."""
    global _scheduler
    _scheduler = NotificationScheduler(bot, session_maker)
    _scheduler.start()
    return _scheduler


def get_notification_scheduler() -> Optional[NotificationScheduler]:
    """Get the global scheduler instance."""
    return _scheduler

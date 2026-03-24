"""
Engagement Push Notifications.

Personalized push notifications via Telegram Bot API that deep-link
back into the Mini App. Designed for retention and re-engagement.

Notification types:
- Daily bonus reminder (if unclaimed)
- Streak at risk (evening reminder to preserve streak)
- Milestone celebration (new rank, streak milestone)
- Social proof ("12 человек сделали заказ сегодня")
- Personalized insight ("Вы сэкономили X₽ за этот месяц")

Rules:
- Max 2 push notifications per user per day
- Respect peak activity hours (10:00-21:00 MSK)
- Redis dedup to prevent duplicates
- Batch processing (max 30 users per cycle)
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import Optional

import pytz
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import async_sessionmaker

from core.config import settings
from core.redis_pool import get_redis
from database.models.users import User

logger = logging.getLogger(__name__)
MSK = pytz.timezone("Europe/Moscow")

# Check every 30 min
CHECK_INTERVAL = 1800

# Max notifications per user per day
MAX_DAILY_PUSH = 2

# Redis prefixes
PUSH_PREFIX = "push:sent"
PUSH_COUNT_PREFIX = "push:count"


class EngagementPushService:
    """Sends personalized engagement notifications."""

    def __init__(self, bot: Bot, session_maker: async_sessionmaker):
        self.bot = bot
        self.session_maker = session_maker
        self._running = False
        self._task: Optional[asyncio.Task] = None

    # ══════════════════════════════════════════════════════════
    #  HELPERS
    # ══════════════════════════════════════════════════════════

    async def _get_daily_count(self, user_id: int) -> int:
        """Get number of push notifications sent to user today."""
        try:
            redis = await get_redis()
            today = datetime.now(MSK).strftime("%Y%m%d")
            key = f"{PUSH_COUNT_PREFIX}:{user_id}:{today}"
            count = await redis.get(key)
            return int(count) if count else 0
        except Exception:
            return 0

    async def _increment_count(self, user_id: int):
        """Increment daily push count."""
        try:
            redis = await get_redis()
            today = datetime.now(MSK).strftime("%Y%m%d")
            key = f"{PUSH_COUNT_PREFIX}:{user_id}:{today}"
            await redis.incr(key)
            await redis.expire(key, 86400)
        except Exception:
            pass

    async def _was_sent(self, key: str) -> bool:
        try:
            redis = await get_redis()
            return bool(await redis.exists(f"{PUSH_PREFIX}:{key}"))
        except Exception:
            return False

    async def _mark_sent(self, key: str, ttl: int = 86400):
        try:
            redis = await get_redis()
            await redis.set(f"{PUSH_PREFIX}:{key}", "1", ex=ttl)
        except Exception:
            pass

    async def _can_push(self, user_id: int) -> bool:
        """Check if we can send another push to this user today."""
        count = await self._get_daily_count(user_id)
        return count < MAX_DAILY_PUSH

    def _is_active_hours(self) -> bool:
        """Only send during 10:00-21:00 MSK."""
        hour = datetime.now(MSK).hour
        return 10 <= hour <= 21

    async def _send(self, chat_id: int, text: str, keyboard=None) -> bool:
        try:
            await self.bot.send_message(
                chat_id=chat_id,
                text=text,
                parse_mode="HTML",
                reply_markup=keyboard,
                disable_notification=False,
            )
            return True
        except Exception as e:
            logger.warning(f"[EngagementPush] Failed to send to {chat_id}: {e}")
            return False

    def _webapp_button(self, text: str, path: str = "/") -> InlineKeyboardMarkup:
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text=text,
                web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}{path}")
            )],
        ])

    # ══════════════════════════════════════════════════════════
    #  DAILY BONUS REMINDER
    # ══════════════════════════════════════════════════════════

    async def _check_daily_bonus_reminders(self):
        """
        Remind users with active streaks who haven't claimed today.
        Sent in the evening (18:00-21:00 MSK) so they don't lose their streak.
        """
        hour = datetime.now(MSK).hour
        if hour < 18 or hour > 21:
            return

        async with self.session_maker() as session:
            now = datetime.now(MSK)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            # Users with active streaks who haven't claimed today
            query = (
                select(User)
                .where(
                    User.daily_bonus_streak > 0,
                    User.is_banned.is_(False),
                    # Last bonus was before today
                    (User.last_daily_bonus_at < today_start) | (User.last_daily_bonus_at.is_(None)),
                )
                .limit(30)
            )
            result = await session.execute(query)
            users = result.scalars().all()

            for user in users:
                key = f"daily_remind:{user.id}:{now.strftime('%Y%m%d')}"
                if await self._was_sent(key) or not await self._can_push(user.id):
                    continue

                streak = user.daily_bonus_streak or 0
                messages = [
                    f"🔥 <b>Серия {streak} дн.</b> — не забудьте забрать бонус!\n\nЗайдите и сохраните вашу серию.",
                    f"⏰ <b>Серия под угрозой!</b>\n\nВаша серия в {streak} дней сгорит, если не забрать бонус сегодня.",
                    f"🎁 <b>Ежедневный бонус ждёт</b>\n\nДень {streak + 1} серии — не пропустите!",
                ]

                sent = await self._send(
                    user.telegram_id,
                    random.choice(messages),
                    self._webapp_button("Забрать бонус", "/"),
                )
                if sent:
                    await self._mark_sent(key)
                    await self._increment_count(user.id)

    # ══════════════════════════════════════════════════════════
    #  MORNING STREAK PUSH — "День X! Зайди забрать бонус"
    # ══════════════════════════════════════════════════════════

    async def _check_morning_streak_push(self):
        """
        Morning push for users with active streaks.
        Sent between 9:00-11:00 MSK to drive early engagement.
        Deep links directly to mini-app home page.
        """
        hour = datetime.now(MSK).hour
        if hour < 9 or hour > 11:
            return

        async with self.session_maker() as session:
            now = datetime.now(MSK)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            # Users with active streaks >= 3 days who haven't claimed today
            query = (
                select(User)
                .where(
                    User.daily_bonus_streak >= 3,
                    User.is_banned.is_(False),
                    (User.last_daily_bonus_at < today_start) | (User.last_daily_bonus_at.is_(None)),
                )
                .limit(30)
            )
            result = await session.execute(query)
            users = result.scalars().all()

            for user in users:
                key = f"morning_streak:{user.id}:{now.strftime('%Y%m%d')}"
                if await self._was_sent(key) or not await self._can_push(user.id):
                    continue

                streak = user.daily_bonus_streak or 0
                day_number = streak + 1

                # Escalating rewards hint
                bonus_hints = {3: 20, 5: 30, 7: 50, 14: 100, 30: 200}
                bonus_hint = bonus_hints.get(day_number, "")
                bonus_text = f" — забери +{bonus_hint}₽" if bonus_hint else ""

                # Vary messages based on streak length
                if streak >= 30:
                    emoji = "💎"
                    title = f"День {day_number}! Легенда!"
                elif streak >= 14:
                    emoji = "🔥"
                    title = f"День {day_number}! Серия горит!"
                elif streak >= 7:
                    emoji = "⚡"
                    title = f"День {day_number}! Неделя подряд!"
                else:
                    emoji = "☀️"
                    title = f"Доброе утро! День {day_number}"

                name = (user.fullname or "").split()[0] or ""
                greeting = f", {name}" if name else ""

                text = (
                    f"{emoji} <b>{title}{greeting}</b>\n\n"
                    f"Ваша серия: <b>{streak} дн.</b>{bonus_text}\n"
                    f"Зайдите, чтобы не потерять прогресс!"
                )

                sent = await self._send(
                    user.telegram_id,
                    text,
                    self._webapp_button("Забрать бонус 🎁", "/"),
                )
                if sent:
                    await self._mark_sent(key)
                    await self._increment_count(user.id)

    # ══════════════════════════════════════════════════════════
    #  SOCIAL PROOF NUDGE
    # ══════════════════════════════════════════════════════════

    async def _check_social_proof(self):
        """
        Send social proof stats to idle users.
        "23 человека сделали заказ сегодня"
        """
        hour = datetime.now(MSK).hour
        if hour < 14 or hour > 18:
            return

        from database.models.orders import Order

        async with self.session_maker() as session:
            now = datetime.now(MSK)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            # Count today's orders
            count_query = select(func.count(Order.id)).where(
                Order.created_at >= today_start
            )
            result = await session.execute(count_query)
            today_orders = result.scalar() or 0

            if today_orders < 3:
                return  # Not enough for social proof

            # Find idle users (last order 3-14 days ago)
            three_days_ago = now - timedelta(days=3)
            two_weeks_ago = now - timedelta(days=14)

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
                    subquery.c.last_order >= two_weeks_ago,
                    subquery.c.last_order <= three_days_ago,
                    User.is_banned.is_(False),
                )
                .limit(15)
            )
            result = await session.execute(query)
            users = result.scalars().all()

            for user in users:
                key = f"social:{user.id}:{now.strftime('%Y%W')}"  # Once per week
                if await self._was_sent(key) or not await self._can_push(user.id):
                    continue

                name = (user.fullname or "").split()[0] or "друг"
                messages = [
                    f"📊 <b>{today_orders} человек</b> уже сделали заказ сегодня.\n\n{name}, может и вам пора?",
                    f"🔥 <b>Активный день!</b>\n\n{today_orders} заказов сегодня. Присоединяйтесь!",
                ]

                sent = await self._send(
                    user.telegram_id,
                    random.choice(messages),
                    self._webapp_button("Создать заказ", "/create-order"),
                )
                if sent:
                    await self._mark_sent(key, ttl=86400 * 7)
                    await self._increment_count(user.id)

    # ══════════════════════════════════════════════════════════
    #  SAVINGS INSIGHT
    # ══════════════════════════════════════════════════════════

    async def _check_savings_insights(self):
        """
        Monthly personalized insight: "Вы сэкономили X₽ за этот месяц".
        Sent on the 1st-3rd of each month.
        """
        now = datetime.now(MSK)
        if now.day > 3:
            return

        from database.models.transactions import Transaction

        async with self.session_maker() as session:
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

            # Users with cashback transactions last month
            query = (
                select(
                    Transaction.user_id,
                    func.sum(Transaction.amount).label("total_saved"),
                )
                .where(
                    Transaction.type == "credit",
                    Transaction.reason.contains("cashback"),
                    Transaction.created_at >= prev_month_start,
                    Transaction.created_at < month_start,
                )
                .group_by(Transaction.user_id)
                .having(func.sum(Transaction.amount) > 50)  # Min 50₽ to be noteworthy
                .limit(30)
            )
            result = await session.execute(query)
            rows = result.all()

            for row in rows:
                user_id = row.user_id
                total = int(row.total_saved)

                key = f"insight:{user_id}:{now.strftime('%Y%m')}"
                if await self._was_sent(key):
                    continue

                user_q = select(User).where(User.id == user_id, User.is_banned.is_(False))
                user_result = await session.execute(user_q)
                user = user_result.scalar_one_or_none()
                if not user or not await self._can_push(user.id):
                    continue

                name = (user.fullname or "").split()[0] or "друг"
                sent = await self._send(
                    user.telegram_id,
                    f"📈 <b>{name}, ваш итог за месяц</b>\n\n"
                    f"Вы сэкономили <b>{total:,} ₽</b> благодаря кешбэку и бонусам.\n"
                    f"Продолжайте — каждый заказ приносит ещё больше!",
                    self._webapp_button("Открыть салон", "/"),
                )
                if sent:
                    await self._mark_sent(key, ttl=86400 * 35)
                    await self._increment_count(user.id)

    # ══════════════════════════════════════════════════════════
    #  MILESTONE CELEBRATION
    # ══════════════════════════════════════════════════════════

    async def _check_milestones(self):
        """
        Celebrate when users hit milestones:
        - 5th, 10th, 25th, 50th order
        - New rank achieved
        - 7-day, 14-day, 30-day streak
        """
        from database.models.orders import Order

        milestone_orders = [5, 10, 25, 50, 100]
        milestone_streaks = [7, 14, 30, 60]

        async with self.session_maker() as session:
            now = datetime.now(MSK)

            # Check order milestones
            for milestone in milestone_orders:
                query = (
                    select(User)
                    .where(
                        User.orders_count == milestone,
                        User.is_banned.is_(False),
                    )
                    .limit(10)
                )
                result = await session.execute(query)
                users = result.scalars().all()

                for user in users:
                    key = f"milestone:orders:{user.id}:{milestone}"
                    if await self._was_sent(key) or not await self._can_push(user.id):
                        continue

                    name = (user.fullname or "").split()[0] or "друг"
                    sent = await self._send(
                        user.telegram_id,
                        f"🎉 <b>Поздравляем, {name}!</b>\n\n"
                        f"Вы сделали уже <b>{milestone} заказов</b> в Академическом Салоне!\n"
                        f"Это впечатляет. Спасибо, что с нами!",
                        self._webapp_button("Открыть салон", "/"),
                    )
                    if sent:
                        await self._mark_sent(key, ttl=86400 * 365)
                        await self._increment_count(user.id)

            # Check streak milestones
            for milestone in milestone_streaks:
                query = (
                    select(User)
                    .where(
                        User.daily_bonus_streak == milestone,
                        User.is_banned.is_(False),
                    )
                    .limit(10)
                )
                result = await session.execute(query)
                users = result.scalars().all()

                for user in users:
                    key = f"milestone:streak:{user.id}:{milestone}"
                    if await self._was_sent(key) or not await self._can_push(user.id):
                        continue

                    name = (user.fullname or "").split()[0] or "друг"
                    emoji = "🔥" if milestone < 30 else "💎"
                    sent = await self._send(
                        user.telegram_id,
                        f"{emoji} <b>{name}, серия {milestone} дней!</b>\n\n"
                        f"Вы заходите каждый день уже {milestone} дней подряд.\n"
                        f"Это уровень настоящего амбассадора!",
                        self._webapp_button("Продолжить серию", "/"),
                    )
                    if sent:
                        await self._mark_sent(key, ttl=86400 * 365)
                        await self._increment_count(user.id)

    # ══════════════════════════════════════════════════════════
    #  MAIN LOOP
    # ══════════════════════════════════════════════════════════

    async def _run_checks(self):
        if not self._is_active_hours():
            return

        for check_name, check_fn in [
            ("morning_streak", self._check_morning_streak_push),
            ("daily_bonus", self._check_daily_bonus_reminders),
            ("social_proof", self._check_social_proof),
            ("savings", self._check_savings_insights),
            ("milestones", self._check_milestones),
        ]:
            try:
                await check_fn()
            except Exception as e:
                logger.error(f"[EngagementPush] {check_name} error: {e}")

    async def _loop(self):
        while self._running:
            try:
                await self._run_checks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[EngagementPush] Loop error: {e}")

            try:
                await asyncio.sleep(CHECK_INTERVAL)
            except asyncio.CancelledError:
                break

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("[EngagementPush] Engagement push service started")

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()


# Global instance
_engagement: Optional[EngagementPushService] = None


def init_engagement_push(bot: Bot, session_maker: async_sessionmaker) -> EngagementPushService:
    """Initialize and start the engagement push service."""
    global _engagement
    _engagement = EngagementPushService(bot, session_maker)
    _engagement.start()
    return _engagement


def get_engagement_push() -> Optional[EngagementPushService]:
    """Get the global service instance."""
    return _engagement

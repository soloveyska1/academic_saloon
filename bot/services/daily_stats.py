"""
Дневная статистика.
Отправляет отчёт в канал логов раз в день.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional
import pytz

from aiogram import Bot
from sqlalchemy import select, func, and_

from core.config import settings
from database.db import async_session_maker
from database.models.users import User
from database.models.orders import Order

MSK = pytz.timezone("Europe/Moscow")

# Время отправки дневного отчёта (МСК)
REPORT_HOUR = 23
REPORT_MINUTE = 55


class DailyStatsService:
    """Сервис дневной статистики"""

    def __init__(self, bot: Bot):
        self.bot = bot
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def _get_daily_stats(self) -> dict:
        """Получить статистику за сегодня"""
        async with async_session_maker() as session:
            now = datetime.now(MSK)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            # Новые пользователи за сегодня
            new_users_query = select(func.count(User.id)).where(
                User.created_at >= today_start
            )
            new_users_result = await session.execute(new_users_query)
            new_users = new_users_result.scalar() or 0

            # Всего пользователей
            total_users_query = select(func.count(User.id))
            total_users_result = await session.execute(total_users_query)
            total_users = total_users_result.scalar() or 0

            # Новые заказы за сегодня
            new_orders_query = select(func.count(Order.id)).where(
                Order.created_at >= today_start
            )
            new_orders_result = await session.execute(new_orders_query)
            new_orders = new_orders_result.scalar() or 0

            # Всего заказов
            total_orders_query = select(func.count(Order.id))
            total_orders_result = await session.execute(total_orders_query)
            total_orders = total_orders_result.scalar() or 0

            # Пользователи, принявшие оферту сегодня
            accepted_terms_query = select(func.count(User.id)).where(
                and_(
                    User.terms_accepted_at >= today_start,
                    User.terms_accepted_at.isnot(None)
                )
            )
            accepted_terms_result = await session.execute(accepted_terms_query)
            accepted_terms = accepted_terms_result.scalar() or 0

            # Пользователи на слежке
            watched_query = select(func.count(User.id)).where(User.is_watched.is_(True))
            watched_result = await session.execute(watched_query)
            watched_users = watched_result.scalar() or 0

            # Забаненные пользователи
            banned_query = select(func.count(User.id)).where(User.is_banned.is_(True))
            banned_result = await session.execute(banned_query)
            banned_users = banned_result.scalar() or 0

            return {
                "new_users": new_users,
                "total_users": total_users,
                "new_orders": new_orders,
                "total_orders": total_orders,
                "accepted_terms": accepted_terms,
                "watched_users": watched_users,
                "banned_users": banned_users,
                "date": now.strftime("%d.%m.%Y"),
            }

    async def send_daily_report(self):
        """Отправить дневной отчёт"""
        try:
            stats = await self._get_daily_stats()

            text = f"""📊  <b>Дневная статистика</b>
<i>{stats['date']}</i>


👥  <b>Пользователи</b>
◈  Новых сегодня: {stats['new_users']}
◈  Приняли оферту: {stats['accepted_terms']}
◈  Всего: {stats['total_users']}

📝  <b>Заказы</b>
◈  Новых сегодня: {stats['new_orders']}
◈  Всего: {stats['total_orders']}

🔒  <b>Модерация</b>
◈  На слежке: {stats['watched_users']}
◈  Забанено: {stats['banned_users']}"""

            # Добавляем конверсию если есть данные
            if stats['new_users'] > 0:
                conversion = (stats['accepted_terms'] / stats['new_users']) * 100
                text += f"\n\n📈  <b>Конверсия</b>: {conversion:.1f}%"

            await self.bot.send_message(
                chat_id=settings.LOG_CHANNEL_ID,
                text=text,
                disable_notification=True,
            )

        except Exception as e:
            import logging
            logging.error(f"Failed to send daily stats: {e}")

    async def _wait_until_report_time(self):
        """Ждать до времени отправки отчёта"""
        now = datetime.now(MSK)
        target = now.replace(hour=REPORT_HOUR, minute=REPORT_MINUTE, second=0, microsecond=0)

        # Если время уже прошло сегодня — ждём до завтра
        if now >= target:
            target += timedelta(days=1)

        wait_seconds = (target - now).total_seconds()
        await asyncio.sleep(wait_seconds)

    async def _report_loop(self):
        """Цикл отправки отчётов"""
        while self._running:
            try:
                await self._wait_until_report_time()
                if self._running:  # Проверяем ещё раз после ожидания
                    await self.send_daily_report()
            except asyncio.CancelledError:
                break
            except Exception as e:
                import logging
                logging.error(f"Error in daily stats loop: {e}")
                # Ждём минуту перед следующей попыткой
                await asyncio.sleep(60)

    def start(self):
        """Запустить сервис"""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._report_loop())

    def stop(self):
        """Остановить сервис"""
        self._running = False
        if self._task:
            self._task.cancel()


# Глобальный экземпляр
_stats_service: Optional[DailyStatsService] = None


def init_daily_stats(bot: Bot) -> DailyStatsService:
    """Инициализировать сервис статистики"""
    global _stats_service
    _stats_service = DailyStatsService(bot)
    _stats_service.start()
    return _stats_service


def get_daily_stats_service() -> Optional[DailyStatsService]:
    """Получить сервис статистики"""
    return _stats_service

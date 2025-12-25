"""
Дневная статистика.
Отправляет отчёт в канал логов раз в день.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Optional
import pytz

from aiogram import Bot

logger = logging.getLogger(__name__)
from sqlalchemy import select, func, and_

from core.config import settings
from core.redis_pool import get_redis
from database.db import async_session_maker
from database.models.users import User
from database.models.orders import Order

# Ключи кэша статистики
STATS_CACHE_KEY = "bot:live_stats"
STATS_CACHE_TTL = 90  # 1.5 минуты

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
            logger.error(f"Failed to send daily stats: {e}")

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
                logger.error(f"Error in daily stats loop: {e}")
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


async def get_live_stats_line() -> str:
    """
    Получить строку с живой статистикой для приветствия.
    Показывает активность салуна: заказы за сегодня и время последнего.
    Кэшируется в Redis на 90 секунд для быстрого /start.
    """
    # Пробуем получить из кэша
    try:
        redis = await get_redis()
        cached = await redis.get(STATS_CACHE_KEY)
        if cached:
            data = json.loads(cached)
            return _format_stats_line(data["today_orders"], data.get("last_order_iso"))
    except Exception:
        pass  # Кэш недоступен — идём в БД

    # Запрос в БД
    async with async_session_maker() as session:
        now = datetime.now(MSK)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Заказы за сегодня
        today_orders_query = select(func.count(Order.id)).where(
            Order.created_at >= today_start
        )
        today_orders_result = await session.execute(today_orders_query)
        today_orders = today_orders_result.scalar() or 0

        # Последний заказ
        last_order_query = select(Order.created_at).order_by(
            Order.created_at.desc()
        ).limit(1)
        last_order_result = await session.execute(last_order_query)
        last_order_time = last_order_result.scalar()

        # Сохраняем в кэш
        last_order_iso = None
        if last_order_time:
            if last_order_time.tzinfo is None:
                last_order_time = MSK.localize(last_order_time)
            last_order_iso = last_order_time.isoformat()

        try:
            redis = await get_redis()
            cache_data = {"today_orders": today_orders, "last_order_iso": last_order_iso}
            await redis.set(STATS_CACHE_KEY, json.dumps(cache_data), ex=STATS_CACHE_TTL)
        except Exception:
            pass

        return _format_stats_line(today_orders, last_order_iso)


def _format_stats_line(today_orders: int, last_order_iso: Optional[str]) -> str:
    """Форматирует строку статистики из данных"""
    now = datetime.now(MSK)
    parts = []

    if today_orders > 0:
        # Склонение: "помогли X студентам"
        if today_orders == 1:
            parts.append(f"🔥 Сегодня помогли <b>1</b> студенту")
        elif today_orders < 5:
            parts.append(f"🔥 Сегодня помогли <b>{today_orders}</b> студентам")
        else:
            parts.append(f"🔥 Сегодня помогли <b>{today_orders}</b> студентам")

    if last_order_iso:
        try:
            last_order_time = datetime.fromisoformat(last_order_iso)
            diff = now - last_order_time
            minutes = int(diff.total_seconds() // 60)

            if minutes < 5:
                parts.append("⏱ Последний заказ: только что")
            elif minutes < 60:
                parts.append(f"⏱ Последний заказ: {minutes} мин назад")
            elif minutes < 1440:  # меньше суток
                hours = minutes // 60
                parts.append(f"⏱ Последний заказ: {hours} ч назад")
        except (ValueError, TypeError):
            pass

    return "\n".join(parts) if parts else ""


async def get_urgent_stats_line() -> str:
    """
    Статистика срочных заказов для экрана "Горит!".
    Показывает сколько срочных закрыли сегодня.
    """
    async with async_session_maker() as session:
        now = datetime.now(MSK)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Срочные заказы (photo_task) за сегодня
        urgent_query = select(func.count(Order.id)).where(
            and_(
                Order.created_at >= today_start,
                Order.work_type == "photo_task"
            )
        )
        urgent_result = await session.execute(urgent_query)
        urgent_count = urgent_result.scalar() or 0

        if urgent_count > 0:
            # Склонение
            if urgent_count == 1:
                return f"⚡ Сегодня закрыли <b>1</b> срочный"
            elif urgent_count < 5:
                return f"⚡ Сегодня закрыли <b>{urgent_count}</b> срочных"
            else:
                return f"⚡ Сегодня закрыли <b>{urgent_count}</b> срочных"

        return ""

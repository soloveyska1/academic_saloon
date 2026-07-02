"""
Детектор брошенных заказов.
Отслеживает пользователей, которые начали заказ, но не завершили.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
import pytz

from aiogram import Bot
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from core.config import settings
from bot.services.logger import BotLogger, LogEvent, LogLevel

logger = logging.getLogger(__name__)

MSK = pytz.timezone("Europe/Moscow")

# Время в минутах, после которого заказ считается брошенным
ABANDON_THRESHOLD_MINUTES = 30


class AbandonedOrderTracker:
    """
    Отслеживает брошенные заказы.
    Хранит информацию о начатых заказах в Redis.
    """

    def __init__(self, bot: Bot, storage: RedisStorage):
        self.bot = bot
        self.storage = storage
        self.logger = BotLogger(bot)
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start_tracking(self, user_id: int, username: str, fullname: str, step: str):
        """Начать отслеживание заказа"""
        key = f"order_tracking:{user_id}"

        data = {
            "user_id": user_id,
            "username": username or "",
            "fullname": fullname or "",
            "started_at": datetime.now(MSK).isoformat(),
            "last_step": step,
            "notified": "false",
        }

        # Сохраняем в Redis с TTL 24 часа
        redis = self.storage.redis
        await redis.hset(key, mapping=data)
        await redis.expire(key, 86400)  # 24 часа

    async def update_step(self, user_id: int, step: str):
        """Обновить текущий шаг заказа"""
        key = f"order_tracking:{user_id}"
        redis = self.storage.redis

        if await redis.exists(key):
            await redis.hset(key, "last_step", step)
            await redis.hset(key, "last_activity", datetime.now(MSK).isoformat())

    async def complete_order(self, user_id: int):
        """Заказ завершён — удаляем из отслеживания"""
        key = f"order_tracking:{user_id}"
        redis = self.storage.redis
        await redis.delete(key)

    async def cancel_order(self, user_id: int):
        """Заказ отменён — удаляем из отслеживания"""
        key = f"order_tracking:{user_id}"
        redis = self.storage.redis
        await redis.delete(key)

    async def check_abandoned(self):
        """Проверить все заказы на брошенность"""
        redis = self.storage.redis

        # Ищем все ключи отслеживания
        keys = []
        async for key in redis.scan_iter("order_tracking:*"):
            keys.append(key)

        threshold = datetime.now(MSK) - timedelta(minutes=ABANDON_THRESHOLD_MINUTES)

        for key in keys:
            try:
                data = await redis.hgetall(key)
                if not data:
                    continue

                # Декодируем bytes в строки
                data = {k.decode() if isinstance(k, bytes) else k:
                        v.decode() if isinstance(v, bytes) else v
                        for k, v in data.items()}

                # Проверяем, уведомляли ли уже
                if data.get("notified") == "true":
                    continue

                # Проверяем время последней активности
                last_activity = data.get("last_activity") or data.get("started_at")
                if not last_activity:
                    continue

                activity_time = datetime.fromisoformat(last_activity)
                if activity_time.tzinfo is None:
                    activity_time = MSK.localize(activity_time)

                if activity_time < threshold:
                    # Заказ брошен — отправляем уведомление
                    await self._notify_abandoned(data)

                    # Помечаем как уведомлённый
                    await redis.hset(key, "notified", "true")

            except Exception as e:
                logger.error(f"Error checking abandoned order: {e}")

    async def _remind_user(self, user_id: int):
        """Мягкое напоминание пользователю о незавершённой заявке."""
        text = (
            "<b>Вы начали оформлять заказ — и остановились</b>\n\n"
            "Ничего страшного, так бывает. Заявка ни к чему не обязывает: "
            "сначала расчёт и смета, платить нужно только после согласования.\n\n"
            "<i>Если что-то было непонятно — просто напишите, поможем.</i>"
        )
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="📝 Начать заново — это 2 минуты",
                callback_data="create_order",
            )],
            [InlineKeyboardButton(
                text="💬 Задать вопрос",
                callback_data="guide_support",
            )],
        ])

        try:
            await self.bot.send_message(
                chat_id=user_id,
                text=text,
                reply_markup=keyboard,
            )
        except Exception as e:
            logger.warning(f"Failed to send abandoned reminder to user {user_id}: {e}")

    async def _notify_abandoned(self, data: dict):
        """Отправить уведомление о брошенном заказе"""
        user_id = int(data.get("user_id", 0))

        # Сначала — мягкое напоминание самому пользователю
        if user_id:
            await self._remind_user(user_id)
        username = data.get("username", "")
        fullname = data.get("fullname", "Неизвестно")
        last_step = data.get("last_step", "неизвестно")
        started_at = data.get("started_at", "")

        # Форматируем время
        try:
            start_time = datetime.fromisoformat(started_at)
            time_str = start_time.strftime("%H:%M")
        except Exception:
            time_str = "?"

        # Формируем ссылку на пользователя
        user_link = f'<a href="tg://user?id={user_id}">{fullname}</a>'
        user_mention = f"@{username}" if username else f'<a href="tg://user?id={user_id}">написать</a>'

        text = f"""🚪  <b>Брошенный заказ</b>

👤  {user_link}
🔗  {user_mention} · <code>{user_id}</code>

▸  Начал заказ в {time_str}
▸  Остановился на: {last_step}
▸  Не активен более {ABANDON_THRESHOLD_MINUTES} мин.

<i>Можно догнать и помочь с оформлением</i>"""

        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="💬 Написать",
                    url=f"tg://user?id={user_id}"
                ),
                InlineKeyboardButton(
                    text="📋 Инфо",
                    callback_data=f"log_info:{user_id}"
                ),
            ],
        ])

        try:
            await self.bot.send_message(
                chat_id=settings.LOG_CHANNEL_ID,
                text=text,
                reply_markup=keyboard,
                disable_notification=False,  # Со звуком!
            )
        except Exception as e:
            logger.error(f"Failed to send abandoned order notification: {e}")

    async def _check_loop(self):
        """Цикл проверки брошенных заказов"""
        while self._running:
            try:
                await self.check_abandoned()
            except asyncio.CancelledError:
                # Task was cancelled, exit gracefully
                break
            except Exception as e:
                logger.error(f"Error in abandoned check loop: {e}")

            try:
                # Проверяем каждые 5 минут
                await asyncio.sleep(300)
            except asyncio.CancelledError:
                break

    def start(self):
        """Запустить фоновую проверку"""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._check_loop())

    def stop(self):
        """Остановить фоновую проверку"""
        self._running = False
        if self._task:
            self._task.cancel()


# Глобальный экземпляр
_tracker: Optional[AbandonedOrderTracker] = None


def init_abandoned_tracker(bot: Bot, storage: RedisStorage) -> AbandonedOrderTracker:
    """Инициализировать трекер брошенных заказов"""
    global _tracker
    _tracker = AbandonedOrderTracker(bot, storage)
    _tracker.start()
    return _tracker


def get_abandoned_tracker() -> Optional[AbandonedOrderTracker]:
    """Получить глобальный трекер"""
    return _tracker

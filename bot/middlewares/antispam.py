"""
Антиспам middleware.
Отслеживает частоту сообщений и блокирует спамеров.
Данные хранятся в Redis для персистентности и экономии памяти.
"""

import json
from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware, Bot
from aiogram.types import TelegramObject, Update

from core.config import settings
from core.redis_pool import get_redis
from bot.services.logger import BotLogger, LogEvent, LogLevel

# Настройки антиспама
MAX_MESSAGES_PER_MINUTE = 10  # Максимум сообщений в минуту
MUTE_DURATION_SECONDS = 300   # Время мута (5 минут)


class AntiSpamMiddleware(BaseMiddleware):
    """
    Middleware для защиты от спама.
    Блокирует пользователей, которые отправляют слишком много сообщений.
    Данные хранятся в Redis для персистентности.
    """

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Получаем пользователя
        user = None
        if isinstance(event, Update) and event.message:
            user = event.message.from_user

        if not user:
            return await handler(event, data)

        # Админы не проверяются
        if user.id in settings.ADMIN_IDS:
            return await handler(event, data)

        user_id = user.id
        now = datetime.now()
        redis = await get_redis()

        # Ключи в Redis
        mute_key = f"antispam:mute:{user_id}"
        history_key = f"antispam:history:{user_id}"

        # Проверяем, замучен ли пользователь
        mute_until_str = await redis.get(mute_key)
        if mute_until_str:
            mute_until = datetime.fromisoformat(mute_until_str)
            if now < mute_until:
                # Всё ещё замучен — игнорируем сообщение
                remaining = int((mute_until - now).total_seconds())
                if isinstance(event, Update) and event.message:
                    await event.message.answer(
                        f"⏳ Слишком много сообщений!\n"
                        f"Подожди {remaining // 60} мин. {remaining % 60} сек."
                    )
                return None
            else:
                # Мут закончился — удаляем ключ
                await redis.delete(mute_key)

        # Получаем историю сообщений (список timestamp'ов)
        history_raw = await redis.get(history_key)
        if history_raw:
            history = json.loads(history_raw)
        else:
            history = []

        # Очищаем старые записи (старше минуты)
        cutoff = (now - timedelta(minutes=1)).timestamp()
        history = [ts for ts in history if ts > cutoff]

        # Добавляем текущее сообщение
        history.append(now.timestamp())

        # Сохраняем историю с TTL 2 минуты
        await redis.set(history_key, json.dumps(history), ex=120)

        # Проверяем количество сообщений
        if len(history) > MAX_MESSAGES_PER_MINUTE:
            # Спам! Мутим пользователя
            mute_until = now + timedelta(seconds=MUTE_DURATION_SECONDS)
            await redis.set(mute_key, mute_until.isoformat(), ex=MUTE_DURATION_SECONDS + 60)
            await redis.delete(history_key)  # Очищаем историю

            # Логируем в канал
            bot: Bot = data.get("bot")
            if bot:
                logger = BotLogger(bot)
                await logger.log(
                    event=LogEvent.SPAM_DETECTED,
                    user=user,
                    details=f"Заблокирован на {MUTE_DURATION_SECONDS // 60} мин. за спам",
                    level=LogLevel.WARNING,
                    silent=False,
                )

            if isinstance(event, Update) and event.message:
                await event.message.answer(
                    f"🤖 Обнаружен спам!\n"
                    f"Ты заблокирован на {MUTE_DURATION_SECONDS // 60} минут."
                )
            return None

        return await handler(event, data)

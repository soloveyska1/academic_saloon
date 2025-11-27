"""
Антиспам middleware.
Отслеживает частоту сообщений и блокирует спамеров.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable, Dict
from collections import defaultdict

from aiogram import BaseMiddleware, Bot
from aiogram.types import TelegramObject, Update, Message

from core.config import settings
from bot.services.logger import BotLogger, LogEvent, LogLevel

# Настройки антиспама
MAX_MESSAGES_PER_MINUTE = 10  # Максимум сообщений в минуту
MUTE_DURATION_SECONDS = 300   # Время мута (5 минут)

# Хранилище для отслеживания сообщений (user_id -> list of timestamps)
_message_history: Dict[int, list] = defaultdict(list)
_muted_users: Dict[int, datetime] = {}


class AntiSpamMiddleware(BaseMiddleware):
    """
    Middleware для защиты от спама.
    Блокирует пользователей, которые отправляют слишком много сообщений.
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

        # Проверяем, замучен ли пользователь
        if user_id in _muted_users:
            mute_until = _muted_users[user_id]
            if now < mute_until:
                # Всё ещё замучен — игнорируем сообщение
                remaining = (mute_until - now).seconds
                if isinstance(event, Update) and event.message:
                    await event.message.answer(
                        f"⏳ Слишком много сообщений!\n"
                        f"Подожди {remaining // 60} мин. {remaining % 60} сек."
                    )
                return None
            else:
                # Мут закончился
                del _muted_users[user_id]

        # Очищаем старые записи (старше минуты)
        cutoff = now - timedelta(minutes=1)
        _message_history[user_id] = [
            ts for ts in _message_history[user_id]
            if ts > cutoff
        ]

        # Добавляем текущее сообщение
        _message_history[user_id].append(now)

        # Проверяем количество сообщений
        if len(_message_history[user_id]) > MAX_MESSAGES_PER_MINUTE:
            # Спам! Мутим пользователя
            _muted_users[user_id] = now + timedelta(seconds=MUTE_DURATION_SECONDS)
            _message_history[user_id] = []  # Очищаем историю

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

"""
Middleware для проверки бана пользователя.
Заблокированные пользователи получают заглушку.
Кэширует статус бана в Redis на 15 секунд.
"""

from typing import Any, Awaitable, Callable, Dict, Optional

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update, Message, CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis

from database.models.users import User
from core.config import settings

# Кэш банов в Redis
BAN_CACHE_TTL = 15  # секунд (короткий TTL для security)
BAN_CACHE_PREFIX = "ban:"


# Текст для забаненных пользователей
BAN_MESSAGE = f"""🚫  <b>Доступ ограничен</b>

К сожалению, твой аккаунт заблокирован.

Если считаешь, что это ошибка — напиши:
@{settings.SUPPORT_USERNAME}"""


class BanCheckMiddleware(BaseMiddleware):
    """
    Middleware для проверки, забанен ли пользователь.
    Забаненные не могут использовать бота.
    Кэширует статус бана в Redis для быстрой проверки.
    """

    def __init__(self):
        super().__init__()
        self._redis: Optional[Redis] = None

    async def _get_redis(self) -> Redis:
        """Ленивая инициализация Redis"""
        if self._redis is None:
            redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB_CACHE}"
            self._redis = Redis.from_url(redis_url, decode_responses=True)
        return self._redis

    async def _check_ban_cached(self, user_id: int, session: AsyncSession) -> bool:
        """Проверяет бан с кэшированием в Redis"""
        cache_key = f"{BAN_CACHE_PREFIX}{user_id}"

        # Пробуем получить из кэша
        try:
            redis = await self._get_redis()
            cached = await redis.get(cache_key)
            if cached is not None:
                return cached == "1"
        except Exception:
            pass

        # Запрос в БД
        query = select(User.is_banned).where(User.telegram_id == user_id)
        result = await session.execute(query)
        is_banned = result.scalar() or False

        # Сохраняем в кэш
        try:
            redis = await self._get_redis()
            await redis.set(cache_key, "1" if is_banned else "0", ex=BAN_CACHE_TTL)
        except Exception:
            pass

        return is_banned

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Получаем пользователя из события
        user = None
        if isinstance(event, Update):
            if event.message:
                user = event.message.from_user
            elif event.callback_query:
                user = event.callback_query.from_user

        # Если пользователь не определён — пропускаем
        if not user:
            return await handler(event, data)

        # Админы не блокируются
        if user.id in settings.ADMIN_IDS:
            return await handler(event, data)

        # Проверяем бан (с кэшированием)
        session: AsyncSession = data.get("session")
        if session:
            is_banned = await self._check_ban_cached(user.id, session)
            if is_banned:
                await self._send_ban_message(event)
                return None

        return await handler(event, data)

    async def _send_ban_message(self, event: TelegramObject) -> None:
        """Отправляет сообщение о бане"""
        if isinstance(event, Update):
            if event.message:
                await event.message.answer(BAN_MESSAGE)
            elif event.callback_query:
                await event.callback_query.answer(
                    "Твой аккаунт заблокирован",
                    show_alert=True
                )


async def invalidate_ban_cache(user_id: int) -> None:
    """
    Сбрасывает кэш бана для пользователя.
    Вызывать после бана/разбана из админки.
    """
    try:
        redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB_CACHE}"
        redis = Redis.from_url(redis_url, decode_responses=True)
        await redis.delete(f"{BAN_CACHE_PREFIX}{user_id}")
        await redis.close()
    except Exception:
        pass

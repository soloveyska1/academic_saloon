import logging
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update

from database.db import async_session_maker


logger = logging.getLogger(__name__)


class DbSessionMiddleware(BaseMiddleware):
    """
    Middleware для внедрения сессии БД в хендлеры.
    Автоматически открывает и закрывает сессию.
    """

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        try:
            async with async_session_maker() as session:
                data["session"] = session
                return await handler(event, data)
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            # Пытаемся уведомить пользователя
            if isinstance(event, Update):
                try:
                    if event.message:
                        await event.message.answer(
                            "⚠️ Технические неполадки. Попробуй через минуту."
                        )
                    elif event.callback_query:
                        await event.callback_query.answer(
                            "⚠️ Технические неполадки", show_alert=True
                        )
                except Exception:
                    pass
            return None

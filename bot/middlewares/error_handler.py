import logging
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware, Bot
from aiogram.types import TelegramObject, Update

from core.config import settings

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseMiddleware):
    """
    Middleware для перехвата и логирования ошибок.
    Отправляет уведомление админам при критических ошибках.
    """

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        try:
            return await handler(event, data)
        except Exception as e:
            await self._handle_error(event, data, e)
            # Не пробрасываем ошибку дальше, чтобы бот продолжал работать
            return None

    async def _handle_error(
        self,
        event: TelegramObject,
        data: Dict[str, Any],
        error: Exception
    ) -> None:
        """Обработка ошибки: логирование и уведомление"""

        # Получаем информацию о пользователе
        user_info = "Unknown"
        if isinstance(event, Update):
            user = None
            if event.message:
                user = event.message.from_user
            elif event.callback_query:
                user = event.callback_query.from_user

            if user:
                user_info = f"{user.full_name} (@{user.username}, ID: {user.id})"

        # Логируем ошибку
        logger.error(
            f"Error while handling update:\n"
            f"User: {user_info}\n"
            f"Error: {type(error).__name__}: {error}",
            exc_info=True
        )

        # Уведомляем админов о критических ошибках
        bot: Bot = data.get("bot")
        if bot and settings.ADMIN_IDS:
            error_text = (
                f"⚠️  <b>Ошибка в боте</b>\n\n"
                f"◈  Пользователь: {user_info}\n"
                f"◈  Ошибка: <code>{type(error).__name__}</code>\n"
                f"◈  Детали: {str(error)[:200]}"
            )

            for admin_id in settings.ADMIN_IDS:
                try:
                    await bot.send_message(chat_id=admin_id, text=error_text)
                except Exception:
                    pass

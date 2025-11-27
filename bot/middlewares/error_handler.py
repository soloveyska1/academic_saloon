import logging
import traceback
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware, Bot
from aiogram.types import TelegramObject, Update, Message, CallbackQuery

from core.config import settings
from bot.services.logger import BotLogger

logger = logging.getLogger(__name__)


# Текст заглушки для пользователя при ошибке
ERROR_USER_MESSAGE = f"""😔  <b>Упс, что-то пошло не так...</b>

Мы уже знаем о проблеме и скоро всё починим!

Попробуй ещё раз через пару минут.
Если не поможет — напиши Хозяину: @{settings.SUPPORT_USERNAME}"""


class ErrorHandlerMiddleware(BaseMiddleware):
    """
    Middleware для перехвата и логирования ошибок.
    - Отправляет красивый лог в канал
    - Показывает заглушку пользователю
    - Не раскрывает детали ошибки клиенту
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
        """Обработка ошибки: логирование в канал и заглушка юзеру"""

        bot: Bot = data.get("bot")
        user = None
        context = "Unknown"

        # Извлекаем информацию о пользователе и контексте
        if isinstance(event, Update):
            if event.message:
                user = event.message.from_user
                context = f"Message: {event.message.text[:100] if event.message.text else 'media'}"
            elif event.callback_query:
                user = event.callback_query.from_user
                context = f"Callback: {event.callback_query.data}"

        # Получаем полный traceback
        tb_str = traceback.format_exc()

        # Логируем в консоль
        user_info = f"{user.full_name} (@{user.username}, ID: {user.id})" if user else "Unknown"
        logger.error(
            f"Error while handling update:\n"
            f"User: {user_info}\n"
            f"Context: {context}\n"
            f"Error: {type(error).__name__}: {error}",
            exc_info=True
        )

        # Отправляем лог в канал
        if bot:
            try:
                bot_logger = BotLogger(bot)
                await bot_logger.log_error(
                    user=user,
                    error=error,
                    context=context,
                    traceback_str=tb_str,
                )
            except Exception as log_error:
                logger.error(f"Failed to send error to log channel: {log_error}")

        # Показываем заглушку пользователю
        await self._send_error_to_user(event, bot)

    async def _send_error_to_user(
        self,
        event: TelegramObject,
        bot: Bot
    ) -> None:
        """Отправляет заглушку пользователю"""
        if not bot:
            return

        try:
            if isinstance(event, Update):
                # Обработка Message
                if event.message:
                    await event.message.answer(ERROR_USER_MESSAGE)

                # Обработка CallbackQuery
                elif event.callback_query:
                    # Сначала отвечаем на callback чтобы убрать "часики"
                    try:
                        await event.callback_query.answer(
                            "Произошла ошибка, попробуй ещё раз",
                            show_alert=True
                        )
                    except Exception:
                        pass

                    # Отправляем сообщение
                    try:
                        await event.callback_query.message.answer(ERROR_USER_MESSAGE)
                    except Exception:
                        pass

        except Exception as e:
            logger.error(f"Failed to send error message to user: {e}")

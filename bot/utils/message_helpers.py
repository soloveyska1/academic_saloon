"""
Утилиты для безопасной работы с сообщениями Telegram.

Решает проблему:
TelegramBadRequest: there is no text in the message to edit

Когда сообщение содержит фото (только caption), нельзя вызвать edit_text().
"""

import logging
from typing import Optional

from aiogram import Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup
from aiogram.exceptions import TelegramBadRequest

logger = logging.getLogger(__name__)


async def safe_edit_or_send(
    callback_or_message: CallbackQuery | Message,
    text: str,
    reply_markup: InlineKeyboardMarkup | None = None,
    bot: Bot | None = None,
    parse_mode: str = "HTML",
) -> Message | None:
    """
    Безопасное редактирование сообщения.

    Если сообщение содержит только caption (фото), то:
    1. Удаляет старое сообщение
    2. Отправляет новое текстовое сообщение

    Args:
        callback_or_message: CallbackQuery или Message
        text: Новый текст
        reply_markup: Клавиатура (опционально)
        bot: Экземпляр бота (нужен если передаём Message)
        parse_mode: Режим парсинга (по умолчанию HTML)

    Returns:
        Message или None при ошибке
    """
    if isinstance(callback_or_message, CallbackQuery):
        message = callback_or_message.message
        bot = callback_or_message.bot or bot
    else:
        message = callback_or_message

    if message is None:
        logger.warning("safe_edit_or_send: message is None")
        return None

    chat_id = message.chat.id

    # Пробуем edit_text
    try:
        return await message.edit_text(
            text=text,
            reply_markup=reply_markup,
            parse_mode=parse_mode,
        )
    except TelegramBadRequest as e:
        error_msg = str(e).lower()

        # Если сообщение — это фото (нет text для редактирования)
        if "there is no text in the message" in error_msg:
            logger.debug(f"Message has no text (probably photo), deleting and sending new")
            try:
                await message.delete()
            except Exception:
                pass

            if bot:
                return await bot.send_message(
                    chat_id=chat_id,
                    text=text,
                    reply_markup=reply_markup,
                    parse_mode=parse_mode,
                )
            return None

        # Если сообщение не изменилось
        if "message is not modified" in error_msg:
            logger.debug("Message not modified (same content)")
            return None

        # Если сообщение слишком старое для редактирования
        if "message can't be edited" in error_msg:
            logger.debug("Message can't be edited (too old), sending new")
            try:
                await message.delete()
            except Exception:
                pass

            if bot:
                return await bot.send_message(
                    chat_id=chat_id,
                    text=text,
                    reply_markup=reply_markup,
                    parse_mode=parse_mode,
                )
            return None

        # Другие ошибки — логируем и пробуем отправить новое
        logger.warning(f"TelegramBadRequest in safe_edit_or_send: {e}")
        try:
            await message.delete()
        except Exception:
            pass

        if bot:
            return await bot.send_message(
                chat_id=chat_id,
                text=text,
                reply_markup=reply_markup,
                parse_mode=parse_mode,
            )
        return None

    except Exception as e:
        logger.error(f"Unexpected error in safe_edit_or_send: {e}")
        # Fallback: пробуем просто отправить новое сообщение
        if bot:
            try:
                return await bot.send_message(
                    chat_id=chat_id,
                    text=text,
                    reply_markup=reply_markup,
                    parse_mode=parse_mode,
                )
            except Exception as send_error:
                logger.error(f"Failed to send fallback message: {send_error}")
        return None


async def safe_delete_message(message: Message | None) -> bool:
    """
    Безопасное удаление сообщения.

    Returns:
        True если удалено успешно, False если ошибка
    """
    if message is None:
        return False

    try:
        await message.delete()
        return True
    except Exception as e:
        logger.debug(f"Failed to delete message: {e}")
        return False

"""
Продающий обработчик ошибок.
Превращает ошибку в возможность продажи.
+ Retry механизм для сетевых ошибок.
"""

import asyncio
import logging
import traceback
from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable, Dict, Optional

from aiogram import BaseMiddleware, Bot
from aiogram.types import (
    TelegramObject, Update, Message, CallbackQuery,
    InlineKeyboardMarkup, InlineKeyboardButton, FSInputFile, User as TgUser
)
from aiogram.exceptions import TelegramNetworkError, TelegramRetryAfter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from bot.services.logger import BotLogger
from database.models.users import User

logger = logging.getLogger(__name__)

# Настройки retry для сетевых ошибок
MAX_RETRIES = 3
RETRY_DELAYS = [0.5, 1.0, 2.0]  # Экспоненциальная задержка

# Бонус за ошибку
ERROR_COMPENSATION_BONUS = 50


def get_error_message(user_name: str) -> str:
    """Генерирует продающее сообщение об ошибке"""
    return f"""🤠  <b>Эй, {user_name}!</b>

Салун обновляется, но твой заказ важнее.

Напиши Хозяину — он примет заявку лично
и накинет <b>скидку 10%</b> за терпение.

⏰  <b>Только следующие 30 минут.</b>

💰  Тебе начислено <b>{ERROR_COMPENSATION_BONUS}₽</b> на баланс за ожидание."""


def get_error_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура с одной продающей кнопкой"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="🔥 Забрать скидку 10% →",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            )
        ]
    ])


class ErrorHandlerMiddleware(BaseMiddleware):
    """
    Middleware для перехвата ошибок.
    Превращает ошибку в продажу:
    - Показывает продающее сообщение с картинкой
    - Начисляет бонус за ожидание
    - Направляет к живому контакту
    - Отправляет детальный лог админу
    """

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        last_error = None

        for attempt in range(MAX_RETRIES + 1):
            try:
                return await handler(event, data)
            except TelegramRetryAfter as e:
                # Telegram просит подождать — ждём и повторяем
                logger.warning(f"Rate limited, waiting {e.retry_after}s")
                await asyncio.sleep(e.retry_after)
                continue
            except TelegramNetworkError as e:
                # Сетевая ошибка — retry с задержкой
                last_error = e
                if attempt < MAX_RETRIES:
                    delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                    logger.warning(f"Network error, retry {attempt + 1}/{MAX_RETRIES} in {delay}s: {e}")
                    await asyncio.sleep(delay)
                    continue
                # Все попытки исчерпаны
                logger.error(f"Network error after {MAX_RETRIES} retries: {e}")
                await self._handle_error(event, data, e)
                return None
            except Exception as e:
                # Прочие ошибки — без retry
                await self._handle_error(event, data, e)
                return None

        # Fallback если вышли из цикла
        if last_error:
            await self._handle_error(event, data, last_error)
        return None

    async def _handle_error(
        self,
        event: TelegramObject,
        data: Dict[str, Any],
        error: Exception
    ) -> None:
        """Обработка ошибки: бонус, продающее сообщение, лог админу"""

        bot: Bot = data.get("bot")
        session: AsyncSession = data.get("session")
        user: Optional[TgUser] = None
        context = "Unknown"

        # Извлекаем информацию о пользователе и контексте
        if isinstance(event, Update):
            if event.message:
                user = event.message.from_user
                context = f"Message: {event.message.text[:100] if event.message.text else 'media'}"
            elif event.callback_query:
                user = event.callback_query.from_user
                context = f"Callback: {event.callback_query.data}"

        # Получаем traceback
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

        # Начисляем бонус пользователю
        bonus_added = False
        if user and session:
            bonus_added = await self._add_error_bonus(session, user.id)

        # Отправляем продающее сообщение пользователю
        if bot and user:
            await self._send_selling_message(event, bot, user, bonus_added)

        # Отправляем улучшенный лог админу
        if bot:
            await self._send_admin_notification(
                bot=bot,
                user=user,
                error=error,
                context=context,
                traceback_str=tb_str,
                bonus_added=bonus_added,
            )

    async def _add_error_bonus(
        self,
        session: AsyncSession,
        user_id: int
    ) -> bool:
        """Начисляет бонус за ошибку"""
        try:
            query = select(User).where(User.telegram_id == user_id)
            result = await session.execute(query)
            db_user = result.scalar_one_or_none()

            if db_user:
                db_user.balance += ERROR_COMPENSATION_BONUS
                await session.commit()
                logger.info(f"Error bonus +{ERROR_COMPENSATION_BONUS}₽ added to user {user_id}")
                return True
        except Exception as e:
            logger.error(f"Failed to add error bonus: {e}")

        return False

    async def _send_selling_message(
        self,
        event: TelegramObject,
        bot: Bot,
        user: TgUser,
        bonus_added: bool
    ) -> None:
        """Отправляет продающее сообщение с картинкой"""
        try:
            # Имя пользователя для персонализации
            user_name = user.first_name or "партнёр"

            # Текст сообщения
            message_text = get_error_message(user_name)
            if not bonus_added:
                # Убираем строку про бонус если не начислился
                message_text = message_text.replace(
                    f"\n\n💰  Тебе начислено <b>{ERROR_COMPENSATION_BONUS}₽</b> на баланс за ожидание.",
                    ""
                )

            # Клавиатура
            keyboard = get_error_keyboard()

            # Отправляем с картинкой
            if isinstance(event, Update):
                chat_id = None

                if event.message:
                    chat_id = event.message.chat.id
                elif event.callback_query:
                    # Сначала убираем "часики"
                    try:
                        await event.callback_query.answer()
                    except Exception:
                        pass
                    chat_id = event.callback_query.message.chat.id

                if chat_id:
                    try:
                        # Пробуем отправить с картинкой
                        photo = FSInputFile(settings.ERROR_IMAGE)
                        await bot.send_photo(
                            chat_id=chat_id,
                            photo=photo,
                            caption=message_text,
                            reply_markup=keyboard
                        )
                    except Exception as img_error:
                        # Если картинка не найдена — отправляем без неё
                        logger.warning(f"Error image not found: {img_error}")
                        await bot.send_message(
                            chat_id=chat_id,
                            text=message_text,
                            reply_markup=keyboard
                        )

        except Exception as e:
            logger.error(f"Failed to send selling error message: {e}")

    async def _send_admin_notification(
        self,
        bot: Bot,
        user: Optional[TgUser],
        error: Exception,
        context: str,
        traceback_str: str,
        bonus_added: bool,
    ) -> None:
        """Отправляет улучшенное уведомление админу"""
        try:
            bot_logger = BotLogger(bot)

            # Формируем расширенный контекст
            extra_info = f"""
🎯  <b>Показана скидка 10%</b>
💰  Бонус {ERROR_COMPENSATION_BONUS}₽: {'✅ начислен' if bonus_added else '❌ не начислен'}
🔗  Клиент направлен к @{settings.SUPPORT_USERNAME}"""

            # Модифицируем контекст
            enhanced_context = f"{context}\n{extra_info}"

            await bot_logger.log_error(
                user=user,
                error=error,
                context=enhanced_context,
                traceback_str=traceback_str,
            )

        except Exception as e:
            logger.error(f"Failed to send admin notification: {e}")


# === Функция для превью ошибки в админке ===

async def send_error_preview(bot: Bot, chat_id: int, user_name: str = "Александр") -> None:
    """
    Отправляет превью сообщения об ошибке.
    Используется в админке для просмотра.
    """
    message_text = get_error_message(user_name)
    keyboard = get_error_keyboard()

    try:
        photo = FSInputFile(settings.ERROR_IMAGE)
        await bot.send_photo(
            chat_id=chat_id,
            photo=photo,
            caption=message_text,
            reply_markup=keyboard
        )
    except Exception:
        await bot.send_message(
            chat_id=chat_id,
            text=message_text,
            reply_markup=keyboard
        )

"""
Mini App Logger - отправляет логи API в отдельный топик админ-группы.

Используется для отслеживания действий пользователей в Mini App:
- Создание заказов
- Просмотр профиля
- Рулетка
- Ошибки API
"""

import logging
from datetime import datetime
from typing import Optional
from enum import Enum

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from core.config import settings
from bot.services.unified_hub import get_service_topic_id

logger = logging.getLogger(__name__)


class MiniAppEvent(str, Enum):
    """Типы событий Mini App"""
    # Заказы
    ORDER_CREATE = "order_create"
    ORDER_VIEW = "order_view"
    ORDER_LIST = "order_list"

    # Профиль
    PROFILE_VIEW = "profile_view"
    PROMO_APPLY = "promo_apply"

    # Рулетка
    ROULETTE_SPIN = "roulette_spin"
    ROULETTE_WIN = "roulette_win"

    # Ошибки
    ERROR = "error"
    AUTH_FAIL = "auth_fail"


# Иконки для событий
EVENT_ICONS = {
    MiniAppEvent.ORDER_CREATE: "🛒",
    MiniAppEvent.ORDER_VIEW: "👁",
    MiniAppEvent.ORDER_LIST: "📋",
    MiniAppEvent.PROFILE_VIEW: "👤",
    MiniAppEvent.PROMO_APPLY: "🎟",
    MiniAppEvent.ROULETTE_SPIN: "🎰",
    MiniAppEvent.ROULETTE_WIN: "🎉",
    MiniAppEvent.ERROR: "❌",
    MiniAppEvent.AUTH_FAIL: "🔐",
}

# Названия событий
EVENT_NAMES = {
    MiniAppEvent.ORDER_CREATE: "Новый заказ",
    MiniAppEvent.ORDER_VIEW: "Просмотр заказа",
    MiniAppEvent.ORDER_LIST: "Список заказов",
    MiniAppEvent.PROFILE_VIEW: "Просмотр профиля",
    MiniAppEvent.PROMO_APPLY: "Промокод",
    MiniAppEvent.ROULETTE_SPIN: "Рулетка",
    MiniAppEvent.ROULETTE_WIN: "Выигрыш!",
    MiniAppEvent.ERROR: "Ошибка",
    MiniAppEvent.AUTH_FAIL: "Ошибка авторизации",
}


async def log_mini_app_event(
    bot: Bot,
    event: MiniAppEvent,
    user_id: int,
    username: Optional[str] = None,
    details: Optional[str] = None,
    extra_data: Optional[dict] = None,
    order_id: Optional[int] = None,
) -> bool:
    """
    Отправляет лог события Mini App в специальный топик.

    Args:
        bot: Bot instance
        event: Тип события
        user_id: Telegram ID пользователя
        username: Username пользователя
        details: Дополнительное описание
        extra_data: Словарь с дополнительными данными
        order_id: ID заказа (если применимо)

    Returns:
        True если лог отправлен успешно
    """
    try:
        topic_id = get_service_topic_id("mini_app")
        if not topic_id:
            logger.warning("Mini App topic not found, skipping log")
            return False

        # Формируем сообщение
        icon = EVENT_ICONS.get(event, "📱")
        event_name = EVENT_NAMES.get(event, event.value)
        time_str = datetime.now().strftime("%H:%M:%S")

        # Формируем ссылку на пользователя
        if username:
            user_link = f"@{username}"
        else:
            user_link = f"<code>{user_id}</code>"

        # Основной текст
        text_parts = [
            f"{icon} <b>{event_name}</b>",
            f"👤 {user_link}",
        ]

        # Добавляем детали
        if details:
            text_parts.append(f"💬 {details}")

        # Добавляем order_id
        if order_id:
            text_parts.append(f"📦 Заказ <code>#{order_id}</code>")

        # Добавляем extra_data
        if extra_data:
            for key, value in extra_data.items():
                text_parts.append(f"• {key}: <code>{value}</code>")

        # Время в конце
        text_parts.append(f"\n🕐 {time_str}")

        text = "\n".join(text_parts)

        # Кнопки
        buttons = []

        # Кнопка на заказ если есть
        if order_id:
            buttons.append([
                InlineKeyboardButton(
                    text=f"📦 Заказ #{order_id}",
                    callback_data=f"admin_order_detail:{order_id}"
                )
            ])

        # Кнопки для связи: топик и личка
        if order_id:
            # Если есть заказ - показываем кнопку для топика по заказу
            buttons.append([
                InlineKeyboardButton(
                    text="💬 Топик по заказу",
                    callback_data=f"admin_open_order_topic:{order_id}"
                ),
                InlineKeyboardButton(
                    text="✉️ В личку",
                    url=f"tg://user?id={user_id}"
                )
            ])
        else:
            # Без заказа - просто личка
            buttons.append([
                InlineKeyboardButton(
                    text="💬 Написать",
                    url=f"tg://user?id={user_id}"
                )
            ])

        keyboard = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None

        # Отправляем
        await bot.send_message(
            chat_id=settings.ADMIN_GROUP_ID,
            message_thread_id=topic_id,
            text=text,
            reply_markup=keyboard,
            disable_notification=True,  # Тихие уведомления
        )

        return True

    except Exception as e:
        logger.error(f"Failed to log mini app event: {e}")
        return False


async def log_order_created(
    bot: Bot,
    user_id: int,
    username: Optional[str],
    order_id: int,
    work_type: str,
    subject: str,
    price: Optional[float] = None,
):
    """Логирует создание заказа из Mini App"""
    extra = {
        "Тип": work_type,
        "Предмет": subject[:30] + "..." if len(subject) > 30 else subject,
    }
    if price:
        extra["Цена"] = f"{price:,.0f}₽".replace(",", " ")

    await log_mini_app_event(
        bot=bot,
        event=MiniAppEvent.ORDER_CREATE,
        user_id=user_id,
        username=username,
        order_id=order_id,
        extra_data=extra,
    )


async def log_roulette_spin(
    bot: Bot,
    user_id: int,
    username: Optional[str],
    prize: str,
    prize_type: str,
    value: int,
):
    """Логирует кручение рулетки"""
    event = MiniAppEvent.ROULETTE_WIN if prize_type != "nothing" else MiniAppEvent.ROULETTE_SPIN

    extra = {"Приз": prize}
    if value > 0:
        extra["Значение"] = str(value)

    await log_mini_app_event(
        bot=bot,
        event=event,
        user_id=user_id,
        username=username,
        extra_data=extra,
    )


async def log_api_error(
    bot: Bot,
    endpoint: str,
    user_id: Optional[int],
    error: str,
):
    """Логирует ошибку API"""
    await log_mini_app_event(
        bot=bot,
        event=MiniAppEvent.ERROR,
        user_id=user_id or 0,
        details=f"Endpoint: {endpoint}",
        extra_data={"Ошибка": error[:100]},
    )

"""
Сервис уведомлений о смене статуса заказа.

App-First подход: все действия направляют в Mini App.
Премиальный, строгий стиль уведомлений.
"""

import logging
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from database.models.orders import Order, OrderStatus, get_status_meta
from core.config import settings

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════
#  PREMIUM NOTIFICATION TEMPLATES — App-First
# ══════════════════════════════════════════════════════════════

NOTIFICATION_TEMPLATES = {
    # Заказ ждёт оплаты
    OrderStatus.WAITING_PAYMENT.value: {
        "emoji": "💳",
        "title": "Ожидает оплаты",
        "message": "Цена рассчитана. Оплатите для начала работы.",
        "show_price": True,
        "webapp_button": "💳 Оплатить",
        "webapp_path": "/orders/{order_id}",
    },

    # Заказ подтверждён
    OrderStatus.CONFIRMED.value: {
        "emoji": "✓",
        "title": "Цена установлена",
        "message": "Заказ оценён. Оплатите для начала работы.",
        "show_price": True,
        "webapp_button": "💳 Оплатить",
        "webapp_path": "/orders/{order_id}",
    },

    # Аванс оплачен
    OrderStatus.PAID.value: {
        "emoji": "💰",
        "title": "Аванс получен",
        "message": "Приступаем к работе. Уведомим о готовности.",
        "show_price": False,
        "webapp_button": "📋 Отслеживать",
        "webapp_path": "/orders/{order_id}",
    },

    # Полностью оплачен
    OrderStatus.PAID_FULL.value: {
        "emoji": "💰",
        "title": "Оплата получена",
        "message": "Заказ в приоритете. Уведомим о готовности.",
        "show_price": False,
        "webapp_button": "📋 Отслеживать",
        "webapp_path": "/orders/{order_id}",
    },

    # В работе
    OrderStatus.IN_PROGRESS.value: {
        "emoji": "⚙️",
        "title": "В работе",
        "message": "Работаем над заказом.",
        "show_price": False,
        "webapp_button": "📋 Отслеживать",
        "webapp_path": "/orders/{order_id}",
    },

    # На проверке
    OrderStatus.REVIEW.value: {
        "emoji": "✓",
        "title": "Готово к проверке",
        "message": "Работа выполнена. Проверьте результат.",
        "show_price": False,
        "webapp_button": "📋 Открыть заказ",
        "webapp_path": "/orders/{order_id}",
    },

    # Завершён
    OrderStatus.COMPLETED.value: {
        "emoji": "✓",
        "title": "Заказ завершён",
        "message": "Благодарим за заказ.",
        "show_price": False,
        "webapp_button": "📝 Новый заказ",
        "webapp_path": "/create-order",
    },

    # Отклонён
    OrderStatus.REJECTED.value: {
        "emoji": "✕",
        "title": "Заказ отклонён",
        "message": "Не можем выполнить данный заказ. Свяжитесь с поддержкой.",
        "show_price": False,
        "support_button": True,
    },
}


async def notify_order_status_change(
    bot: Bot,
    order: Order,
    old_status: str,
    new_status: str,
    custom_message: str = None,
) -> bool:
    """
    Отправить уведомление пользователю о смене статуса заказа.
    App-First: все действия через WebApp кнопки.

    Args:
        bot: Экземпляр бота
        order: Заказ
        old_status: Старый статус
        new_status: Новый статус
        custom_message: Кастомное сообщение (опционально)

    Returns:
        True если уведомление отправлено успешно
    """
    template = NOTIFICATION_TEMPLATES.get(new_status)

    if not template:
        logger.debug(f"Нет шаблона уведомления для статуса {new_status}")
        return False

    # Формируем премиальный текст
    emoji = template["emoji"]
    title = template["title"]
    message = custom_message or template["message"]

    # Премиальный строгий формат
    text = f"""<b>{emoji} {title}</b>

Заказ <code>#{order.id}</code> · {order.work_type_label}

{message}"""

    # Добавляем цену если нужно
    if template.get("show_price") and order.price > 0:
        final_price = order.final_price
        price_formatted = f"{int(final_price):,}".replace(",", " ")

        if order.bonus_used > 0:
            text += f"\n\n💰 К оплате: <b>{price_formatted} ₽</b>"
            text += f"\n<i>Бонусы: −{int(order.bonus_used)} ₽</i>"
        else:
            text += f"\n\n💰 К оплате: <b>{price_formatted} ₽</b>"

    # Формируем клавиатуру с WebApp кнопками
    buttons = []

    # Главная WebApp кнопка
    if template.get("webapp_button") and template.get("webapp_path"):
        webapp_path = template["webapp_path"].format(order_id=order.id)
        webapp_url = f"{settings.WEBAPP_URL}{webapp_path}"
        buttons.append([InlineKeyboardButton(
            text=template["webapp_button"],
            web_app=WebAppInfo(url=webapp_url)
        )])

    # Кнопка поддержки
    if template.get("support_button"):
        buttons.append([InlineKeyboardButton(
            text="💬 Поддержка",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )])

    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None

    # Отправляем уведомление
    try:
        await bot.send_message(
            chat_id=order.user_id,
            text=text,
            reply_markup=keyboard,
        )
        logger.info(f"[Notifications] Status {new_status} sent to user {order.user_id}")
        return True
    except Exception as e:
        logger.error(f"[Notifications] Failed to notify user {order.user_id}: {e}")
        return False


async def notify_price_set(
    bot: Bot,
    order: Order,
) -> bool:
    """
    Специальное уведомление о назначении цены.
    Отправляется когда админ назначает цену заказу.
    """
    return await notify_order_status_change(
        bot=bot,
        order=order,
        old_status=OrderStatus.PENDING.value,
        new_status=OrderStatus.CONFIRMED.value,
    )


async def notify_order_ready(
    bot: Bot,
    order: Order,
    file_message: str = None,
) -> bool:
    """
    Уведомление о готовности заказа.

    Args:
        bot: Экземпляр бота
        order: Заказ
        file_message: Сообщение о файлах (опционально)
    """
    message = "Работа готова и ждёт твоей проверки."
    if file_message:
        message += f"\n\n{file_message}"
    message += "\n\nПосмотри и напиши, если нужны правки."

    return await notify_order_status_change(
        bot=bot,
        order=order,
        old_status=OrderStatus.IN_PROGRESS.value,
        new_status=OrderStatus.REVIEW.value,
        custom_message=message,
    )

"""
Сервис уведомлений о смене статуса заказа.

Отправляет пользователю push-уведомления при изменении статуса заказа.
Используется админ-панелью при обновлении заказов.
"""

import logging
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import Order, OrderStatus, get_status_meta
from core.config import settings

logger = logging.getLogger(__name__)


# Шаблоны уведомлений для каждого перехода статуса
NOTIFICATION_TEMPLATES = {
    # Заказ ждёт оплаты (автоматический расчёт)
    OrderStatus.WAITING_PAYMENT.value: {
        "emoji": "💳",
        "title": "Ждёт оплаты",
        "message": "Цена рассчитана автоматически.\nОплати и я сразу приступлю к работе.",
        "show_price": True,
        "show_order_button": True,
    },

    # Заказ подтверждён (legacy / ручной статус)
    OrderStatus.CONFIRMED.value: {
        "emoji": "✅",
        "title": "Заказ подтверждён!",
        "message": "Я посмотрел твой заказ и назначил цену.\nМожешь оплатить и я сразу приступлю к работе.",
        "show_price": True,
        "show_order_button": True,
    },

    # Аванс оплачен
    OrderStatus.PAID.value: {
        "emoji": "💳",
        "title": "Аванс получен!",
        "message": "Спасибо за оплату! Приступаю к работе.\nНапишу, когда будет готово.",
        "show_price": False,
        "show_order_button": True,
    },

    # Полностью оплачен
    OrderStatus.PAID_FULL.value: {
        "emoji": "💰",
        "title": "Оплата получена!",
        "message": "Спасибо за полную оплату! Твой заказ в приоритете.\nНапишу, когда будет готово.",
        "show_price": False,
        "show_order_button": True,
    },

    # В работе
    OrderStatus.IN_PROGRESS.value: {
        "emoji": "⚙️",
        "title": "Заказ в работе",
        "message": "Работаю над твоим заказом.\nСкоро будет готово!",
        "show_price": False,
        "show_order_button": True,
    },

    # На проверке
    OrderStatus.REVIEW.value: {
        "emoji": "🔍",
        "title": "Заказ готов!",
        "message": "Работа готова и ждёт твоей проверки.\nПосмотри и напиши, если нужны правки.",
        "show_price": False,
        "show_order_button": True,
        "show_support_button": True,
    },

    # Завершён
    OrderStatus.COMPLETED.value: {
        "emoji": "✨",
        "title": "Заказ завершён!",
        "message": "Рад, что всё получилось!\nСпасибо за заказ. Буду рад видеть снова.",
        "show_price": False,
        "show_order_button": True,
        "show_new_order_button": True,
    },

    # Отклонён
    OrderStatus.REJECTED.value: {
        "emoji": "🚫",
        "title": "Заказ отклонён",
        "message": "К сожалению, не могу взять этот заказ.\nНапиши мне — объясню причину и помогу найти решение.",
        "show_price": False,
        "show_support_button": True,
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

    Args:
        bot: Экземпляр бота
        order: Заказ
        old_status: Старый статус
        new_status: Новый статус
        custom_message: Кастомное сообщение (опционально)

    Returns:
        True если уведомление отправлено успешно
    """
    # Получаем шаблон для нового статуса
    template = NOTIFICATION_TEMPLATES.get(new_status)

    if not template:
        logger.debug(f"Нет шаблона уведомления для статуса {new_status}")
        return False

    # Формируем текст
    emoji = template["emoji"]
    title = template["title"]
    message = custom_message or template["message"]

    text = f"""{emoji} <b>{title}</b>

<b>Заказ #{order.id}</b> · {order.work_type_label}

{message}"""

    # Добавляем цену если нужно
    if template.get("show_price") and order.price > 0:
        price_text = f"\n\n<b>Стоимость: {order.price:.0f}₽</b>"

        if order.discount > 0:
            price_text += f" (скидка {order.discount:.0f}%)"

        if order.bonus_used > 0:
            price_text += f"\n🎁 Бонусы: −{order.bonus_used:.0f}₽"
            price_text += f"\n<b>Итого: {order.final_price:.0f}₽</b>"

        text += price_text

    # Формируем клавиатуру
    buttons = []

    if template.get("show_order_button"):
        buttons.append([InlineKeyboardButton(
            text="📋 Посмотреть заказ",
            callback_data=f"order_detail:{order.id}"
        )])

    if template.get("show_support_button"):
        buttons.append([InlineKeyboardButton(
            text="💬 Написать",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}?text=Заказ%20%23{order.id}"
        )])

    if template.get("show_new_order_button"):
        buttons.append([InlineKeyboardButton(
            text="📝 Новый заказ",
            callback_data="create_order"
        )])

    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons) if buttons else None

    # Отправляем уведомление
    try:
        await bot.send_message(
            chat_id=order.user_id,
            text=text,
            reply_markup=keyboard,
        )
        logger.info(f"Уведомление о статусе {new_status} отправлено пользователю {order.user_id}")
        return True
    except Exception as e:
        logger.error(f"Ошибка отправки уведомления пользователю {order.user_id}: {e}")
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

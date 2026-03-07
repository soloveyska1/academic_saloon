"""
Сервис уведомлений о смене статуса заказа.

App-First подход: все действия направляют в Mini App.
Премиальный, строгий стиль уведомлений.
"""

import logging
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from database.models.orders import Order, OrderStatus
from core.config import settings
from bot.services.order_message_formatter import (
    build_issue_keyboard,
    build_order_keyboard,
    build_status_notification_text,
)

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════
#  PREMIUM NOTIFICATION TEMPLATES — App-First
# ══════════════════════════════════════════════════════════════

NOTIFICATION_TEMPLATES = {
    # Заказ ждёт оплаты
    OrderStatus.WAITING_PAYMENT.value: {
        "title": "Стоимость готова",
        "message": "Откройте заказ, чтобы выбрать способ оплаты и запустить работу.",
        "show_price": True,
        "webapp_button": "Открыть оплату",
    },

    # Заказ подтверждён
    OrderStatus.CONFIRMED.value: {
        "title": "Стоимость готова",
        "message": "Откройте заказ, чтобы выбрать способ оплаты и запустить работу.",
        "show_price": True,
        "webapp_button": "Открыть оплату",
    },

    # Аванс оплачен
    OrderStatus.PAID.value: {
        "title": "Оплата получена",
        "message": "Заказ запущен в работу. Держим вас в курсе по следующим этапам.",
        "show_price": False,
        "webapp_button": "Открыть заказ",
    },

    # Полностью оплачен
    OrderStatus.PAID_FULL.value: {
        "title": "Оплата получена",
        "message": "Заказ запущен в работу. Держим вас в курсе по следующим этапам.",
        "show_price": False,
        "webapp_button": "Открыть заказ",
    },

    # В работе
    OrderStatus.IN_PROGRESS.value: {
        "title": "В работе",
        "message": "Работаем по вашему заказу. Все обновления будут приходить сюда и в приложении.",
        "show_price": False,
        "webapp_button": "Открыть заказ",
    },

    # На проверке
    OrderStatus.REVIEW.value: {
        "title": "Готово к проверке",
        "message": "Работа готова. Откройте заказ, чтобы посмотреть результат и оставить комментарий.",
        "show_price": False,
        "webapp_button": "Открыть заказ",
    },

    # Завершён
    OrderStatus.COMPLETED.value: {
        "title": "Заказ завершён",
        "message": "Спасибо за доверие. Если понадобится новая работа, всё готово к следующей заявке.",
        "show_price": False,
        "webapp_button": "Новый заказ",
        "webapp_path": "/create-order",
    },

    # Отклонён
    OrderStatus.REJECTED.value: {
        "title": "Заказ отклонён",
        "message": "Мы не можем взять этот заказ в работу. Напишите в поддержку, если хотите обсудить альтернативу.",
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

    title = template["title"]
    message = custom_message or template["message"]
    text = build_status_notification_text(
        order=order,
        title=title,
        message=message,
        show_price=template.get("show_price", False),
    )

    # Формируем клавиатуру с WebApp кнопками
    keyboard = None
    if template.get("support_button"):
        keyboard = build_issue_keyboard(order.id)
    elif template.get("webapp_button"):
        keyboard = build_order_keyboard(order.id, primary_text=template["webapp_button"])

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

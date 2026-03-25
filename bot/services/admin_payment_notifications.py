from __future__ import annotations

import logging
from typing import Optional

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from database.models.orders import Conversation, Order, WORK_TYPE_LABELS, WorkType
from database.models.users import User
from bot.utils.formatting import format_price

logger = logging.getLogger(__name__)


def _payment_method_label(method: str | None) -> str:
    return {
        "card": "Карта",
        "sbp": "СБП",
        "transfer": "Перевод",
        "yookassa": "ЮKassa",
    }.get((method or "").lower(), method or "Не указан")


def _payment_label(order: Order, payment_phase: str) -> str:
    if payment_phase == "final":
        return "Доплата"
    if getattr(order, "payment_scheme", None) == "half":
        return "Аванс"
    return "Оплата"


def _work_label(order: Order) -> str:
    try:
        return WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)
    except Exception:
        return getattr(order, "work_type_label", None) or order.work_type or "—"


def _client_label(order: Order, user: Optional[User]) -> str:
    if user and user.username:
        return f"@{user.username}"
    if user and user.fullname:
        return f"<a href='tg://user?id={order.user_id}'>{user.fullname}</a>"
    return f"<a href='tg://user?id={order.user_id}'>Клиент</a>"


async def _send_to_topic_or_admins(
    *,
    bot: Bot,
    session: AsyncSession,
    order: Order,
    text: str,
    reply_markup: InlineKeyboardMarkup,
) -> bool:
    topic_notified = False

    try:
        conv_result = await session.execute(
            select(Conversation).where(Conversation.order_id == order.id)
        )
        conversation = conv_result.scalar_one_or_none()

        if conversation and conversation.topic_id:
            await bot.send_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=conversation.topic_id,
                text=text,
                reply_markup=reply_markup,
            )
            topic_notified = True
    except Exception as exc:
        logger.warning("Failed to send admin payment alert to topic for order #%s: %s", order.id, exc)

    if topic_notified:
        return True

    delivered = False
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, text, reply_markup=reply_markup)
            delivered = True
        except Exception as exc:
            logger.warning("Failed to send admin payment alert to admin %s for order #%s: %s", admin_id, order.id, exc)

    return delivered


async def send_admin_payment_pending_alert(
    *,
    bot: Bot,
    session: AsyncSession,
    order: Order,
    user: Optional[User],
    amount: float,
    payment_method: str,
    payment_phase: str = "initial",
) -> bool:
    payment_label = _payment_label(order, payment_phase)
    work_label = _work_label(order)
    client_label = _client_label(order, user)
    method_label = _payment_method_label(payment_method)

    text = f"""🚨 <b>ПРОВЕРКА ОПЛАТЫ</b>

📋 Заказ: <code>#{order.id}</code>
📂 Тип: {work_label}
👤 Клиент: {client_label}
💰 {payment_label}: <b>{format_price(amount)}</b>
💳 Способ: {method_label}

<i>Клиент подтвердил оплату. Проверьте поступление.</i>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Подтвердить", callback_data=f"admin_verify_paid:{order.id}"),
            InlineKeyboardButton(text="❌ Отклонить", callback_data=f"admin_reject_payment:{order.id}"),
        ],
    ])

    return await _send_to_topic_or_admins(
        bot=bot,
        session=session,
        order=order,
        text=text,
        reply_markup=keyboard,
    )


async def send_admin_payment_completed_alert(
    *,
    bot: Bot,
    session: AsyncSession,
    order: Order,
    user: Optional[User],
    amount: float,
    payment_method: str,
    payment_phase: str = "initial",
    payment_id: str | None = None,
) -> bool:
    payment_label = _payment_label(order, payment_phase)
    work_label = _work_label(order)
    client_label = _client_label(order, user)
    method_label = _payment_method_label(payment_method)
    payment_id_line = f"\n🔗 Платёж: <code>{payment_id}</code>" if payment_id else ""

    text = f"""💳 <b>ОПЛАТА ПОЛУЧЕНА</b>

📋 Заказ: <code>#{order.id}</code>
📂 Тип: {work_label}
👤 Клиент: {client_label}
💰 {payment_label}: <b>{format_price(amount)}</b>
💳 Способ: {method_label}{payment_id_line}

<i>Платёж проведён. Можно сразу открыть заказ.</i>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📋 К заказу", callback_data=f"admin_order_detail:{order.id}")],
    ])

    return await _send_to_topic_or_admins(
        bot=bot,
        session=session,
        order=order,
        text=text,
        reply_markup=keyboard,
    )

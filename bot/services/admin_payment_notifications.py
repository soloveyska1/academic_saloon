from __future__ import annotations

import html
import logging

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.utils.formatting import format_price
from core.config import settings
from database.models.orders import Conversation, Order, WORK_TYPE_LABELS, WorkType
from database.models.users import User

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


def _client_label(order: Order, user: User | None) -> str:
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
    user: User | None,
    amount: float,
    payment_method: str,
    payment_phase: str = "initial",
    batch_orders_count: int = 0,
    batch_total_amount: float = 0.0,
    batch_order_ids: list[int] | None = None,
) -> bool:
    payment_label = _payment_label(order, payment_phase)
    work_label = _work_label(order)
    client_label = _client_label(order, user)
    method_label = _payment_method_label(payment_method)
    batch_order_ids = [order_id for order_id in (batch_order_ids or []) if order_id]

    batch_summary_lines: list[str] = []
    if batch_orders_count > 1:
        total_label = format_price(batch_total_amount) if batch_total_amount > 0 else "—"
        batch_summary_lines.append(f"📦 Общая заявка: <b>{batch_orders_count}</b> заказ(а/ов) на <b>{total_label}</b>")
        if batch_order_ids:
            related_orders_text = ", ".join(f"<code>#{order_id}</code>" for order_id in batch_order_ids[:8])
            if len(batch_order_ids) > 8:
                related_orders_text += f" и ещё {len(batch_order_ids) - 8}"
            batch_summary_lines.append(f"🧩 В заявке: {related_orders_text}")
    batch_summary = ("\n" + "\n".join(batch_summary_lines)) if batch_summary_lines else ""

    text = f"""🚨 <b>ПРОВЕРКА ОПЛАТЫ</b>

📋 Заказ: <code>#{order.id}</code>
📂 Тип: {work_label}
👤 Клиент: {client_label}
💰 {payment_label}: <b>{format_price(amount)}</b>
💳 Способ: {method_label}{batch_summary}

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


async def send_admin_batch_payment_pending_summary(
    *,
    bot: Bot,
    user: User | None,
    processed_orders: list[dict],
    total_amount: float,
    payment_method: str,
    payment_scheme: str,
) -> bool:
    if not processed_orders:
        return False

    client_label = (
        f"@{html.escape(user.username)}"
        if user and user.username
        else html.escape(user.fullname) if user and user.fullname else "Клиент"
    )
    method_label = _payment_method_label(payment_method)
    scheme_label = "100%" if payment_scheme == "full" else "50% / доплата"

    order_lines = []
    for order in processed_orders[:8]:
        subject = html.escape(order.get("subject") or order.get("topic") or "Без темы")
        work_type_label = html.escape(order.get("work_type_label") or "Заказ")
        phase_label = "доплата" if order.get("payment_phase") == "final" else "оплата"
        order_lines.append(
            f"• <code>#{order['id']}</code> · {work_type_label}\n"
            f"  {subject}\n"
            f"  {phase_label}: <b>{format_price(order.get('amount_to_pay') or 0)}</b>"
        )

    if len(processed_orders) > 8:
        order_lines.append(f"• … и ещё {len(processed_orders) - 8}")

    text = (
        "🚨 <b>МАССОВАЯ ПРОВЕРКА ОПЛАТЫ</b>\n\n"
        f"👤 Клиент: {client_label}\n"
        f"📦 Заказов: <b>{len(processed_orders)}</b>\n"
        f"💰 Итого: <b>{format_price(total_amount)}</b>\n"
        f"💳 Способ: {method_label}\n"
        f"🧾 Схема: {scheme_label}\n\n"
        + "\n".join(order_lines)
        + "\n\n<i>Ниже придут отдельные карточки для подтверждения каждого заказа.</i>"
    )

    delivered = False
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(admin_id, text)
            delivered = True
        except Exception as exc:
            logger.warning("Failed to send batch payment summary to admin %s: %s", admin_id, exc)

    return delivered


async def send_admin_payment_completed_alert(
    *,
    bot: Bot,
    session: AsyncSession,
    order: Order,
    user: User | None,
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

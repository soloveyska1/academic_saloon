from __future__ import annotations

import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.bot_instance import get_bot
from bot.services.order_pause import auto_resume_if_needed, get_pause_available_days
from core.config import settings
from database.models.orders import Order, OrderStatus
from database.models.users import User

logger = logging.getLogger(__name__)


def format_pause_until(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    local_dt = value.astimezone(ZoneInfo("Europe/Moscow"))
    return local_dt.strftime("%d.%m.%Y · %H:%M МСК")


async def notify_pause_state_change(
    session: AsyncSession,
    order: Order,
    user: User | None,
    *,
    event: str,
    old_status: str | None,
) -> None:
    pause_until_label = format_pause_until(getattr(order, "pause_until", None))
    event_text = {
        "paused": {
            "client_title": "❄️ Заказ поставлен на паузу на 7 дней",
            "card_text": f"❄️ Клиент заморозил заказ до {pause_until_label or 'истечения срока'}",
            "admin_text": "Клиент заморозил заказ",
            "user_text": "Вернуться к работе можно раньше в карточке заказа.",
        },
        "resumed": {
            "client_title": "▶️ Заказ снова активен",
            "card_text": "▶️ Клиент досрочно возобновил заказ",
            "admin_text": "Клиент досрочно возобновил заказ",
            "user_text": "Работа продолжается с того этапа, на котором была остановлена.",
        },
        "expired": {
            "client_title": "▶️ Пауза завершена",
            "card_text": "▶️ Пауза завершилась автоматически",
            "admin_text": "Пауза завершилась автоматически",
            "user_text": "Срок заморозки закончился, заказ снова активен.",
        },
    }
    config = event_text[event]

    try:
        from bot.services.realtime_notifications import send_order_status_notification

        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=order.status,
            old_status=old_status,
            extra_data={
                "pause_until": getattr(order, "pause_until", None).isoformat() if getattr(order, "pause_until", None) else None,
                "paused_from_status": getattr(order, "paused_from_status", None),
                "pause_available_days": get_pause_available_days(order),
                "pause_event": event,
            },
        )
    except Exception as exc:
        logger.warning(f"[Pause] Failed to send WS notification for order #{order.id}: {exc}")

    try:
        bot = get_bot()
        from bot.handlers.order_chat import get_or_create_topic
        from bot.services.live_cards import send_or_update_card

        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            extra_text=config["card_text"],
        )
        conv, topic_id = await get_or_create_topic(bot, session, order.user_id, order.id)
        if topic_id:
            admin_text = (
                f"<b>{config['admin_text']}</b>\n\n"
                f"Заказ <code>#{order.id}</code>\n"
                + (f"До: <b>{pause_until_label}</b>\n" if event == "paused" and pause_until_label else "")
                + (f"Причина: {order.pause_reason}\n" if event == "paused" and getattr(order, "pause_reason", None) else "")
            )
            await bot.send_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=topic_id,
                text=admin_text,
            )
        if user:
            await bot.send_message(
                chat_id=user.telegram_id,
                text=(
                    f"✅ <b>{config['client_title']}</b>\n\n"
                    f"Заказ <code>#{order.id}</code>\n"
                    + (f"До: <b>{pause_until_label}</b>\n\n" if event == "paused" and pause_until_label else "\n")
                    + config["user_text"]
                ),
            )
    except Exception as exc:
        logger.warning(f"[Pause] Failed to send bot notification for order #{order.id}: {exc}")


async def sync_order_pause_state(
    session: AsyncSession,
    order: Order | None,
    *,
    notify_user: bool = False,
) -> bool:
    if order is None:
        return False
    resumed_status = auto_resume_if_needed(order)
    if not resumed_status:
        return False

    await session.commit()

    if notify_user:
        user_result = await session.execute(select(User).where(User.telegram_id == order.user_id))
        user = user_result.scalar_one_or_none()
        await notify_pause_state_change(
            session,
            order,
            user,
            event="expired",
            old_status=OrderStatus.PAUSED.value,
        )

    return True


async def sync_orders_pause_state(
    session: AsyncSession,
    orders: list[Order],
    *,
    notify_user: bool = False,
) -> bool:
    resumed_orders: list[Order] = []

    for order in orders:
        if auto_resume_if_needed(order):
            resumed_orders.append(order)

    if not resumed_orders:
        return False

    await session.commit()

    if notify_user:
        user_ids = {order.user_id for order in resumed_orders}
        user_result = await session.execute(select(User).where(User.telegram_id.in_(user_ids)))
        users_by_tg = {user.telegram_id: user for user in user_result.scalars().all()}

        for order in resumed_orders:
            await notify_pause_state_change(
                session,
                order,
                users_by_tg.get(order.user_id),
                event="expired",
                old_status=OrderStatus.PAUSED.value,
            )

    return True

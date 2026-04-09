from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from database.models.orders import OrderStatus

MSK_TZ = ZoneInfo("Europe/Moscow")

DELIVERABLE_ORDER_STATUSES = {
    OrderStatus.PAID.value,
    OrderStatus.PAID_FULL.value,
    OrderStatus.IN_PROGRESS.value,
    OrderStatus.REVISION.value,
}

COMPLETABLE_ORDER_STATUSES = {
    OrderStatus.REVIEW.value,
}

ALREADY_DELIVERED_ORDER_STATUSES = {
    OrderStatus.REVIEW.value,
    OrderStatus.COMPLETED.value,
}


@dataclass
class DeliveryReviewSyncResult:
    reopened_review: bool
    delivered_at: datetime | None


def _to_decimal(value: object, default: str = "0") -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal(default)
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def can_deliver_order(order) -> bool:
    return getattr(order, "status", None) in DELIVERABLE_ORDER_STATUSES


def can_complete_order(order) -> bool:
    return getattr(order, "status", None) in COMPLETABLE_ORDER_STATUSES


def is_order_already_delivered(order) -> bool:
    return getattr(order, "status", None) in ALREADY_DELIVERED_ORDER_STATUSES


async def sync_order_delivery_review(
    session,
    bot,
    order,
    *,
    client_username: str | None = None,
    client_name: str | None = None,
    yadisk_link: str | None = None,
    card_extra_text: str | None = None,
    delivered_at: datetime | None = None,
) -> DeliveryReviewSyncResult:
    current_status = getattr(order, "status", None)
    delivery_time = delivered_at or datetime.now(MSK_TZ)

    if current_status in ALREADY_DELIVERED_ORDER_STATUSES:
        if current_status == OrderStatus.REVIEW.value and getattr(order, "delivered_at", None) is None:
            order.delivered_at = delivery_time
            await session.commit()
            return DeliveryReviewSyncResult(reopened_review=False, delivered_at=delivery_time)
        return DeliveryReviewSyncResult(
            reopened_review=False,
            delivered_at=getattr(order, "delivered_at", None),
        )

    if not can_deliver_order(order):
        return DeliveryReviewSyncResult(
            reopened_review=False,
            delivered_at=getattr(order, "delivered_at", None),
        )

    from bot.services.order_status_service import (
        OrderStatusDispatchOptions,
        apply_order_status_transition,
        finalize_order_status_change,
    )

    change = apply_order_status_transition(order, OrderStatus.REVIEW.value)
    order.delivered_at = delivery_time

    display_time = delivery_time
    if display_time.tzinfo is None:
        display_time = display_time.replace(tzinfo=MSK_TZ)

    extra_text = card_extra_text
    if not extra_text:
        extra_text = (
            "✏️ Исправленная версия отправлена"
            if change.old_status == OrderStatus.REVISION.value
            else "📤 Работа передана клиенту"
        )
    extra_text = f"{extra_text} — {display_time.astimezone(MSK_TZ).strftime('%d.%m %H:%M')}"

    await finalize_order_status_change(
        session,
        bot,
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            client_username=client_username,
            client_name=client_name,
            yadisk_link=yadisk_link or getattr(order, "files_url", None),
            card_extra_text=extra_text,
            notification_extra_data={"delivered_at": delivery_time.isoformat()},
        ),
    )
    return DeliveryReviewSyncResult(reopened_review=True, delivered_at=delivery_time)


def get_order_cashback_base(order) -> float:
    paid_amount = _to_decimal(getattr(order, "paid_amount", 0))
    final_price = _to_decimal(getattr(order, "final_price", 0))
    base_price = _to_decimal(getattr(order, "price", 0))
    return float(max(paid_amount or final_price or base_price, Decimal("0")))

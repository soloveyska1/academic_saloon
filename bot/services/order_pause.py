from __future__ import annotations

from datetime import datetime, timedelta, timezone

from bot.services.order_status_service import (
    OrderStatusTransitionError,
    apply_order_status_transition,
)
from database.models.orders import Order, OrderStatus

MAX_ORDER_PAUSE_DAYS = 7
PAUSABLE_ORDER_STATUSES = {
    OrderStatus.PAID.value,
    OrderStatus.PAID_FULL.value,
    OrderStatus.IN_PROGRESS.value,
    OrderStatus.REVISION.value,
    OrderStatus.REVIEW.value,
}
RESUMABLE_ORDER_STATUSES = set(PAUSABLE_ORDER_STATUSES)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_pause_available_days(order: Order) -> int:
    used = max(int(getattr(order, "pause_days_used", 0) or 0), 0)
    return max(0, MAX_ORDER_PAUSE_DAYS - used)


def infer_resume_status(order: Order) -> str:
    previous = getattr(order, "paused_from_status", None)
    if previous in RESUMABLE_ORDER_STATUSES:
        return previous

    progress = int(getattr(order, "progress", 0) or 0)
    paid_amount = float(getattr(order, "paid_amount", 0) or 0)
    if progress >= 90:
        return OrderStatus.REVIEW.value
    if paid_amount > 0:
        return OrderStatus.IN_PROGRESS.value
    return OrderStatus.PAID.value


def can_pause_order(order: Order) -> bool:
    return (
        getattr(order, "status", None) in PAUSABLE_ORDER_STATUSES
        and float(getattr(order, "paid_amount", 0) or 0) > 0
        and get_pause_available_days(order) >= MAX_ORDER_PAUSE_DAYS
    )


def is_pause_active(order: Order, now: datetime | None = None) -> bool:
    if getattr(order, "status", None) != OrderStatus.PAUSED.value:
        return False
    pause_until = _to_utc(getattr(order, "pause_until", None))
    current_time = _to_utc(now) or utc_now()
    return pause_until is not None and pause_until > current_time


def pause_order(order: Order, reason: str | None = None, now: datetime | None = None) -> datetime:
    if not can_pause_order(order):
        raise ValueError("Order cannot be paused")

    current_time = _to_utc(now) or utc_now()
    order.paused_from_status = order.status
    try:
        apply_order_status_transition(order, OrderStatus.PAUSED.value, now=current_time)
    except OrderStatusTransitionError as exc:
        raise ValueError(str(exc)) from exc
    order.pause_started_at = current_time
    order.pause_until = current_time + timedelta(days=MAX_ORDER_PAUSE_DAYS)
    order.pause_reason = reason.strip() if isinstance(reason, str) and reason.strip() else None
    order.pause_days_used = MAX_ORDER_PAUSE_DAYS
    return order.pause_until


def resume_order(order: Order) -> str:
    if getattr(order, "status", None) != OrderStatus.PAUSED.value:
        raise ValueError("Order is not paused")

    resumed_status = infer_resume_status(order)
    try:
        apply_order_status_transition(order, resumed_status)
    except OrderStatusTransitionError as exc:
        raise ValueError(str(exc)) from exc
    order.paused_from_status = None
    order.pause_started_at = None
    order.pause_until = None
    order.pause_reason = None
    return resumed_status


def auto_resume_if_needed(order: Order, now: datetime | None = None) -> str | None:
    if getattr(order, "status", None) != OrderStatus.PAUSED.value:
        return None

    current_time = _to_utc(now) or utc_now()
    pause_until = _to_utc(getattr(order, "pause_until", None))
    if pause_until is None or pause_until > current_time:
        return None

    return resume_order(order)

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from database.models.orders import OrderStatus


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


def get_order_cashback_base(order) -> float:
    paid_amount = _to_decimal(getattr(order, "paid_amount", 0))
    final_price = _to_decimal(getattr(order, "final_price", 0))
    base_price = _to_decimal(getattr(order, "price", 0))
    return float(max(paid_amount or final_price or base_price, Decimal("0")))

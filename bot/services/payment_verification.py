from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.order_events import OrderLifecycleEvent
from database.models.orders import (
    WORK_TYPE_LABELS,
    Order,
    OrderStatus,
    WorkType,
    canonicalize_order_status,
)


@dataclass
class PaymentVerificationContext:
    amount_to_pay: float
    payment_method: str | None = None
    payment_scheme: str | None = None
    payment_phase: str = "initial"
    is_batch: bool = False
    batch_orders_count: int = 0
    batch_total_amount: float = 0.0
    batch_order_ids: list[int] = field(default_factory=list)
    requested_at: str | None = None


def _as_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _as_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _as_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_order_ids(value: Any) -> list[int]:
    if not isinstance(value, (list, tuple, set)):
        return []

    order_ids: list[int] = []
    seen: set[int] = set()
    for item in value:
        try:
            order_id = int(item)
        except (TypeError, ValueError):
            continue
        if order_id in seen:
            continue
        seen.add(order_id)
        order_ids.append(order_id)
    return order_ids


def get_pending_verification_amount(order: Order) -> float:
    canonical_status = canonicalize_order_status(order.status) or order.status
    if canonical_status != OrderStatus.VERIFICATION_PENDING.value or not order.final_price:
        return 0.0

    final_price = Decimal(str(order.final_price or 0))
    paid_amount = Decimal(str(order.paid_amount or 0))
    remaining = max(final_price - paid_amount, Decimal("0"))

    if remaining <= 0:
        return 0.0
    if paid_amount > 0:
        return float(remaining)
    if str(getattr(order, "payment_scheme", "") or "").lower() == "half":
        return float(final_price / Decimal("2"))
    return float(remaining)


def get_payment_phase(order: Order) -> str:
    pending_amount = get_pending_verification_amount(order)
    if Decimal(str(order.paid_amount or 0)) > 0 and pending_amount > 0:
        return "final"
    return "initial"


def get_work_type_label(order: Order) -> str:
    try:
        return WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)
    except Exception:
        return getattr(order, "work_type_label", None) or order.work_type or "—"


def build_payment_verification_context(
    order: Order,
    lifecycle_event: OrderLifecycleEvent | None = None,
) -> PaymentVerificationContext | None:
    canonical_status = canonicalize_order_status(order.status) or order.status
    if canonical_status != OrderStatus.VERIFICATION_PENDING.value:
        return None

    payload = lifecycle_event.payload if isinstance(getattr(lifecycle_event, "payload", None), dict) else {}
    dispatch = payload.get("dispatch") if isinstance(payload.get("dispatch"), dict) else {}
    extra_data = dispatch.get("notification_extra_data") if isinstance(dispatch.get("notification_extra_data"), dict) else {}

    amount_to_pay = _as_float(extra_data.get("amount_to_pay")) or get_pending_verification_amount(order)
    payment_method = _as_string(extra_data.get("payment_method")) or _as_string(getattr(order, "payment_method", None))
    payment_scheme = _as_string(extra_data.get("payment_scheme")) or _as_string(getattr(order, "payment_scheme", None))
    payment_phase = _as_string(extra_data.get("payment_phase")) or get_payment_phase(order)
    batch_order_ids = _normalize_order_ids(extra_data.get("batch_order_ids") or extra_data.get("related_order_ids"))
    is_batch = bool(extra_data.get("is_batch") or len(batch_order_ids) > 1)
    batch_orders_count = _as_int(extra_data.get("batch_orders_count")) or len(batch_order_ids)
    batch_total_amount = _as_float(extra_data.get("batch_total_amount"))

    if is_batch and not batch_order_ids and getattr(order, "id", None) is not None:
        batch_order_ids = [int(order.id)]
    if is_batch and batch_orders_count <= 0:
        batch_orders_count = len(batch_order_ids) or 1
    if not is_batch:
        batch_orders_count = len(batch_order_ids) or 0
    if not is_batch and batch_total_amount <= 0:
        batch_total_amount = amount_to_pay

    requested_at = lifecycle_event.created_at.isoformat() if getattr(lifecycle_event, "created_at", None) else None

    return PaymentVerificationContext(
        amount_to_pay=round(amount_to_pay, 2),
        payment_method=payment_method,
        payment_scheme=payment_scheme,
        payment_phase=payment_phase,
        is_batch=is_batch,
        batch_orders_count=batch_orders_count,
        batch_total_amount=round(batch_total_amount, 2),
        batch_order_ids=batch_order_ids,
        requested_at=requested_at,
    )


async def get_payment_verification_contexts(
    session: AsyncSession,
    orders: list[Order],
) -> dict[int, PaymentVerificationContext]:
    if not orders:
        return {}

    orders_by_id = {order.id: order for order in orders if getattr(order, "id", None) is not None}
    if not orders_by_id:
        return {}

    result = await session.execute(
        select(OrderLifecycleEvent)
        .where(
            OrderLifecycleEvent.order_id.in_(list(orders_by_id.keys())),
            OrderLifecycleEvent.status_to == OrderStatus.VERIFICATION_PENDING.value,
        )
        .order_by(OrderLifecycleEvent.created_at.desc(), OrderLifecycleEvent.id.desc())
    )
    latest_events: dict[int, OrderLifecycleEvent] = {}
    for event in result.scalars().all():
        latest_events.setdefault(event.order_id, event)

    contexts: dict[int, PaymentVerificationContext] = {}
    for order_id, order in orders_by_id.items():
        context = build_payment_verification_context(order, latest_events.get(order_id))
        if context:
            contexts[order_id] = context
    return contexts


async def get_batch_payment_review_items(
    session: AsyncSession,
    batch_order_ids: list[int],
) -> list[dict[str, Any]]:
    normalized_ids = _normalize_order_ids(batch_order_ids)
    if not normalized_ids:
        return []

    result = await session.execute(select(Order).where(Order.id.in_(normalized_ids)))
    orders = result.scalars().all()
    orders_by_id = {order.id: order for order in orders}
    ordered_orders = [orders_by_id[order_id] for order_id in normalized_ids if order_id in orders_by_id]
    contexts = await get_payment_verification_contexts(session, ordered_orders)

    items: list[dict[str, Any]] = []
    for order in ordered_orders:
        context = contexts.get(order.id)
        items.append(
            {
                "id": order.id,
                "status": canonicalize_order_status(order.status) or order.status,
                "work_type_label": get_work_type_label(order),
                "subject": order.subject,
                "topic": order.topic,
                "amount_to_pay": round(context.amount_to_pay if context else get_pending_verification_amount(order), 2),
                "payment_phase": context.payment_phase if context else get_payment_phase(order),
            }
        )
    return items

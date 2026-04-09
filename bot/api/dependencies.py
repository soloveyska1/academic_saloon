from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from database.models.levels import RankLevel, LoyaltyLevel
from database.models.orders import Order, OrderStatus, WorkType, WORK_TYPE_LABELS, canonicalize_order_status
from bot.services.order_pause import can_pause_order, get_pause_available_days
from .schemas import (
    LoyaltyInfo,
    OrderDeliveryBatchResponse,
    OrderResponse,
    OrderRevisionRoundResponse,
    RankInfo,
)
from .cache import get_cached_rank_levels, get_cached_loyalty_levels
from core.ranks import RANK_TIERS

KNOWN_ORDER_STATUSES = {status.value for status in OrderStatus}
KNOWN_WORK_TYPES = {work_type.value for work_type in WorkType}


def _normalize_text(value) -> str | None:
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    return None


def _normalize_enum_value(value, valid_values: set[str], fallback: str) -> str:
    raw = value.value if hasattr(value, 'value') else value
    if raw is None:
        return fallback
    normalized = str(raw).strip().lower()
    return normalized if normalized in valid_values else fallback


def _normalize_optional_iso(value) -> str | None:
    if value is None or not hasattr(value, 'isoformat'):
        return None
    return value.isoformat()

async def get_rank_levels(session: AsyncSession) -> list[RankLevel]:
    """Get rank levels with caching (5 minute TTL)"""
    return await get_cached_rank_levels(session)

async def get_loyalty_levels(session: AsyncSession) -> list[LoyaltyLevel]:
    """Get loyalty levels with caching (5 minute TTL)"""
    return await get_cached_loyalty_levels(session)

def get_rank_info(total_spent: float, rank_levels: list[RankLevel] = None) -> RankInfo:
    """Calculate user rank based on total spent. Uses core/ranks.py as source of truth."""
    tiers = RANK_TIERS

    current_level = 0
    for i, tier in enumerate(tiers):
        if total_spent >= tier.min_spent:
            current_level = i

    current = tiers[current_level]
    next_rank = tiers[current_level + 1] if current_level < len(tiers) - 1 else None

    progress = 100
    spent_to_next = 0
    is_max = next_rank is None
    if next_rank:
        progress_range = next_rank.min_spent - current.min_spent
        progress_current = total_spent - current.min_spent
        progress = min(100, int((progress_current / progress_range) * 100)) if progress_range else 100
        spent_to_next = max(0, int(next_rank.min_spent - total_spent))

    return RankInfo(
        name=current.name,
        emoji="",
        level=current_level + 1,
        cashback=current.cashback_percent,
        bonus=current.bonus,
        next_rank=next_rank.name if next_rank else None,
        progress=progress,
        spent_to_next=spent_to_next,
        is_max=is_max
    )

def get_loyalty_info(orders_count: int, loyalty_levels: list[LoyaltyLevel]) -> LoyaltyInfo:
    """Calculate user loyalty based on orders count"""
    current_level = 0
    for i, level in enumerate(loyalty_levels):
        if orders_count >= (level.min_orders or 0):
            current_level = i

    current = loyalty_levels[current_level] if loyalty_levels else None
    next_level = (
        loyalty_levels[current_level + 1]
        if loyalty_levels and current_level < len(loyalty_levels) - 1
        else None
    )

    orders_to_next = 0 if not next_level else max((next_level.min_orders or 0) - orders_count, 0)

    return LoyaltyInfo(
        status=current.name if current else "",
        emoji=current.emoji if current else "",
        level=current_level + 1,
        discount=current.discount_percent if current else 0,
        orders_to_next=orders_to_next
    )

def _normalize_delivery_batch(
    batch: OrderDeliveryBatchResponse | dict[str, object] | None,
) -> OrderDeliveryBatchResponse | None:
    if batch is None:
        return None
    if isinstance(batch, OrderDeliveryBatchResponse):
        return batch
    return OrderDeliveryBatchResponse(**batch)


def _normalize_revision_round(
    round_: OrderRevisionRoundResponse | dict[str, object] | None,
) -> OrderRevisionRoundResponse | None:
    if round_ is None:
        return None
    if isinstance(round_, OrderRevisionRoundResponse):
        return round_
    return OrderRevisionRoundResponse(**round_)


def order_to_response(
    order: Order,
    *,
    latest_delivery: OrderDeliveryBatchResponse | dict[str, object] | None = None,
    delivery_history: list[OrderDeliveryBatchResponse | dict[str, object]] | None = None,
    current_revision_round: OrderRevisionRoundResponse | dict[str, object] | None = None,
    revision_history: list[OrderRevisionRoundResponse | dict[str, object]] | None = None,
) -> OrderResponse:
    """Convert Order model to response schema"""
    raw_status = canonicalize_order_status(getattr(order, 'status', None))
    normalized_status = _normalize_enum_value(raw_status, KNOWN_ORDER_STATUSES, OrderStatus.PENDING.value)
    normalized_work_type = _normalize_enum_value(getattr(order, 'work_type', None), KNOWN_WORK_TYPES, WorkType.OTHER.value)
    final_price = order.final_price if getattr(order, 'final_price', None) is not None else (order.price or 0)
    paused_from_status = canonicalize_order_status(getattr(order, 'paused_from_status', None))
    normalized_paused_from_status = (
        _normalize_enum_value(paused_from_status, KNOWN_ORDER_STATUSES, OrderStatus.PENDING.value)
        if paused_from_status in KNOWN_ORDER_STATUSES
        else None
    )

    try:
        work_type_enum = WorkType(normalized_work_type)
        default_work_type_label = WORK_TYPE_LABELS.get(work_type_enum, 'Заказ')
    except ValueError:
        default_work_type_label = 'Заказ'

    payment_scheme_raw = getattr(order, 'payment_scheme', None)
    payment_scheme = payment_scheme_raw.value if hasattr(payment_scheme_raw, 'value') else payment_scheme_raw
    if payment_scheme not in {'full', 'half'}:
        payment_scheme = None

    return OrderResponse(
        id=order.id,
        status=normalized_status,
        work_type=normalized_work_type,
        work_type_label=_normalize_text(getattr(order, 'work_type_label', None)) or default_work_type_label,
        subject=_normalize_text(getattr(order, 'subject', None)),
        topic=_normalize_text(getattr(order, 'topic', None)),
        deadline=_normalize_text(getattr(order, 'deadline', None)),
        price=round(float(order.price or 0), 2),
        final_price=round(float(final_price or 0), 2),
        paid_amount=round(float(order.paid_amount or 0), 2),
        discount=round(float(order.discount or 0), 2),
        promo_code=_normalize_text(getattr(order, 'promo_code', None)),
        promo_discount=round(float(getattr(order, 'promo_discount', 0) or 0), 2),
        bonus_used=round(float(order.bonus_used or 0), 2),
        progress=max(0, min(100, int(order.progress or 0))),
        payment_scheme=payment_scheme,
        files_url=_normalize_text(getattr(order, 'files_url', None)),
        review_submitted=getattr(order, 'review_submitted', False),  # Whether review was submitted
        is_archived=getattr(order, 'is_archived', False),  # Whether order is archived
        revision_count=getattr(order, 'revision_count', 0) or 0,
        paused_from_status=normalized_paused_from_status,
        pause_started_at=_normalize_optional_iso(getattr(order, 'pause_started_at', None)),
        pause_until=_normalize_optional_iso(getattr(order, 'pause_until', None)),
        pause_reason=_normalize_text(getattr(order, 'pause_reason', None)),
        pause_days_used=max(0, int(getattr(order, 'pause_days_used', 0) or 0)),
        pause_available_days=get_pause_available_days(order),
        can_pause=can_pause_order(order),
        can_resume=normalized_status == OrderStatus.PAUSED.value,
        created_at=order.created_at.isoformat() if order.created_at else "",
        updated_at=_normalize_optional_iso(getattr(order, 'updated_at', None)),
        completed_at=_normalize_optional_iso(getattr(order, 'completed_at', None)),
        delivered_at=_normalize_optional_iso(getattr(order, 'delivered_at', None)),
        latest_delivery=_normalize_delivery_batch(latest_delivery),
        delivery_history=[
            normalized
            for normalized in (
                _normalize_delivery_batch(item)
                for item in (delivery_history or [])
            )
            if normalized is not None
        ],
        current_revision_round=_normalize_revision_round(current_revision_round),
        revision_history=[
            normalized
            for normalized in (
                _normalize_revision_round(item)
                for item in (revision_history or [])
            )
            if normalized is not None
        ],
    )

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.orders import Order, OrderRevisionRound, OrderRevisionRoundStatus

MSK_TZ = ZoneInfo("Europe/Moscow")


def _extract_first_scalar(result: Any) -> Any | None:
    scalars = result.scalars()
    first = getattr(scalars, "first", None)
    if callable(first):
        return first()
    all_items = getattr(scalars, "all", None)
    if callable(all_items):
        items = all_items()
        return items[0] if items else None
    scalar_one_or_none = getattr(result, "scalar_one_or_none", None)
    if callable(scalar_one_or_none):
        return scalar_one_or_none()
    return None


def _normalize_comment(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _get_next_round_number(order: Order, max_round_number: int | None) -> int:
    return max(int(max_round_number or 0), int(order.revision_count or 0)) + 1


@dataclass
class RevisionRoundBindingResult:
    revision_round: OrderRevisionRound
    created: bool


async def get_current_revision_round(
    session: AsyncSession,
    order_id: int,
) -> OrderRevisionRound | None:
    result = await session.execute(
        select(OrderRevisionRound)
        .where(
            OrderRevisionRound.order_id == order_id,
            OrderRevisionRound.status == OrderRevisionRoundStatus.OPEN.value,
        )
        .order_by(OrderRevisionRound.round_number.desc(), OrderRevisionRound.id.desc())
        .limit(1)
    )
    return _extract_first_scalar(result)


async def get_revision_round_history(
    session: AsyncSession,
    order_id: int,
    *,
    limit: int = 10,
) -> list[OrderRevisionRound]:
    result = await session.execute(
        select(OrderRevisionRound)
        .where(OrderRevisionRound.order_id == order_id)
        .order_by(OrderRevisionRound.round_number.desc(), OrderRevisionRound.id.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def bind_order_to_revision_round(
    session: AsyncSession,
    order: Order,
    *,
    requested_by_user_id: int | None,
    initial_comment: str | None = None,
    create_if_missing: bool = True,
    activity_at: datetime | None = None,
) -> RevisionRoundBindingResult | None:
    revision_round = await get_current_revision_round(session, order.id)
    if revision_round is not None:
        await touch_revision_round_activity(
            session,
            revision_round,
            activity_at=activity_at,
            latest_comment=initial_comment,
        )
        return RevisionRoundBindingResult(revision_round=revision_round, created=False)

    if not create_if_missing:
        return None

    max_round_result = await session.execute(
        select(func.max(OrderRevisionRound.round_number)).where(OrderRevisionRound.order_id == order.id)
    )
    max_round_number = _extract_first_scalar(max_round_result)
    revision_round = OrderRevisionRound(
        order_id=order.id,
        round_number=_get_next_round_number(order, int(max_round_number or 0)),
        status=OrderRevisionRoundStatus.OPEN.value,
        initial_comment=_normalize_comment(initial_comment),
        requested_by_user_id=requested_by_user_id,
        last_client_activity_at=activity_at or datetime.now(MSK_TZ),
    )
    session.add(revision_round)
    flush = getattr(session, "flush", None)
    if callable(flush):
        await flush()
    return RevisionRoundBindingResult(revision_round=revision_round, created=True)


async def touch_revision_round_activity(
    session: AsyncSession,
    revision_round: OrderRevisionRound,
    *,
    activity_at: datetime | None = None,
    latest_comment: str | None = None,
) -> OrderRevisionRound:
    revision_round.last_client_activity_at = activity_at or datetime.now(MSK_TZ)
    normalized_comment = _normalize_comment(latest_comment)
    if normalized_comment and not revision_round.initial_comment:
        revision_round.initial_comment = normalized_comment
    return revision_round


async def close_current_revision_round(
    session: AsyncSession,
    order_id: int,
    *,
    delivery_batch_id: int | None = None,
    closed_at: datetime | None = None,
) -> OrderRevisionRound | None:
    revision_round = await get_current_revision_round(session, order_id)
    if revision_round is None:
        return None

    revision_round.status = OrderRevisionRoundStatus.FULFILLED.value
    revision_round.closed_at = closed_at or datetime.now(MSK_TZ)
    revision_round.closed_by_delivery_batch_id = delivery_batch_id
    return revision_round


def serialize_revision_round(round_: OrderRevisionRound) -> dict[str, object]:
    return {
        "id": round_.id,
        "round_number": int(round_.round_number or 0),
        "status": round_.status,
        "initial_comment": round_.initial_comment,
        "requested_at": round_.requested_at.isoformat() if round_.requested_at else None,
        "last_client_activity_at": round_.last_client_activity_at.isoformat() if round_.last_client_activity_at else None,
        "closed_at": round_.closed_at.isoformat() if round_.closed_at else None,
        "closed_by_delivery_batch_id": round_.closed_by_delivery_batch_id,
        "requested_by_user_id": round_.requested_by_user_id,
    }

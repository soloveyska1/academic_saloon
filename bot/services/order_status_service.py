from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.services.bonus import BonusService
from bot.services.order_lifecycle import get_order_cashback_base
from database.models.order_events import (
    OrderLifecycleDispatchStatus,
    OrderLifecycleEvent,
    OrderLifecycleEventType,
)
from database.models.orders import Order, OrderStatus, canonicalize_order_status, is_valid_transition

logger = logging.getLogger(__name__)
MSK_TZ = ZoneInfo("Europe/Moscow")
ORDER_EVENT_SURFACE_LIVE_CARD = "live_card"
ORDER_EVENT_SURFACE_CLOSE_TOPIC = "close_topic"
ORDER_EVENT_SURFACE_NOTIFY_USER = "notify_user"
ORDER_EVENT_SURFACE_ACHIEVEMENTS = "achievements"


class OrderStatusTransitionError(ValueError):
    """Raised when an order status change violates the lifecycle."""


@dataclass
class OrderStatusChangeResult:
    old_status: str
    new_status: str
    changed: bool
    cashback_amount: float = 0.0
    bonus_refunded_amount: float = 0.0
    promo_returned: bool = False
    achievement_sync_required: bool = False


@dataclass
class OrderStatusDispatchOptions:
    notify_user: bool = True
    notification_extra_data: dict[str, Any] | None = None
    update_live_card: bool = False
    client_username: str | None = None
    client_name: str | None = None
    yadisk_link: str | None = None
    card_extra_text: str | None = None
    close_topic: bool = False


@dataclass
class OrderStatusDispatchResult:
    live_card_updated: bool = False
    topic_closed: bool = False
    user_notified: bool = False
    achievements_synced: bool = False
    errors: dict[str, str] = field(default_factory=dict)

    @property
    def successful(self) -> bool:
        return not self.errors

    def completed_surfaces(self) -> set[str]:
        completed: set[str] = set()
        if self.live_card_updated:
            completed.add(ORDER_EVENT_SURFACE_LIVE_CARD)
        if self.topic_closed:
            completed.add(ORDER_EVENT_SURFACE_CLOSE_TOPIC)
        if self.user_notified:
            completed.add(ORDER_EVENT_SURFACE_NOTIFY_USER)
        if self.achievements_synced:
            completed.add(ORDER_EVENT_SURFACE_ACHIEVEMENTS)
        return completed


@dataclass
class OrderLifecycleReplaySummary:
    processed: int = 0
    dispatched: int = 0
    failed: int = 0
    skipped: int = 0


def _build_notification_extra_data(
    result: OrderStatusChangeResult,
    dispatch: OrderStatusDispatchOptions,
) -> dict[str, Any] | None:
    extra_data = dict(dispatch.notification_extra_data or {})
    if result.cashback_amount > 0 and "cashback" not in extra_data:
        extra_data["cashback"] = result.cashback_amount
    if result.bonus_refunded_amount > 0 and "bonus_refunded_amount" not in extra_data:
        extra_data["bonus_refunded_amount"] = result.bonus_refunded_amount
    if result.promo_returned and "promo_returned" not in extra_data:
        extra_data["promo_returned"] = True
    return extra_data or None


def _serialize_dispatch_options(
    dispatch: OrderStatusDispatchOptions,
    result: OrderStatusChangeResult,
) -> dict[str, Any]:
    return {
        "notify_user": dispatch.notify_user,
        "notification_extra_data": _build_notification_extra_data(result, dispatch),
        "update_live_card": dispatch.update_live_card,
        "client_username": dispatch.client_username,
        "client_name": dispatch.client_name,
        "yadisk_link": dispatch.yadisk_link,
        "card_extra_text": dispatch.card_extra_text,
        "close_topic": dispatch.close_topic,
    }


def _format_dispatch_errors(errors: dict[str, str]) -> str | None:
    if not errors:
        return None
    return "; ".join(f"{surface}: {message}" for surface, message in errors.items())


def _get_completed_surfaces(payload: dict[str, Any] | None) -> set[str]:
    if not isinstance(payload, dict):
        return set()
    dispatch_state = payload.get("dispatch_state")
    if not isinstance(dispatch_state, dict):
        return set()
    completed_surfaces = dispatch_state.get("completed_surfaces")
    if not isinstance(completed_surfaces, list):
        return set()
    return {str(surface) for surface in completed_surfaces if surface}


def _update_event_payload_dispatch_state(
    payload: dict[str, Any] | None,
    completed_surfaces: set[str],
) -> dict[str, Any]:
    next_payload = dict(payload or {})
    dispatch_state = dict(next_payload.get("dispatch_state") or {})
    dispatch_state["completed_surfaces"] = sorted(completed_surfaces)
    next_payload["dispatch_state"] = dispatch_state
    return next_payload


def _build_result_from_event(event: OrderLifecycleEvent) -> OrderStatusChangeResult:
    payload = event.payload or {}
    return OrderStatusChangeResult(
        old_status=event.status_from,
        new_status=event.status_to,
        changed=True,
        cashback_amount=float(payload.get("cashback_amount") or 0.0),
        bonus_refunded_amount=float(payload.get("bonus_refunded_amount") or 0.0),
        promo_returned=bool(payload.get("promo_returned")),
        achievement_sync_required=bool(payload.get("achievement_sync_required")),
    )


def _build_dispatch_options_from_event(event: OrderLifecycleEvent) -> OrderStatusDispatchOptions:
    payload = event.payload or {}
    dispatch = payload.get("dispatch")
    if not isinstance(dispatch, dict):
        return OrderStatusDispatchOptions()
    return OrderStatusDispatchOptions(
        notify_user=bool(dispatch.get("notify_user", True)),
        notification_extra_data=dispatch.get("notification_extra_data"),
        update_live_card=bool(dispatch.get("update_live_card", False)),
        client_username=dispatch.get("client_username"),
        client_name=dispatch.get("client_name"),
        yadisk_link=dispatch.get("yadisk_link"),
        card_extra_text=dispatch.get("card_extra_text"),
        close_topic=bool(dispatch.get("close_topic", False)),
    )


def apply_order_status_transition(
    order: Order,
    new_status: str,
    *,
    force: bool = False,
    now: datetime | None = None,
) -> OrderStatusChangeResult:
    requested_status = new_status.strip().lower()
    normalized_status = canonicalize_order_status(requested_status) or requested_status
    old_status = order.status
    canonical_old_status = canonicalize_order_status(old_status) or old_status

    if normalized_status == canonical_old_status:
        if old_status != normalized_status:
            order.status = normalized_status
            return OrderStatusChangeResult(
                old_status=old_status,
                new_status=normalized_status,
                changed=True,
            )
        return OrderStatusChangeResult(
            old_status=old_status,
            new_status=normalized_status,
            changed=False,
        )

    if not force and not is_valid_transition(old_status, normalized_status):
        raise OrderStatusTransitionError(
            f"Недопустимый переход статуса: {old_status} -> {normalized_status}"
        )

    order.status = normalized_status

    transition_time = now or datetime.now(MSK_TZ)
    if normalized_status == OrderStatus.COMPLETED.value:
        if not order.completed_at:
            order.completed_at = transition_time
    elif old_status == OrderStatus.COMPLETED.value:
        order.completed_at = None

    return OrderStatusChangeResult(
        old_status=old_status,
        new_status=normalized_status,
        changed=True,
    )


async def apply_order_status_side_effects(
    session: AsyncSession,
    bot: Bot | None,
    order: Order,
    result: OrderStatusChangeResult,
) -> OrderStatusChangeResult:
    if not result.changed:
        return result

    if result.new_status == OrderStatus.COMPLETED.value and result.old_status != OrderStatus.COMPLETED.value:
        result.achievement_sync_required = True
        try:
            result.cashback_amount = await BonusService.add_order_cashback(
                session=session,
                bot=bot,
                user_id=order.user_id,
                order_id=order.id,
                order_amount=get_order_cashback_base(order),
                auto_commit=False,
                sync_achievements=False,
            )
        except Exception as exc:
            logger.warning(f"[OrderStatus] Cashback error for order #{order.id}: {exc}")

    if (
        result.new_status in {OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value}
        and result.old_status not in {OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value}
        and getattr(order, "bonus_used", 0)
    ):
        try:
            result.bonus_refunded_amount = await BonusService.refund_order_discount_if_deducted(
                session=session,
                bot=bot,
                user_id=order.user_id,
                order_id=order.id,
                amount=order.bonus_used,
            )
        except Exception as exc:
            logger.warning(f"[OrderStatus] Bonus refund error for order #{order.id}: {exc}")

    if (
        result.new_status in {OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value}
        and result.old_status not in {OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value}
        and order.promo_code
    ):
        try:
            from bot.services.promo_service import PromoService

            success, message = await PromoService.return_promo_usage(session, order.id, bot=bot)
            result.promo_returned = success
            if not success:
                logger.warning(f"[OrderStatus] Promo return failed for order #{order.id}: {message}")
        except Exception as exc:
            logger.warning(f"[OrderStatus] Promo return error for order #{order.id}: {exc}")

    return result


async def dispatch_order_status_change(
    session: AsyncSession,
    bot: Bot | None,
    order: Order,
    result: OrderStatusChangeResult,
    *,
    options: OrderStatusDispatchOptions | None = None,
    completed_surfaces: set[str] | None = None,
) -> OrderStatusDispatchResult:
    """Fan out a committed status change to user/admin surfaces."""
    dispatch_result = OrderStatusDispatchResult()
    if not result.changed:
        return dispatch_result

    dispatch = options or OrderStatusDispatchOptions()
    already_completed = completed_surfaces or set()

    if (
        dispatch.update_live_card
        and bot is not None
        and ORDER_EVENT_SURFACE_LIVE_CARD not in already_completed
    ):
        try:
            from bot.services.live_cards import update_live_card

            await update_live_card(
                bot=bot,
                session=session,
                order=order,
                client_username=dispatch.client_username,
                client_name=dispatch.client_name,
                yadisk_link=dispatch.yadisk_link,
                extra_text=dispatch.card_extra_text,
            )
            dispatch_result.live_card_updated = True
        except Exception as exc:
            logger.warning(f"[OrderStatus] Live card sync failed for order #{order.id}: {exc}")
            dispatch_result.errors["live_card"] = str(exc)

    if (
        dispatch.close_topic
        and bot is not None
        and ORDER_EVENT_SURFACE_CLOSE_TOPIC not in already_completed
    ):
        try:
            from bot.services.unified_hub import close_order_topic

            await close_order_topic(bot, session, order)
            dispatch_result.topic_closed = True
        except Exception as exc:
            logger.warning(f"[OrderStatus] Topic close failed for order #{order.id}: {exc}")
            dispatch_result.errors["close_topic"] = str(exc)

    if dispatch.notify_user and ORDER_EVENT_SURFACE_NOTIFY_USER not in already_completed:
        try:
            from bot.services.realtime_notifications import send_order_status_notification

            await send_order_status_notification(
                telegram_id=order.user_id,
                order_id=order.id,
                new_status=result.new_status,
                old_status=result.old_status,
                extra_data=_build_notification_extra_data(result, dispatch),
            )
            dispatch_result.user_notified = True
        except Exception as exc:
            logger.warning(f"[OrderStatus] User notification failed for order #{order.id}: {exc}")
            dispatch_result.errors["notify_user"] = str(exc)

    if (
        result.achievement_sync_required
        and ORDER_EVENT_SURFACE_ACHIEVEMENTS not in already_completed
    ):
        try:
            from bot.services.achievements import sync_user_achievements

            await sync_user_achievements(
                session=session,
                telegram_id=order.user_id,
                bot=bot,
                notify=True,
            )
            dispatch_result.achievements_synced = True
        except Exception as exc:
            logger.warning(f"[OrderStatus] Achievement sync failed for order #{order.id}: {exc}")
            dispatch_result.errors["achievements"] = str(exc)

    return dispatch_result


async def replay_order_lifecycle_event(
    session: AsyncSession,
    bot: Bot | None,
    lifecycle_event: OrderLifecycleEvent,
) -> OrderStatusDispatchResult | None:
    if lifecycle_event.event_type == OrderLifecycleEventType.DELIVERY_SENT.value:
        from bot.services.order_delivery_service import replay_order_delivery_event

        return await replay_order_delivery_event(session, bot, lifecycle_event)

    order = await session.get(Order, lifecycle_event.order_id)
    if order is None:
        lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
        lifecycle_event.last_error = "order_not_found"
        await session.commit()
        return None

    completed_surfaces = _get_completed_surfaces(lifecycle_event.payload)
    result = _build_result_from_event(lifecycle_event)
    dispatch_options = _build_dispatch_options_from_event(lifecycle_event)

    dispatch_result = await dispatch_order_status_change(
        session=session,
        bot=bot,
        order=order,
        result=result,
        options=dispatch_options,
        completed_surfaces=completed_surfaces,
    )

    lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
    completed_surfaces |= dispatch_result.completed_surfaces()
    lifecycle_event.payload = _update_event_payload_dispatch_state(
        lifecycle_event.payload,
        completed_surfaces,
    )
    lifecycle_event.last_error = _format_dispatch_errors(dispatch_result.errors)
    if dispatch_result.successful:
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.DISPATCHED.value
        lifecycle_event.dispatched_at = datetime.now(MSK_TZ)
    else:
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
    await session.commit()
    return dispatch_result


async def replay_pending_order_lifecycle_events(
    session: AsyncSession,
    bot: Bot | None,
    *,
    limit: int = 25,
) -> OrderLifecycleReplaySummary:
    summary = OrderLifecycleReplaySummary()
    result = await session.execute(
        select(OrderLifecycleEvent)
        .where(
            OrderLifecycleEvent.dispatch_status.in_(
                [
                    OrderLifecycleDispatchStatus.PENDING.value,
                    OrderLifecycleDispatchStatus.FAILED.value,
                ]
            )
        )
        .order_by(OrderLifecycleEvent.created_at.asc(), OrderLifecycleEvent.id.asc())
        .limit(limit)
    )
    events = result.scalars().all()

    for lifecycle_event in events:
        summary.processed += 1
        dispatch_result = await replay_order_lifecycle_event(session, bot, lifecycle_event)
        if dispatch_result is None:
            summary.failed += 1
            continue
        if dispatch_result.successful:
            summary.dispatched += 1
        else:
            summary.failed += 1

    return summary


async def finalize_order_status_change(
    session: AsyncSession,
    bot: Bot | None,
    order: Order,
    result: OrderStatusChangeResult,
    *,
    dispatch: OrderStatusDispatchOptions | None = None,
) -> OrderStatusChangeResult:
    """Apply DB side effects, persist a lifecycle event, then fan out the change."""
    dispatch_options = dispatch or OrderStatusDispatchOptions()
    result = await apply_order_status_side_effects(session, bot, order, result)
    lifecycle_event = OrderLifecycleEvent(
        order_id=order.id,
        user_id=order.user_id,
        event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
        status_from=result.old_status,
        status_to=result.new_status,
        payload={
            "cashback_amount": result.cashback_amount,
            "bonus_refunded_amount": result.bonus_refunded_amount,
            "promo_returned": result.promo_returned,
            "achievement_sync_required": result.achievement_sync_required,
            "dispatch": _serialize_dispatch_options(dispatch_options, result),
            "dispatch_state": {"completed_surfaces": []},
        },
        dispatch_status=OrderLifecycleDispatchStatus.PENDING.value,
        dispatch_attempts=0,
    )
    session.add(lifecycle_event)
    await session.commit()

    try:
        dispatch_result = await dispatch_order_status_change(
            session,
            bot,
            order,
            result,
            options=dispatch_options,
        )
    except Exception as exc:
        logger.exception("[OrderStatus] Dispatch crashed for order #%s", order.id)
        lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
        lifecycle_event.last_error = str(exc)
        await session.commit()
        return result

    lifecycle_event.dispatch_attempts = (lifecycle_event.dispatch_attempts or 0) + 1
    completed_surfaces = dispatch_result.completed_surfaces()
    lifecycle_event.payload = _update_event_payload_dispatch_state(
        lifecycle_event.payload,
        completed_surfaces,
    )
    lifecycle_event.last_error = _format_dispatch_errors(dispatch_result.errors)
    if dispatch_result.successful:
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.DISPATCHED.value
        lifecycle_event.dispatched_at = datetime.now(MSK_TZ)
    else:
        lifecycle_event.dispatch_status = OrderLifecycleDispatchStatus.FAILED.value
    await session.commit()
    return result

from __future__ import annotations

import pytest

from bot.services.order_status_service import (
    ORDER_EVENT_SURFACE_ACHIEVEMENTS,
    ORDER_EVENT_SURFACE_CLOSE_TOPIC,
    ORDER_EVENT_SURFACE_LIVE_CARD,
    ORDER_EVENT_SURFACE_NOTIFY_USER,
    OrderLifecycleReplaySummary,
    OrderStatusChangeResult,
    OrderStatusDispatchOptions,
    OrderStatusDispatchResult,
    OrderStatusTransitionError,
    apply_order_status_side_effects,
    apply_order_status_transition,
    dispatch_order_status_change,
    finalize_order_status_change,
    replay_order_lifecycle_event,
    replay_pending_order_lifecycle_events,
)
from database.models.order_events import (
    OrderLifecycleDispatchStatus,
    OrderLifecycleEvent,
    OrderLifecycleEventType,
)
from database.models.orders import Order, OrderStatus, is_valid_transition


def make_order(
    *,
    order_id: int = 42,
    status: str = OrderStatus.PENDING.value,
    promo_code: str | None = None,
    bonus_used: float = 0.0,
) -> Order:
    order = Order(
        user_id=123456789,
        work_type="essay",
        subject="Тест",
        status=status,
        promo_code=promo_code,
        bonus_used=bonus_used,
        price=10000,
        paid_amount=5000,
    )
    order.id = order_id
    return order


def test_apply_order_status_transition_sets_and_clears_completed_at():
    order = make_order(status=OrderStatus.REVIEW.value)

    completed = apply_order_status_transition(order, OrderStatus.COMPLETED.value)
    assert completed.changed is True
    assert completed.old_status == OrderStatus.REVIEW.value
    assert completed.new_status == OrderStatus.COMPLETED.value
    assert order.completed_at is not None

    reopened = apply_order_status_transition(order, OrderStatus.PENDING.value, force=True)
    assert reopened.changed is True
    assert reopened.old_status == OrderStatus.COMPLETED.value
    assert reopened.new_status == OrderStatus.PENDING.value
    assert order.completed_at is None


def test_apply_order_status_transition_rejects_invalid_change():
    order = make_order(status=OrderStatus.PENDING.value)

    with pytest.raises(OrderStatusTransitionError):
        apply_order_status_transition(order, OrderStatus.COMPLETED.value)


def test_state_machine_allows_followup_payment_verification():
    assert is_valid_transition(OrderStatus.DRAFT.value, OrderStatus.WAITING_ESTIMATION.value) is True
    assert is_valid_transition(OrderStatus.WAITING_ESTIMATION.value, OrderStatus.WAITING_PAYMENT.value) is True
    assert is_valid_transition(OrderStatus.WAITING_PAYMENT.value, OrderStatus.VERIFICATION_PENDING.value) is True
    assert is_valid_transition(OrderStatus.WAITING_PAYMENT.value, OrderStatus.PAID.value) is True
    assert is_valid_transition(OrderStatus.WAITING_PAYMENT.value, OrderStatus.PAID_FULL.value) is True
    assert is_valid_transition(OrderStatus.PAID.value, OrderStatus.VERIFICATION_PENDING.value) is True
    assert is_valid_transition(OrderStatus.IN_PROGRESS.value, OrderStatus.VERIFICATION_PENDING.value) is True
    assert is_valid_transition(OrderStatus.REVIEW.value, OrderStatus.VERIFICATION_PENDING.value) is True


@pytest.mark.asyncio
async def test_apply_order_status_side_effects_adds_cashback(monkeypatch):
    order = make_order(status=OrderStatus.REVIEW.value)
    change = apply_order_status_transition(order, OrderStatus.COMPLETED.value)
    cashback_calls: list[tuple[int, int, float, bool, bool]] = []

    async def fake_add_order_cashback(
        *,
        session,
        bot,
        user_id,
        order_id,
        order_amount,
        auto_commit,
        sync_achievements,
    ):
        cashback_calls.append((user_id, order_id, order_amount, auto_commit, sync_achievements))
        return 250.0

    monkeypatch.setattr("bot.services.bonus.BonusService.add_order_cashback", fake_add_order_cashback)

    result = await apply_order_status_side_effects(object(), None, order, change)

    assert result.cashback_amount == 250.0
    assert result.achievement_sync_required is True
    assert cashback_calls == [(order.user_id, order.id, 5000.0, False, False)]


@pytest.mark.asyncio
async def test_apply_order_status_side_effects_marks_achievement_sync_without_cashback(monkeypatch):
    order = make_order(status=OrderStatus.REVIEW.value)
    change = apply_order_status_transition(order, OrderStatus.COMPLETED.value)

    async def fake_add_order_cashback(
        *,
        session,
        bot,
        user_id,
        order_id,
        order_amount,
        auto_commit,
        sync_achievements,
    ):
        return 0.0

    monkeypatch.setattr("bot.services.bonus.BonusService.add_order_cashback", fake_add_order_cashback)

    result = await apply_order_status_side_effects(object(), None, order, change)

    assert result.cashback_amount == 0.0
    assert result.achievement_sync_required is True


@pytest.mark.asyncio
async def test_apply_order_status_side_effects_returns_promo(monkeypatch):
    order = make_order(status=OrderStatus.PENDING.value, promo_code="SPRING")
    change = apply_order_status_transition(order, OrderStatus.CANCELLED.value)
    promo_calls: list[int] = []

    async def fake_return_promo_usage(session, order_id: int, bot=None):
        promo_calls.append(order_id)
        return True, "ok"

    monkeypatch.setattr("bot.services.promo_service.PromoService.return_promo_usage", fake_return_promo_usage)

    result = await apply_order_status_side_effects(object(), None, order, change)

    assert result.promo_returned is True
    assert promo_calls == [order.id]


@pytest.mark.asyncio
async def test_apply_order_status_side_effects_refunds_deducted_bonus(monkeypatch):
    order = make_order(
        status=OrderStatus.WAITING_PAYMENT.value,
        bonus_used=350,
    )
    change = apply_order_status_transition(order, OrderStatus.CANCELLED.value)
    refund_calls: list[tuple[int, int, float]] = []

    async def fake_refund_order_discount_if_deducted(*, session, bot, user_id, order_id, amount):
        refund_calls.append((user_id, order_id, amount))
        return 350.0

    monkeypatch.setattr(
        "bot.services.bonus.BonusService.refund_order_discount_if_deducted",
        fake_refund_order_discount_if_deducted,
    )

    result = await apply_order_status_side_effects(object(), None, order, change)

    assert result.bonus_refunded_amount == 350.0
    assert refund_calls == [(order.user_id, order.id, 350)]


@pytest.mark.asyncio
async def test_finalize_order_status_change_commits_and_dispatches(monkeypatch):
    order = make_order(status=OrderStatus.REVIEW.value)
    change = OrderStatusChangeResult(
        old_status=OrderStatus.REVIEW.value,
        new_status=OrderStatus.COMPLETED.value,
        changed=True,
        cashback_amount=250.0,
    )
    calls: list[tuple[str, tuple, dict]] = []

    class FakeSession:
        def __init__(self):
            self.commit_calls = 0
            self.added: list[object] = []

        def add(self, value):
            self.added.append(value)

        async def commit(self):
            self.commit_calls += 1

    session = FakeSession()

    async def fake_apply_side_effects(_session, _bot, _order, result):
        calls.append(("side_effects", (), {}))
        return result

    async def fake_update_live_card(*args, **kwargs):
        calls.append(("live_card", args, kwargs))
        return True

    async def fake_close_order_topic(*args, **kwargs):
        calls.append(("close_topic", args, kwargs))

    async def fake_send_notification(*args, **kwargs):
        calls.append(("notify", args, kwargs))

    async def fake_sync_user_achievements(*, session, telegram_id, bot=None, notify=False, auto_commit=True):
        calls.append(
            (
                "achievements",
                (),
                {
                    "session": session,
                    "telegram_id": telegram_id,
                    "bot": bot,
                    "notify": notify,
                    "auto_commit": auto_commit,
                },
            )
        )
        return []

    monkeypatch.setattr("bot.services.order_status_service.apply_order_status_side_effects", fake_apply_side_effects)
    monkeypatch.setattr("bot.services.live_cards.update_live_card", fake_update_live_card)
    monkeypatch.setattr("bot.services.unified_hub.close_order_topic", fake_close_order_topic)
    monkeypatch.setattr("bot.services.realtime_notifications.send_order_status_notification", fake_send_notification)
    monkeypatch.setattr("bot.services.achievements.sync_user_achievements", fake_sync_user_achievements)

    result = await finalize_order_status_change(
        session,
        object(),
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            close_topic=True,
            client_username="saloon",
            client_name="Academic Saloon",
            card_extra_text="done",
            notification_extra_data={"cashback": 250.0},
        ),
    )

    assert result is change
    assert session.commit_calls == 2
    assert len(session.added) == 1
    lifecycle_event = session.added[0]
    assert lifecycle_event.event_type == OrderLifecycleEventType.STATUS_CHANGED.value
    assert lifecycle_event.status_from == OrderStatus.REVIEW.value
    assert lifecycle_event.status_to == OrderStatus.COMPLETED.value
    assert lifecycle_event.dispatch_status == OrderLifecycleDispatchStatus.DISPATCHED.value
    assert lifecycle_event.dispatch_attempts == 1
    assert lifecycle_event.dispatched_at is not None
    assert set(lifecycle_event.payload["dispatch_state"]["completed_surfaces"]) == {
        ORDER_EVENT_SURFACE_LIVE_CARD,
        ORDER_EVENT_SURFACE_CLOSE_TOPIC,
        ORDER_EVENT_SURFACE_NOTIFY_USER,
    }
    assert [name for name, _args, _kwargs in calls] == [
        "side_effects",
        "live_card",
        "close_topic",
        "notify",
    ]
    assert calls[1][2]["client_username"] == "saloon"
    assert calls[1][2]["client_name"] == "Academic Saloon"
    assert calls[1][2]["extra_text"] == "done"
    assert calls[3][2] == {
        "telegram_id": order.user_id,
        "order_id": order.id,
        "new_status": OrderStatus.COMPLETED.value,
        "old_status": OrderStatus.REVIEW.value,
        "extra_data": {"cashback": 250.0},
    }


@pytest.mark.asyncio
async def test_dispatch_order_status_change_enriches_notification_payload(monkeypatch):
    order = make_order(status=OrderStatus.COMPLETED.value)
    result = OrderStatusChangeResult(
        old_status=OrderStatus.REVIEW.value,
        new_status=OrderStatus.COMPLETED.value,
        changed=True,
        cashback_amount=250.0,
        bonus_refunded_amount=100.0,
        promo_returned=True,
    )
    calls: list[tuple[str, tuple, dict]] = []

    async def fake_send_notification(*args, **kwargs):
        calls.append(("notify", args, kwargs))

    monkeypatch.setattr("bot.services.realtime_notifications.send_order_status_notification", fake_send_notification)

    await dispatch_order_status_change(
        session=object(),
        bot=object(),
        order=order,
        result=result,
        options=OrderStatusDispatchOptions(notify_user=True),
    )

    assert calls == [
        (
            "notify",
            (),
            {
                "telegram_id": order.user_id,
                "order_id": order.id,
                "new_status": OrderStatus.COMPLETED.value,
                "old_status": OrderStatus.REVIEW.value,
                "extra_data": {
                    "cashback": 250.0,
                    "bonus_refunded_amount": 100.0,
                    "promo_returned": True,
                },
            },
        )
    ]


@pytest.mark.asyncio
async def test_dispatch_order_status_change_syncs_achievements_after_commit(monkeypatch):
    order = make_order(status=OrderStatus.COMPLETED.value)
    result = OrderStatusChangeResult(
        old_status=OrderStatus.REVIEW.value,
        new_status=OrderStatus.COMPLETED.value,
        changed=True,
        achievement_sync_required=True,
    )
    achievement_calls: list[dict[str, object]] = []

    async def fake_sync_user_achievements(*, session, telegram_id, bot=None, notify=False, auto_commit=True):
        achievement_calls.append(
            {
                "session": session,
                "telegram_id": telegram_id,
                "bot": bot,
                "notify": notify,
                "auto_commit": auto_commit,
            }
        )
        return []

    monkeypatch.setattr("bot.services.achievements.sync_user_achievements", fake_sync_user_achievements)

    dispatch_result = await dispatch_order_status_change(
        session=object(),
        bot=None,
        order=order,
        result=result,
        options=OrderStatusDispatchOptions(notify_user=False),
    )

    assert isinstance(dispatch_result, OrderStatusDispatchResult)
    assert dispatch_result.achievements_synced is True
    assert dispatch_result.errors == {}
    assert len(achievement_calls) == 1
    assert achievement_calls[0]["telegram_id"] == order.user_id
    assert achievement_calls[0]["bot"] is None
    assert achievement_calls[0]["notify"] is True
    assert achievement_calls[0]["auto_commit"] is True


@pytest.mark.asyncio
async def test_update_live_card_refreshes_topic_name_and_card(monkeypatch):
    from bot.services.live_cards import update_live_card

    order = make_order(status=OrderStatus.PAID.value)
    calls: list[tuple[str, tuple, dict]] = []

    async def fake_update_topic_name(*args, **kwargs):
        calls.append(("topic", args, kwargs))

    async def fake_update_card_status(*args, **kwargs):
        calls.append(("card", args, kwargs))
        return True

    monkeypatch.setattr("bot.services.unified_hub.update_topic_name", fake_update_topic_name)
    monkeypatch.setattr("bot.services.live_cards.update_card_status", fake_update_card_status)

    result = await update_live_card(
        bot=object(),
        session=object(),
        order=order,
        client_username="saloon",
        client_name="Academic Saloon",
        extra_text="updated",
    )

    assert result is True
    assert [name for name, _args, _kwargs in calls] == ["topic", "card"]
    assert calls[1][2]["client_username"] == "saloon"
    assert calls[1][2]["client_name"] == "Academic Saloon"
    assert calls[1][2]["extra_text"] == "updated"


@pytest.mark.asyncio
async def test_replay_order_lifecycle_event_retries_only_incomplete_surfaces(monkeypatch):
    order = make_order(status=OrderStatus.COMPLETED.value)
    event = OrderLifecycleEvent(
        order_id=order.id,
        user_id=order.user_id,
        event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
        status_from=OrderStatus.REVIEW.value,
        status_to=OrderStatus.COMPLETED.value,
        payload={
            "cashback_amount": 250.0,
            "achievement_sync_required": True,
            "dispatch": {
                "notify_user": True,
                "notification_extra_data": {"cashback": 250.0},
                "update_live_card": True,
                "client_username": "saloon",
                "client_name": "Academic Saloon",
                "card_extra_text": "done",
                "close_topic": True,
            },
            "dispatch_state": {"completed_surfaces": [ORDER_EVENT_SURFACE_NOTIFY_USER]},
        },
        dispatch_status=OrderLifecycleDispatchStatus.FAILED.value,
        dispatch_attempts=1,
    )
    calls: list[tuple[str, tuple, dict]] = []

    class FakeSession:
        def __init__(self, order):
            self.order = order
            self.commit_calls = 0

        async def get(self, model, order_id: int):
            assert model is Order
            if self.order.id == order_id:
                return self.order
            return None

        async def commit(self):
            self.commit_calls += 1

    async def fake_update_live_card(*args, **kwargs):
        calls.append(("live_card", args, kwargs))
        return True

    async def fake_close_order_topic(*args, **kwargs):
        calls.append(("close_topic", args, kwargs))

    async def fake_send_notification(*args, **kwargs):
        calls.append(("notify", args, kwargs))

    async def fake_sync_user_achievements(*, session, telegram_id, bot=None, notify=False, auto_commit=True):
        calls.append(
            (
                "achievements",
                (),
                {
                    "session": session,
                    "telegram_id": telegram_id,
                    "bot": bot,
                    "notify": notify,
                    "auto_commit": auto_commit,
                },
            )
        )
        return []

    monkeypatch.setattr("bot.services.live_cards.update_live_card", fake_update_live_card)
    monkeypatch.setattr("bot.services.unified_hub.close_order_topic", fake_close_order_topic)
    monkeypatch.setattr("bot.services.realtime_notifications.send_order_status_notification", fake_send_notification)
    monkeypatch.setattr("bot.services.achievements.sync_user_achievements", fake_sync_user_achievements)

    session = FakeSession(order)
    dispatch_result = await replay_order_lifecycle_event(session, object(), event)

    assert isinstance(dispatch_result, OrderStatusDispatchResult)
    assert dispatch_result.successful is True
    assert session.commit_calls == 1
    assert [name for name, _args, _kwargs in calls] == [
        "live_card",
        "close_topic",
        "achievements",
    ]
    assert event.dispatch_attempts == 2
    assert event.dispatch_status == OrderLifecycleDispatchStatus.DISPATCHED.value
    assert event.dispatched_at is not None
    assert set(event.payload["dispatch_state"]["completed_surfaces"]) == {
        ORDER_EVENT_SURFACE_NOTIFY_USER,
        ORDER_EVENT_SURFACE_LIVE_CARD,
        ORDER_EVENT_SURFACE_CLOSE_TOPIC,
        ORDER_EVENT_SURFACE_ACHIEVEMENTS,
    }


@pytest.mark.asyncio
async def test_replay_pending_order_lifecycle_events_summarizes_results(monkeypatch):
    order = make_order(status=OrderStatus.COMPLETED.value)
    first = OrderLifecycleEvent(
        order_id=order.id,
        user_id=order.user_id,
        event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
        status_from=OrderStatus.REVIEW.value,
        status_to=OrderStatus.COMPLETED.value,
        payload={},
        dispatch_status=OrderLifecycleDispatchStatus.FAILED.value,
        dispatch_attempts=1,
    )
    first.id = 1
    second = OrderLifecycleEvent(
        order_id=order.id,
        user_id=order.user_id,
        event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
        status_from=OrderStatus.PENDING.value,
        status_to=OrderStatus.CANCELLED.value,
        payload={},
        dispatch_status=OrderLifecycleDispatchStatus.PENDING.value,
        dispatch_attempts=0,
    )
    second.id = 2

    class FakeScalarResult:
        def __init__(self, events):
            self.events = events

        def all(self):
            return self.events

    class FakeExecuteResult:
        def __init__(self, events):
            self.events = events

        def scalars(self):
            return FakeScalarResult(self.events)

    class FakeSession:
        def __init__(self, events):
            self.events = events

        async def execute(self, _stmt):
            return FakeExecuteResult(self.events)

    replayed_ids: list[int] = []

    async def fake_replay_order_lifecycle_event(session, bot, lifecycle_event):
        replayed_ids.append(lifecycle_event.id)
        return OrderStatusDispatchResult()

    monkeypatch.setattr(
        "bot.services.order_status_service.replay_order_lifecycle_event",
        fake_replay_order_lifecycle_event,
    )

    summary = await replay_pending_order_lifecycle_events(
        FakeSession([first, second]),
        object(),
        limit=10,
    )

    assert isinstance(summary, OrderLifecycleReplaySummary)
    assert summary.processed == 2
    assert summary.dispatched == 2
    assert summary.failed == 0
    assert summary.skipped == 0
    assert replayed_ids == [1, 2]

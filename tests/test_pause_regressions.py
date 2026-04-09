from datetime import datetime

import pytest

from bot.api.routers.god_mode import (
    build_god_activity_timeline,
    build_god_delivery_items,
    build_god_operational_summary,
    canonicalize_god_order_status,
    get_god_order_status_filter_values,
    is_god_deliverable_message,
    merge_god_order_status_counts,
)
from bot.api.schemas import GodOrderStatusRequest
from bot.services.live_cards import get_card_stage
from bot.services.order_progress import get_auto_progress
from bot.services.realtime_notifications import (
    ORDER_STATUS_NOTIFICATIONS,
    NotificationType,
    canonicalize_order_status_for_notifications,
    send_order_status_notification,
)
from database.models.admin_logs import AdminActionLog, AdminActionType
from database.models.order_events import OrderLifecycleEvent, OrderLifecycleEventType
from database.models.orders import (
    Order,
    OrderMessage,
    OrderRevisionRound,
    OrderRevisionRoundStatus,
    OrderStatus,
    canonicalize_order_status,
    get_status_meta,
    is_waiting_payment_status,
)


def test_god_order_status_request_accepts_paused():
    payload = GodOrderStatusRequest(status="paused")
    assert payload.status == "paused"


def test_realtime_notifications_cover_pause_and_paid_full():
    paused = ORDER_STATUS_NOTIFICATIONS["paused"]
    paid_full = ORDER_STATUS_NOTIFICATIONS["paid_full"]

    assert paused["type"] == NotificationType.PAUSED
    assert paused["action"] == "view_order"
    assert paid_full["type"] == NotificationType.PAYMENT_CONFIRMED
    assert paid_full["celebration"] is True


def test_realtime_notifications_cover_pending_and_rejected():
    pending = ORDER_STATUS_NOTIFICATIONS["pending"]
    rejected = ORDER_STATUS_NOTIFICATIONS["rejected"]

    assert pending["type"] == NotificationType.ORDER_PENDING
    assert pending["icon"] == "clock"
    assert rejected["type"] == NotificationType.ORDER_REJECTED
    assert rejected["priority"] == "high"


def test_notification_status_alias_maps_confirmed_to_waiting_payment():
    assert canonicalize_order_status_for_notifications("confirmed") == "waiting_payment"
    assert canonicalize_order_status_for_notifications("review") == "review"
    assert canonicalize_order_status("confirmed") == OrderStatus.WAITING_PAYMENT.value
    assert is_waiting_payment_status("confirmed") is True
    assert get_status_meta("confirmed") == get_status_meta("waiting_payment")


def test_live_views_treat_confirmed_as_waiting_payment():
    assert get_card_stage("confirmed")["name"] == "waiting"
    assert get_auto_progress("confirmed") == get_auto_progress("waiting_payment")


def test_god_mode_canonicalizes_confirmed_filters_and_counts():
    assert canonicalize_god_order_status("confirmed") == OrderStatus.WAITING_PAYMENT.value
    assert get_god_order_status_filter_values("waiting_payment") == ("waiting_payment", "confirmed")
    assert get_god_order_status_filter_values("confirmed") == ("waiting_payment", "confirmed")

    merged = merge_god_order_status_counts({
        "waiting_payment": 2,
        "confirmed": 3,
        "review": 1,
    })

    assert merged["waiting_payment"] == 5
    assert merged["review"] == 1
    assert "confirmed" not in merged


def test_god_mode_builds_delivery_items_for_admin_file_history():
    direct_delivery = OrderMessage(
        order_id=77,
        sender_type="admin",
        sender_id=1,
        message_text="Финальная версия",
        file_type="document",
        file_name="final.docx",
        yadisk_url="https://disk.example/final.docx",
        client_message_id=555,
    )
    direct_delivery.id = 10
    direct_delivery.created_at = datetime(2026, 4, 8, 17, 45)

    topic_delivery = OrderMessage(
        order_id=77,
        sender_type="admin",
        sender_id=1,
        message_text=None,
        file_type="photo",
        file_name=None,
        yadisk_url=None,
        client_message_id=None,
    )
    topic_delivery.id = 11
    topic_delivery.created_at = datetime(2026, 4, 8, 16, 10)

    client_file = OrderMessage(
        order_id=77,
        sender_type="client",
        sender_id=999,
        message_text=None,
        file_type="document",
        file_name="brief.pdf",
        yadisk_url="https://disk.example/brief.pdf",
    )
    client_file.id = 12
    client_file.created_at = datetime(2026, 4, 8, 18, 0)

    assert is_god_deliverable_message(direct_delivery) is True
    assert is_god_deliverable_message(topic_delivery) is True
    assert is_god_deliverable_message(client_file) is False

    deliveries = build_god_delivery_items(
        [topic_delivery, client_file, direct_delivery],
        fallback_files_url="https://disk.example/order-77",
    )

    assert [item["id"] for item in deliveries] == [10, 11]
    assert deliveries[0]["source"] == "direct_admin_send"
    assert deliveries[0]["source_label"] == "Прямая выдача"
    assert deliveries[0]["file_url"] == "https://disk.example/final.docx"
    assert deliveries[1]["source"] == "order_topic"
    assert deliveries[1]["source_label"] == "Через топик"
    assert deliveries[1]["file_url"] == "https://disk.example/order-77"


def test_god_mode_builds_activity_timeline_from_multiple_sources():
    order = Order(
        user_id=777,
        work_type="essay",
        status=OrderStatus.REVIEW.value,
    )
    order.id = 77
    order.created_at = datetime(2026, 4, 8, 10, 0)

    payment_requested = OrderLifecycleEvent(
        order_id=77,
        user_id=777,
        event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
        status_from=OrderStatus.WAITING_PAYMENT.value,
        status_to=OrderStatus.VERIFICATION_PENDING.value,
        payload={
            "dispatch": {
                "notification_extra_data": {
                    "amount_to_pay": 6200,
                    "payment_method": "sbp",
                    "payment_phase": "initial",
                }
            }
        },
    )
    payment_requested.id = 1
    payment_requested.created_at = datetime(2026, 4, 8, 12, 0)

    delivery_status = OrderLifecycleEvent(
        order_id=77,
        user_id=777,
        event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
        status_from=OrderStatus.IN_PROGRESS.value,
        status_to=OrderStatus.REVIEW.value,
        payload={
            "dispatch": {
                "notification_extra_data": {
                    "delivered_at": "2026-04-08T16:00:00+03:00",
                }
            }
        },
    )
    delivery_status.id = 2
    delivery_status.created_at = datetime(2026, 4, 8, 16, 0)

    payment_confirmed = AdminActionLog(
        admin_id=1,
        admin_username="owner",
        action_type=AdminActionType.ORDER_PAYMENT_CONFIRM.value,
        target_type="order",
        target_id=77,
        details="Confirmed payment: 6200₽",
    )
    payment_confirmed.id = 10
    payment_confirmed.created_at = datetime(2026, 4, 8, 12, 5)

    note_updated = AdminActionLog(
        admin_id=1,
        admin_username="owner",
        action_type=AdminActionType.ORDER_NOTE_UPDATE.value,
        target_type="order",
        target_id=77,
        old_value={"notes": "Старый комментарий"},
        new_value={"notes": "Проверить после выдачи"},
    )
    note_updated.id = 11
    note_updated.created_at = datetime(2026, 4, 8, 15, 30)

    deliverable_message = OrderMessage(
        order_id=77,
        sender_type="admin",
        sender_id=1,
        message_text="Финальная версия",
        file_type="document",
        file_name="final.docx",
        yadisk_url="https://disk.example/final.docx",
        client_message_id=500,
    )
    deliverable_message.id = 20
    deliverable_message.created_at = datetime(2026, 4, 8, 16, 1)

    admin_message = OrderMessage(
        order_id=77,
        sender_type="admin",
        sender_id=1,
        message_text="Проверьте, пожалуйста, итоговую версию",
    )
    admin_message.id = 22
    admin_message.created_at = datetime(2026, 4, 8, 16, 30)

    revision_message = OrderMessage(
        order_id=77,
        sender_type="client",
        sender_id=777,
        message_text="📝 <b>Запрос на правки</b>\n\nДобавить список литературы",
        revision_round_id=31,
    )
    revision_message.id = 21
    revision_message.created_at = datetime(2026, 4, 8, 17, 0)

    revision_round = OrderRevisionRound(
        order_id=77,
        round_number=2,
        status=OrderRevisionRoundStatus.FULFILLED.value,
        initial_comment="Добавить список литературы",
    )
    revision_round.id = 31
    revision_round.requested_at = datetime(2026, 4, 8, 17, 0)
    revision_round.last_client_activity_at = datetime(2026, 4, 8, 17, 2)
    revision_round.closed_by_delivery_batch_id = 44

    timeline = build_god_activity_timeline(
        order=order,
        lifecycle_events=[delivery_status, payment_requested],
        admin_logs=[note_updated, payment_confirmed],
        messages=[deliverable_message, admin_message, revision_message],
        revision_rounds=[revision_round],
        delivery_batches_by_id={44: type("Batch", (), {"id": 44, "version_number": 3})()},
        fallback_files_url="https://disk.example/order-77",
    )

    assert timeline[0]["kind"] == "revision_round"
    assert timeline[0]["title"] == "Правка #2 закрыта новой версией"
    assert "Добавить список литературы" in (timeline[0]["details"] or "")
    assert "v3" in (timeline[0]["details"] or "")
    assert any(item["kind"] == "admin_message" and item["details"] == "Проверьте, пожалуйста, итоговую версию" for item in timeline)
    assert any(
        item["kind"] == AdminActionType.ORDER_NOTE_UPDATE.value
        and item["details"] == "Старый комментарий → Проверить после выдачи · @owner"
        for item in timeline
    )
    assert any(item["kind"] == "delivery" and item["link_url"] == "https://disk.example/final.docx" for item in timeline)
    assert any(item["kind"] == "status_change" and item["title"] == "Работа передана клиенту" for item in timeline)
    assert any(item["kind"] == AdminActionType.ORDER_PAYMENT_CONFIRM.value for item in timeline)
    assert any(item["kind"] == "status_change" and item["title"] == "Клиент сообщил об оплате" for item in timeline)
    assert timeline[-1]["kind"] == "created"


def test_god_mode_builds_operational_summary_from_timeline_and_status():
    order = Order(
        user_id=777,
        work_type="essay",
        status=OrderStatus.VERIFICATION_PENDING.value,
        payment_method="sbp",
    )
    order.id = 91
    order.price = 6200
    order.paid_amount = 0

    timeline = [
        {
            "id": "status:1",
            "kind": "status_change",
            "title": "Клиент сообщил об оплате",
            "details": "Оплата · СБП · 6 200 ₽",
            "timestamp": "2026-04-08T12:00:00+03:00",
            "accent": "gold",
        },
        {
            "id": "note:1",
            "kind": "order_note_update",
            "title": "Обновлена внутренняя заметка",
            "details": "Проверить чек",
            "timestamp": "2026-04-08T12:05:00+03:00",
            "accent": "info",
        },
    ]

    class PaymentContext:
        amount_to_pay = 6200
        payment_phase = "initial"
        payment_method = "sbp"

    summary = build_god_operational_summary(
        order=order,
        activity_timeline=timeline,
        payment_context=PaymentContext(),
        recent_deliveries=[],
    )

    assert summary["tone"] == "gold"
    assert summary["title"] == "Платёж на ручной проверке"
    assert summary["subtitle"] == "Оплата · СБП · 6 200 ₽"
    assert "подтвердить" in (summary["next_action"] or "").lower()
    assert summary["items"][0]["title"] == "Клиент сообщил об оплате"
    assert len(summary["items"]) == 2


def test_god_mode_builds_operational_summary_for_open_revision_round():
    order = Order(
        user_id=888,
        work_type="essay",
        status=OrderStatus.REVISION.value,
    )
    order.id = 55
    order.revision_count = 4

    timeline = [
        {
            "id": "revision_round:4",
            "kind": "revision_round",
            "title": "Открыта правка #4",
            "details": "Добавить таблицу и пересчитать выводы",
            "timestamp": "2026-04-08T17:00:00+03:00",
            "accent": "warning",
        },
    ]

    summary = build_god_operational_summary(
        order=order,
        activity_timeline=timeline,
        payment_context=None,
        recent_deliveries=[],
        current_revision_round={
            "id": 4,
            "round_number": 4,
            "status": "open",
            "message_count": 2,
            "attachment_count": 3,
            "latest_activity_at": "2026-04-08T17:05:00+03:00",
        },
    )

    assert summary["tone"] == "warning"
    assert summary["title"] == "Нужны правки по заказу"
    assert "Правка #4" in (summary["subtitle"] or "")
    assert "влож." in (summary["subtitle"] or "")
    assert "исправленную версию" in (summary["next_action"] or "").lower()


@pytest.mark.asyncio
async def test_send_order_status_notification_normalizes_confirmed(monkeypatch):
    sent = {}

    async def fake_send_to_user(telegram_id, message):
        sent["telegram_id"] = telegram_id
        sent["message"] = message
        return True

    monkeypatch.setattr("bot.api.websocket.manager.send_to_user", fake_send_to_user)

    ok = await send_order_status_notification(
        telegram_id=42,
        order_id=7,
        new_status="confirmed",
        old_status="pending",
        extra_data={"final_price": 12500, "bonus_used": 500},
    )

    assert ok is True
    assert sent["telegram_id"] == 42
    assert sent["message"]["status"] == "waiting_payment"
    assert sent["message"]["old_status"] == "pending"
    assert sent["message"]["notification_type"] == NotificationType.PRICE_SET.value
    assert sent["message"]["message"] == "К оплате: 12 500 ₽ (бонусы: −500 ₽)"

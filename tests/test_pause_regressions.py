from bot.api.schemas import GodOrderStatusRequest
from bot.services.realtime_notifications import ORDER_STATUS_NOTIFICATIONS, NotificationType


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

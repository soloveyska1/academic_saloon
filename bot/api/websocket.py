from __future__ import annotations

"""
WebSocket handler for real-time updates to Mini App clients
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from starlette.websockets import WebSocketState

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["websocket"])


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""

    def __init__(self):
        # Map telegram_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Track last activity for cleanup
        self.last_activity: Dict[int, datetime] = {}
        # Lock for thread safety
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, telegram_id: int):
        """Accept a new WebSocket connection"""
        await websocket.accept()

        async with self._lock:
            if telegram_id not in self.active_connections:
                self.active_connections[telegram_id] = set()
            self.active_connections[telegram_id].add(websocket)
            self.last_activity[telegram_id] = datetime.now(timezone.utc)

        logger.info(f"[WS] User {telegram_id} connected. Total connections: {self._total_connections()}")

    async def disconnect(self, websocket: WebSocket, telegram_id: int):
        """Remove a WebSocket connection"""
        async with self._lock:
            if telegram_id in self.active_connections:
                self.active_connections[telegram_id].discard(websocket)
                if not self.active_connections[telegram_id]:
                    del self.active_connections[telegram_id]
                    self.last_activity.pop(telegram_id, None)

        logger.info(f"[WS] User {telegram_id} disconnected. Total connections: {self._total_connections()}")

    def _total_connections(self) -> int:
        """Count total active connections"""
        return sum(len(conns) for conns in self.active_connections.values())

    async def send_to_user(self, telegram_id: int, message: dict):
        """Send a message to all connections of a specific user"""
        if telegram_id not in self.active_connections:
            logger.info(f"[WS] User {telegram_id} not connected, cannot send: {message.get('type', 'unknown')}")
            return False

        dead_connections = set()
        sent_count = 0

        logger.info(f"[WS] Sending {message.get('type', 'unknown')} to user {telegram_id} ({len(self.active_connections[telegram_id])} connections)")

        for websocket in self.active_connections[telegram_id]:
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(message)
                    sent_count += 1
                    logger.info(f"[WS] Successfully sent {message.get('type')} to user {telegram_id}")
                else:
                    dead_connections.add(websocket)
            except Exception as e:
                logger.warning(f"[WS] Failed to send to user {telegram_id}: {e}")
                dead_connections.add(websocket)

        # Clean up dead connections
        async with self._lock:
            if telegram_id in self.active_connections:
                self.active_connections[telegram_id] -= dead_connections

        return sent_count > 0

    async def broadcast(self, message: dict, exclude_user: Optional[int] = None):
        """Broadcast a message to all connected users"""
        for telegram_id in list(self.active_connections.keys()):
            if exclude_user and telegram_id == exclude_user:
                continue
            await self.send_to_user(telegram_id, message)

    def is_user_connected(self, telegram_id: int) -> bool:
        """Check if a user has any active connections"""
        return telegram_id in self.active_connections and len(self.active_connections[telegram_id]) > 0


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    telegram_id: int = Query(..., description="User's Telegram ID"),
    init_data: str = Query(default="", description="Telegram initData for authentication"),
):
    """
    WebSocket endpoint for real-time updates.

    Connect with: ws://host/api/ws?telegram_id=123456789&init_data=...

    Message types received by client:
    - order_update: Order status changed
    - balance_update: User balance changed
    - notification: General notification
    - revision_round_opened: Client opened a new revision round
    - revision_round_updated: Client added details to an open revision round
    - revision_round_fulfilled: Manager closed revision round with a new version
    - ping: Keep-alive ping
    """
    # Authenticate via initData
    if init_data:
        try:
            from bot.api.auth import validate_init_data
            from core.config import settings
            from database.db import async_session_maker
            from database.models.users import User
            from sqlalchemy import select
            user, error = validate_init_data(init_data, settings.BOT_TOKEN.get_secret_value())
            if not user or user.id != telegram_id:
                logger.warning(f"[WS] Auth failed for telegram_id={telegram_id}: {error}")
                await websocket.close(code=4001, reason="Authentication failed")
                return

            async with async_session_maker() as session:
                result = await session.execute(
                    select(User.terms_accepted_at).where(User.telegram_id == telegram_id)
                )
                terms_accepted_at = result.scalar_one_or_none()

            if not terms_accepted_at:
                logger.warning(f"[WS] Terms not accepted for telegram_id={telegram_id}")
                await websocket.close(code=4003, reason="Terms acceptance required")
                return
        except Exception as e:
            logger.error(f"[WS] Auth error: {e}")
            await websocket.close(code=4001, reason="Authentication error")
            return
    else:
        logger.warning(f"[WS] No init_data provided for telegram_id={telegram_id}")
        await websocket.close(code=4001, reason="Missing init_data")
        return

    await manager.connect(websocket, telegram_id)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "telegram_id": telegram_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        # Keep connection alive and listen for messages
        while True:
            try:
                # Wait for message with timeout (for ping/pong)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0  # 30 second timeout
                )

                # Handle incoming messages
                try:
                    message = json.loads(data)
                    msg_type = message.get("type", "")

                    if msg_type == "ping":
                        # Respond to ping
                        await websocket.send_json({
                            "type": "pong",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                    elif msg_type == "subscribe":
                        # Client wants to subscribe to specific updates
                        await websocket.send_json({
                            "type": "subscribed",
                            "channels": message.get("channels", [])
                        })

                except json.JSONDecodeError:
                    pass  # Ignore invalid JSON

            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({
                        "type": "ping",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                except Exception:
                    break  # Connection dead

    except WebSocketDisconnect:
        logger.info(f"[WS] User {telegram_id} disconnected normally")
    except Exception as e:
        logger.error(f"[WS] Error for user {telegram_id}: {e}")
    finally:
        await manager.disconnect(websocket, telegram_id)


# Helper functions for sending updates from other parts of the application

async def notify_order_update(telegram_id: int, order_id: int, new_status: str, order_data: dict = None):
    """
    Notify user about order status change.
    Call this from order handlers when status changes.
    """
    message = {
        "type": "order_update",
        "order_id": order_id,
        "status": new_status,
        "data": order_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await manager.send_to_user(telegram_id, message)
    logger.info(f"[WS] Sent order update to user {telegram_id}: order #{order_id} -> {new_status}")


async def notify_balance_update(telegram_id: int, new_balance: float, change: float, reason: str = ""):
    """
    Notify user about balance change.
    """
    message = {
        "type": "balance_update",
        "balance": new_balance,
        "change": change,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await manager.send_to_user(telegram_id, message)
    logger.info(f"[WS] Sent balance update to user {telegram_id}: {change:+.2f} ({reason})")


async def notify_user(telegram_id: int, title: str, message: str, notification_type: str = "info"):
    """
    Send a general notification to user.
    notification_type: 'info', 'success', 'warning', 'error'
    """
    payload = {
        "type": "notification",
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await manager.send_to_user(telegram_id, payload)
    logger.info(f"[WS] Sent notification to user {telegram_id}: {title}")


async def notify_data_refresh(telegram_id: int, refresh_type: str = "all"):
    """
    Tell client to refresh specific data.
    refresh_type: 'all', 'orders', 'profile', 'balance'
    """
    message = {
        "type": "refresh",
        "refresh_type": refresh_type,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await manager.send_to_user(telegram_id, message)


def get_manager() -> ConnectionManager:
    """Get the connection manager instance"""
    return manager


# ═══════════════════════════════════════════════════════════════════════════
#  ADMIN/GOD MODE NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════

# Set of admin telegram IDs that should receive admin notifications
_admin_ids: Set[int] = set()

def register_admin_id(admin_id: int):
    """Register an admin ID to receive admin notifications"""
    _admin_ids.add(admin_id)
    logger.info(f"[WS Admin] Registered admin {admin_id} for notifications")

def unregister_admin_id(admin_id: int):
    """Unregister an admin ID from admin notifications"""
    _admin_ids.discard(admin_id)

async def notify_admin_new_order(order_data: dict):
    """
    Notify all connected admins about a new order.
    order_data should include: id, work_type, subject, user info, etc.
    """
    message = {
        "type": "admin_new_order",
        "order": order_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    sent_to = []
    for admin_id in _admin_ids:
        if await manager.send_to_user(admin_id, message):
            sent_to.append(admin_id)
    if sent_to:
        logger.info(f"[WS Admin] Notified admins {sent_to} about new order #{order_data.get('id')}")
    return len(sent_to) > 0

async def notify_admin_payment_pending(
    order_id: int,
    user_fullname: str,
    amount: float,
    payment_method: str,
    payment_phase: str = "initial",
    work_type_label: Optional[str] = None,
    subject: Optional[str] = None,
):
    """
    Notify admins when a payment is pending verification.
    """
    message = {
        "type": "admin_payment_pending",
        "order_id": order_id,
        "user_fullname": user_fullname,
        "amount": amount,
        "payment_method": payment_method,
        "payment_phase": payment_phase,
        "work_type_label": work_type_label,
        "subject": subject,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    sent_to = []
    for admin_id in _admin_ids:
        if await manager.send_to_user(admin_id, message):
            sent_to.append(admin_id)
    if sent_to:
        logger.info(f"[WS Admin] Notified admins about payment pending for order #{order_id}")
    return len(sent_to) > 0


async def notify_admin_batch_payment_pending(
    *,
    user_fullname: str,
    user_username: Optional[str],
    payment_method: str,
    payment_scheme: str,
    processed_orders: list[dict],
    total_amount: float,
) -> bool:
    message = {
        "type": "admin_payment_pending",
        "is_batch": True,
        "user_fullname": user_fullname,
        "user_username": user_username,
        "payment_method": payment_method,
        "payment_scheme": payment_scheme,
        "orders_count": len(processed_orders),
        "total_amount": total_amount,
        "orders": processed_orders,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    sent_to = []
    for admin_id in _admin_ids:
        if await manager.send_to_user(admin_id, message):
            sent_to.append(admin_id)
    if sent_to:
        logger.info("[WS Admin] Notified admins about batch payment pending: %s orders", len(processed_orders))
    return len(sent_to) > 0

async def notify_admin_event(event_type: str, data: dict):
    """
    Generic admin notification for various events.
    event_type: 'new_order', 'payment_pending', 'new_message', 'user_online', etc.
    """
    message = {
        "type": f"admin_{event_type}",
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    sent_to = []
    for admin_id in _admin_ids:
        if await manager.send_to_user(admin_id, message):
            sent_to.append(admin_id)
    return len(sent_to) > 0


async def notify_file_delivery(telegram_id: int, order_id: int, file_count: int, files_url: str):
    """
    Notify user that work files have been uploaded and are ready for download.
    """
    message = {
        "type": "file_delivery",
        "order_id": order_id,
        "file_count": file_count,
        "files_url": files_url,
        "title": "📁 Файлы готовы!",
        "message": f"Загружено {file_count} файл(ов) к вашему заказу #{order_id}",
        "icon": "download",
        "color": "#22c55e",
        "priority": "high",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    success = await manager.send_to_user(telegram_id, message)
    if success:
        logger.info(f"[WS] Notified user {telegram_id} about file delivery for order #{order_id}")
    return success


async def notify_delivery_update(
    telegram_id: int,
    order_id: int,
    delivery_batch_id: int,
    version_number: int,
    revision_count_snapshot: int,
    manager_comment: str | None,
    file_count: int,
    files_url: str,
    *,
    title: str | None = None,
    message: str | None = None,
):
    ws_message = {
        "type": "delivery_update",
        "order_id": order_id,
        "delivery_batch_id": delivery_batch_id,
        "version_number": version_number,
        "revision_count_snapshot": revision_count_snapshot,
        "manager_comment": manager_comment,
        "file_count": file_count,
        "files_url": files_url,
        "title": title or "Исправленная версия готова",
        "message": message or f"Версия {version_number} по заказу #{order_id} отправлена",
        "icon": "download",
        "color": "#22c55e",
        "priority": "high",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    success = await manager.send_to_user(telegram_id, ws_message)
    if success:
        logger.info(
            "[WS] Notified user %s about delivery update v%s for order #%s",
            telegram_id,
            version_number,
            order_id,
        )
    return success


async def notify_revision_round_opened(
    telegram_id: int,
    order_id: int,
    revision_round_id: int,
    round_number: int,
    *,
    initial_comment: str | None = None,
):
    message = {
        "type": "revision_round_opened",
        "order_id": order_id,
        "revision_round_id": revision_round_id,
        "round_number": round_number,
        "initial_comment": initial_comment,
        "title": f"Правка #{round_number} открыта",
        "message": f"Комментарий по заказу #{order_id} отправлен и ждёт следующую версию.",
        "icon": "edit",
        "color": "#f59e0b",
        "priority": "low",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    success = await manager.send_to_user(telegram_id, message)
    if success:
        logger.info(
            "[WS] Notified user %s about opened revision round #%s for order #%s",
            telegram_id,
            round_number,
            order_id,
        )
    return success


async def notify_revision_round_updated(
    telegram_id: int,
    order_id: int,
    revision_round_id: int,
    round_number: int,
    *,
    latest_comment: str | None = None,
):
    message = {
        "type": "revision_round_updated",
        "order_id": order_id,
        "revision_round_id": revision_round_id,
        "round_number": round_number,
        "latest_comment": latest_comment,
        "title": f"Правка #{round_number} обновлена",
        "message": f"Материалы к правке по заказу #{order_id} обновлены.",
        "icon": "edit",
        "color": "#f59e0b",
        "priority": "low",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    success = await manager.send_to_user(telegram_id, message)
    if success:
        logger.info(
            "[WS] Notified user %s about updated revision round #%s for order #%s",
            telegram_id,
            round_number,
            order_id,
        )
    return success


async def notify_revision_round_fulfilled(
    telegram_id: int,
    order_id: int,
    revision_round_id: int,
    round_number: int,
    *,
    delivery_batch_id: int | None = None,
    version_number: int | None = None,
):
    message = {
        "type": "revision_round_fulfilled",
        "order_id": order_id,
        "revision_round_id": revision_round_id,
        "round_number": round_number,
        "delivery_batch_id": delivery_batch_id,
        "version_number": version_number,
        "title": f"Правка #{round_number} закрыта новой версией",
        "message": (
            f"По заказу #{order_id} отправлена "
            f"{f'версия {version_number}' if version_number else 'новая версия'}."
        ),
        "icon": "check-circle",
        "color": "#22c55e",
        "priority": "low",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    success = await manager.send_to_user(telegram_id, message)
    if success:
        logger.info(
            "[WS] Notified user %s about fulfilled revision round #%s for order #%s",
            telegram_id,
            round_number,
            order_id,
        )
    return success

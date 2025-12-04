"""
WebSocket handler for real-time updates to Mini App clients
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional
from datetime import datetime

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
            self.last_activity[telegram_id] = datetime.utcnow()

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
            return False

        dead_connections = set()

        for websocket in self.active_connections[telegram_id]:
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(message)
                else:
                    dead_connections.add(websocket)
            except Exception as e:
                logger.warning(f"[WS] Failed to send to user {telegram_id}: {e}")
                dead_connections.add(websocket)

        # Clean up dead connections
        async with self._lock:
            if telegram_id in self.active_connections:
                self.active_connections[telegram_id] -= dead_connections

        return True

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
    telegram_id: int = Query(..., description="User's Telegram ID")
):
    """
    WebSocket endpoint for real-time updates.

    Connect with: ws://host/api/ws?telegram_id=123456789

    Message types received by client:
    - order_update: Order status changed
    - balance_update: User balance changed
    - notification: General notification
    - ping: Keep-alive ping
    """
    await manager.connect(websocket, telegram_id)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "telegram_id": telegram_id,
            "timestamp": datetime.utcnow().isoformat()
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
                            "timestamp": datetime.utcnow().isoformat()
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
                        "timestamp": datetime.utcnow().isoformat()
                    })
                except:
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
        "timestamp": datetime.utcnow().isoformat()
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
        "timestamp": datetime.utcnow().isoformat()
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
        "timestamp": datetime.utcnow().isoformat()
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
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.send_to_user(telegram_id, message)


def get_manager() -> ConnectionManager:
    """Get the connection manager instance"""
    return manager

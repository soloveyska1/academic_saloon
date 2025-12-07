"""
Admin action logs - tracks all admin actions for audit trail
"""
from datetime import datetime
from enum import Enum

from sqlalchemy import BigInteger, DateTime, Integer, String, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database.db import Base


class AdminActionType(str, Enum):
    """Types of admin actions"""
    # User actions
    USER_VIEW = "user_view"
    USER_BALANCE_ADD = "user_balance_add"
    USER_BALANCE_DEDUCT = "user_balance_deduct"
    USER_BAN = "user_ban"
    USER_UNBAN = "user_unban"
    USER_NOTE_UPDATE = "user_note_update"
    USER_WATCH_ENABLE = "user_watch_enable"
    USER_WATCH_DISABLE = "user_watch_disable"

    # Order actions
    ORDER_VIEW = "order_view"
    ORDER_STATUS_CHANGE = "order_status_change"
    ORDER_PRICE_SET = "order_price_set"
    ORDER_PROGRESS_UPDATE = "order_progress_update"
    ORDER_MESSAGE_SEND = "order_message_send"
    ORDER_DELETE = "order_delete"
    ORDER_PAYMENT_CONFIRM = "order_payment_confirm"
    ORDER_PAYMENT_REJECT = "order_payment_reject"

    # Promo actions
    PROMO_CREATE = "promo_create"
    PROMO_UPDATE = "promo_update"
    PROMO_DELETE = "promo_delete"
    PROMO_TOGGLE = "promo_toggle"

    # System actions
    SQL_EXECUTE = "sql_execute"
    SETTINGS_CHANGE = "settings_change"
    ADMIN_LOGIN = "admin_login"
    ADMIN_LOGOUT = "admin_logout"

    # Broadcast
    BROADCAST_SEND = "broadcast_send"


class AdminActionLog(Base):
    """
    Audit log for all admin actions.
    Every action performed in God Mode is logged here.
    """
    __tablename__ = "admin_action_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Who performed the action
    admin_id: Mapped[int] = mapped_column(BigInteger, index=True)
    admin_username: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # What action was performed
    action_type: Mapped[str] = mapped_column(String(50), index=True)

    # Target of the action (user_id, order_id, promo_id, etc.)
    target_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # user, order, promo, system
    target_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)

    # Details of the action
    details: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Old and new values for change tracking
    old_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Additional metadata
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True
    )

    @property
    def action_emoji(self) -> str:
        """Emoji for action type"""
        emoji_map = {
            AdminActionType.USER_BALANCE_ADD.value: "💰",
            AdminActionType.USER_BALANCE_DEDUCT.value: "💸",
            AdminActionType.USER_BAN.value: "🚫",
            AdminActionType.USER_UNBAN.value: "✅",
            AdminActionType.ORDER_STATUS_CHANGE.value: "📋",
            AdminActionType.ORDER_PRICE_SET.value: "💵",
            AdminActionType.ORDER_PROGRESS_UPDATE.value: "📊",
            AdminActionType.ORDER_MESSAGE_SEND.value: "💬",
            AdminActionType.ORDER_PAYMENT_CONFIRM.value: "✅",
            AdminActionType.ORDER_PAYMENT_REJECT.value: "❌",
            AdminActionType.PROMO_CREATE.value: "🎫",
            AdminActionType.PROMO_DELETE.value: "🗑️",
            AdminActionType.SQL_EXECUTE.value: "🔧",
            AdminActionType.BROADCAST_SEND.value: "📢",
        }
        return emoji_map.get(self.action_type, "📝")


class UserActivity(Base):
    """
    Real-time user activity tracking for live monitoring.
    Stores current page/action of each user in Mini App.
    """
    __tablename__ = "user_activities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # User identification
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fullname: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Current activity
    current_page: Mapped[str | None] = mapped_column(String(100), nullable=True)  # /orders, /profile, etc.
    current_action: Mapped[str | None] = mapped_column(String(100), nullable=True)  # viewing_order, creating_order, etc.
    current_order_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Session info
    session_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Connection status
    is_online: Mapped[bool] = mapped_column(default=False)

    # Device info
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)  # iOS, Android, Web

    @property
    def activity_duration_minutes(self) -> int:
        """Minutes since session started"""
        if not self.session_started_at:
            return 0
        delta = datetime.now(self.session_started_at.tzinfo) - self.session_started_at
        return int(delta.total_seconds() / 60)

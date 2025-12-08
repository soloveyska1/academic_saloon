"""
GOD MODE Admin Panel API
========================
Full control over the entire system. Access restricted to ADMIN_IDS only.
No passwords - authentication via Telegram initData only.

Features:
- Real-time dashboard statistics
- Complete user management (balance, ban, notes, watch mode)
- Order management (all statuses, prices, payments, progress)
- Promo code CRUD
- Live user activity monitoring
- Action audit logs
- Safe SQL execution (SELECT only)
- Broadcast messaging
"""

import logging
import re
from datetime import datetime, timedelta
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, desc, func, text, update, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot

from database.db import get_session
from database.models.users import User
from database.models.orders import Order, OrderStatus, WORK_TYPE_LABELS, WorkType, OrderMessage
from database.models.transactions import BalanceTransaction
from database.models.promocodes import PromoCode, PromoCodeUsage
from database.models.admin_logs import AdminActionLog, AdminActionType, UserActivity
from core.config import settings
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import OrderResponse
from bot.api.dependencies import order_to_response
from bot.bot_instance import get_bot
from bot.services.bonus import BonusService, BonusReason

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/god", tags=["God Mode"])

MSK_TZ = ZoneInfo("Europe/Moscow")


# ═══════════════════════════════════════════════════════════════════════════════
#                          SECURITY & HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def require_god_mode(tg_user: TelegramUser) -> None:
    """
    Strict admin check - only telegram_id from ADMIN_IDS allowed.
    No passwords, no codes - pure Telegram authentication.
    """
    if tg_user.id not in settings.ADMIN_IDS:
        logger.warning(f"[GOD MODE] Access denied for user {tg_user.id}")
        raise HTTPException(status_code=403, detail="Access denied. You are not a god.")


async def log_admin_action(
    session: AsyncSession,
    admin: TelegramUser,
    action_type: AdminActionType,
    target_type: str | None = None,
    target_id: int | None = None,
    details: str | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    request: Request | None = None,
) -> None:
    """Log an admin action for audit trail"""
    log_entry = AdminActionLog(
        admin_id=admin.id,
        admin_username=admin.username,
        action_type=action_type.value,
        target_type=target_type,
        target_id=target_id,
        details=details,
        old_value=old_value,
        new_value=new_value,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    session.add(log_entry)
    # Don't commit here - let the caller handle transaction


# ═══════════════════════════════════════════════════════════════════════════════
#                          DASHBOARD & STATS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard")
async def get_dashboard(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Comprehensive dashboard with real-time statistics.
    """
    require_god_mode(tg_user)

    now = datetime.now(MSK_TZ)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # === ORDERS STATS ===
    # Total orders
    total_orders = await session.scalar(select(func.count(Order.id)))

    # Orders by status
    status_counts = {}
    for status in OrderStatus:
        count = await session.scalar(
            select(func.count(Order.id)).where(Order.status == status.value)
        )
        status_counts[status.value] = count or 0

    # Active orders (not completed/cancelled/rejected)
    active_statuses = [
        OrderStatus.PENDING.value, OrderStatus.WAITING_ESTIMATION.value,
        OrderStatus.WAITING_PAYMENT.value, OrderStatus.VERIFICATION_PENDING.value,
        OrderStatus.CONFIRMED.value, OrderStatus.PAID.value, OrderStatus.PAID_FULL.value,
        OrderStatus.IN_PROGRESS.value, OrderStatus.REVIEW.value, OrderStatus.REVISION.value,
    ]
    active_orders = await session.scalar(
        select(func.count(Order.id)).where(Order.status.in_(active_statuses))
    )

    # Orders needing attention (pending, verification_pending, waiting_estimation)
    attention_statuses = [
        OrderStatus.PENDING.value,
        OrderStatus.VERIFICATION_PENDING.value,
        OrderStatus.WAITING_ESTIMATION.value,
    ]
    orders_needing_attention = await session.scalar(
        select(func.count(Order.id)).where(Order.status.in_(attention_statuses))
    )

    # Orders today
    orders_today = await session.scalar(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )

    # Completed today
    completed_today = await session.scalar(
        select(func.count(Order.id)).where(
            and_(Order.status == OrderStatus.COMPLETED.value, Order.completed_at >= today_start)
        )
    )

    # === REVENUE STATS ===
    # Total revenue (all time)
    total_revenue = await session.scalar(
        select(func.sum(Order.paid_amount)).where(Order.paid_amount > 0)
    ) or 0.0

    # Revenue today
    revenue_today = await session.scalar(
        select(func.sum(Order.paid_amount)).where(
            and_(Order.paid_amount > 0, Order.created_at >= today_start)
        )
    ) or 0.0

    # Revenue this week
    revenue_week = await session.scalar(
        select(func.sum(Order.paid_amount)).where(
            and_(Order.paid_amount > 0, Order.created_at >= week_start)
        )
    ) or 0.0

    # Revenue this month
    revenue_month = await session.scalar(
        select(func.sum(Order.paid_amount)).where(
            and_(Order.paid_amount > 0, Order.created_at >= month_start)
        )
    ) or 0.0

    # Average order value
    avg_order_value = await session.scalar(
        select(func.avg(Order.paid_amount)).where(Order.paid_amount > 0)
    ) or 0.0

    # === USERS STATS ===
    total_users = await session.scalar(select(func.count(User.id)))
    users_today = await session.scalar(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )
    users_week = await session.scalar(
        select(func.count(User.id)).where(User.created_at >= week_start)
    )
    banned_users = await session.scalar(
        select(func.count(User.id)).where(User.is_banned == True)
    )
    watched_users = await session.scalar(
        select(func.count(User.id)).where(User.is_watched == True)
    )

    # Total bonus balance across all users
    total_bonus_balance = await session.scalar(
        select(func.sum(User.balance)).where(User.balance > 0)
    ) or 0.0

    # === PROMO STATS ===
    active_promos = await session.scalar(
        select(func.count(PromoCode.id)).where(PromoCode.is_active == True)
    )
    total_promo_uses = await session.scalar(
        select(func.count(PromoCodeUsage.id))
    ) or 0

    # === ONLINE USERS ===
    five_min_ago = now - timedelta(minutes=5)
    online_users = await session.scalar(
        select(func.count(UserActivity.id)).where(
            and_(UserActivity.is_online == True, UserActivity.last_activity_at >= five_min_ago)
        )
    ) or 0

    return {
        "timestamp": now.isoformat(),
        "orders": {
            "total": total_orders or 0,
            "active": active_orders or 0,
            "needing_attention": orders_needing_attention or 0,
            "today": orders_today or 0,
            "completed_today": completed_today or 0,
            "by_status": status_counts,
        },
        "revenue": {
            "total": float(total_revenue),
            "today": float(revenue_today),
            "week": float(revenue_week),
            "month": float(revenue_month),
            "average_order": round(float(avg_order_value), 2),
        },
        "users": {
            "total": total_users or 0,
            "today": users_today or 0,
            "week": users_week or 0,
            "banned": banned_users or 0,
            "watched": watched_users or 0,
            "online": online_users,
            "total_bonus_balance": float(total_bonus_balance),
        },
        "promos": {
            "active": active_promos or 0,
            "total_uses": total_promo_uses,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
#                          ORDERS MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/orders")
async def get_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get orders with filtering and search"""
    require_god_mode(tg_user)

    query = select(Order).order_by(desc(Order.created_at))

    # Filter by status
    if status and status != "all":
        query = query.where(Order.status == status)

    # Search by order ID, subject, topic
    if search:
        search_term = f"%{search}%"
        # Try to parse as order ID
        try:
            order_id = int(search)
            query = query.where(Order.id == order_id)
        except ValueError:
            query = query.where(
                or_(
                    Order.subject.ilike(search_term),
                    Order.topic.ilike(search_term),
                )
            )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await session.scalar(count_query) or 0

    # Apply pagination
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    orders = result.scalars().all()

    # Get user info for each order
    user_ids = list(set(o.user_id for o in orders))
    users_result = await session.execute(
        select(User).where(User.telegram_id.in_(user_ids))
    )
    users_map = {u.telegram_id: u for u in users_result.scalars().all()}

    orders_data = []
    for o in orders:
        user = users_map.get(o.user_id)
        order_dict = order_to_response(o).__dict__
        order_dict.update({
            "user_telegram_id": o.user_id,
            "user_fullname": user.fullname if user else "Unknown",
            "user_username": user.username if user else None,
            "admin_notes": o.admin_notes,
            "channel_message_id": o.channel_message_id,
            "revision_count": o.revision_count,
            "description": o.description,
        })
        orders_data.append(order_dict)

    return {
        "orders": orders_data,
        "total": total,
        "has_more": offset + limit < total,
    }


@router.get("/orders/{order_id}")
async def get_order_details(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get full order details including messages and user info"""
    require_god_mode(tg_user)

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get user
    user = await session.scalar(
        select(User).where(User.telegram_id == order.user_id)
    )

    # Get messages
    messages_result = await session.execute(
        select(OrderMessage)
        .where(OrderMessage.order_id == order_id)
        .order_by(OrderMessage.created_at)
    )
    messages = messages_result.scalars().all()

    return {
        "order": {
            **order_to_response(order).__dict__,
            "user_telegram_id": order.user_id,
            "user_fullname": user.fullname if user else "Unknown",
            "user_username": user.username if user else None,
            "admin_notes": order.admin_notes,
            "revision_count": order.revision_count,
            "description": order.description,
            "payment_method": order.payment_method,
        },
        "user": {
            "telegram_id": user.telegram_id if user else None,
            "username": user.username if user else None,
            "fullname": user.fullname if user else None,
            "balance": user.balance if user else 0,
            "orders_count": user.orders_count if user else 0,
            "total_spent": user.total_spent if user else 0,
            "is_banned": user.is_banned if user else False,
        } if user else None,
        "messages": [
            {
                "id": m.id,
                "sender_type": m.sender_type,
                "message_text": m.message_text,
                "file_type": m.file_type,
                "file_name": m.file_name,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


@router.post("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Update order status with full audit logging"""
    require_god_mode(tg_user)

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    new_status = data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status required")

    old_status = order.status
    order.status = new_status

    # Set completed_at if completing
    if new_status == OrderStatus.COMPLETED.value and not order.completed_at:
        order.completed_at = datetime.now(MSK_TZ)
        # Process cashback
        try:
            await BonusService.add_order_cashback(
                session, bot, order.user_id, order_id, order.final_price
            )
        except Exception as e:
            logger.error(f"Cashback error: {e}")

    # Return promo code if order is cancelled or rejected
    if new_status in [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value]:
        if order.promo_code:
            try:
                from bot.services.promo_service import PromoService
                success, msg = await PromoService.return_promo_usage(session, order_id)
                if success:
                    logger.info(f"[God Mode] Promo returned for cancelled order #{order_id}")
                else:
                    logger.warning(f"[God Mode] Failed to return promo for order #{order_id}: {msg}")
            except Exception as e:
                logger.error(f"[God Mode] Error returning promo for order #{order_id}: {e}")

    # Log action
    await log_admin_action(
        session, tg_user, AdminActionType.ORDER_STATUS_CHANGE,
        target_type="order", target_id=order_id,
        details=f"Status: {old_status} -> {new_status}",
        old_value={"status": old_status},
        new_value={"status": new_status},
        request=request,
    )

    await session.commit()

    # Update live card in channel
    try:
        from bot.services.live_cards import update_live_card
        await update_live_card(bot, session, order)
    except Exception as e:
        logger.warning(f"Live card update failed: {e}")

    # Send notification to user
    try:
        from bot.services.realtime_notifications import send_order_update_notification
        await send_order_update_notification(order.user_id, order_id, new_status)
    except Exception as e:
        logger.warning(f"WebSocket notification failed: {e}")

    return {"success": True, "old_status": old_status, "new_status": new_status}


@router.post("/orders/{order_id}/price")
async def update_order_price(
    order_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Set order price"""
    require_god_mode(tg_user)

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    new_price = data.get("price")
    if new_price is None or new_price < 0:
        raise HTTPException(status_code=400, detail="Valid price required")

    old_price = order.price
    order.price = float(new_price)

    # Auto-transition status if needed
    old_status = order.status
    if order.status in [OrderStatus.PENDING.value, OrderStatus.WAITING_ESTIMATION.value]:
        order.status = OrderStatus.WAITING_PAYMENT.value

    await log_admin_action(
        session, tg_user, AdminActionType.ORDER_PRICE_SET,
        target_type="order", target_id=order_id,
        details=f"Price: {old_price} -> {new_price}",
        old_value={"price": old_price, "status": old_status},
        new_value={"price": new_price, "status": order.status},
        request=request,
    )

    await session.commit()

    # Update topic name and live card
    try:
        from bot.services.unified_hub import update_topic_name
        await update_topic_name(bot, session, order)
    except Exception:
        pass

    try:
        from bot.services.live_cards import update_live_card
        await update_live_card(bot, session, order)
    except Exception:
        pass

    # Notify user
    try:
        await bot.send_message(
            order.user_id,
            f"💰 <b>Цена заказа #{order_id} установлена!</b>\n\n"
            f"Сумма: <code>{new_price:.0f}₽</code>\n\n"
            f"Оплатите заказ, чтобы мы начали работу.",
        )
    except Exception:
        pass

    return {"success": True, "old_price": old_price, "new_price": new_price}


@router.post("/orders/{order_id}/progress")
async def update_order_progress(
    order_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Update order progress percentage"""
    require_god_mode(tg_user)

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    new_progress = data.get("progress", 0)
    new_progress = max(0, min(100, int(new_progress)))
    status_text = data.get("status_text")

    old_progress = order.progress
    order.progress = new_progress
    order.progress_updated_at = datetime.now(MSK_TZ)

    await log_admin_action(
        session, tg_user, AdminActionType.ORDER_PROGRESS_UPDATE,
        target_type="order", target_id=order_id,
        details=f"Progress: {old_progress}% -> {new_progress}%",
        old_value={"progress": old_progress},
        new_value={"progress": new_progress, "status_text": status_text},
        request=request,
    )

    await session.commit()

    # Send progress notification
    try:
        from bot.services.order_progress import send_progress_notification
        await send_progress_notification(bot, order, new_progress, status_text)
    except Exception as e:
        logger.warning(f"Progress notification failed: {e}")

    return {"success": True, "old_progress": old_progress, "new_progress": new_progress}


@router.post("/orders/{order_id}/confirm-payment")
async def confirm_order_payment(
    order_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Confirm payment for an order"""
    require_god_mode(tg_user)

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    amount = data.get("amount", order.final_price)
    is_full = data.get("is_full", True)

    old_status = order.status
    old_paid = order.paid_amount

    order.paid_amount += float(amount)

    if is_full or order.paid_amount >= order.final_price:
        order.status = OrderStatus.PAID_FULL.value
    else:
        order.status = OrderStatus.PAID.value

    # Update user stats
    user = await session.scalar(
        select(User).where(User.telegram_id == order.user_id)
    )
    if user:
        user.total_spent += float(amount)

    await log_admin_action(
        session, tg_user, AdminActionType.ORDER_PAYMENT_CONFIRM,
        target_type="order", target_id=order_id,
        details=f"Confirmed payment: {amount}₽",
        old_value={"status": old_status, "paid_amount": old_paid},
        new_value={"status": order.status, "paid_amount": order.paid_amount},
        request=request,
    )

    await session.commit()

    # Notify user
    try:
        await bot.send_message(
            order.user_id,
            f"✅ <b>Оплата подтверждена!</b>\n\n"
            f"Заказ: #{order_id}\n"
            f"Сумма: <code>{amount:.0f}₽</code>\n\n"
            f"Приступаем к работе! Следите за прогрессом в приложении.",
        )
    except Exception:
        pass

    # Update live card
    try:
        from bot.services.live_cards import update_live_card
        await update_live_card(bot, session, order)
    except Exception:
        pass

    return {"success": True, "new_status": order.status, "paid_amount": order.paid_amount}


@router.post("/orders/{order_id}/reject-payment")
async def reject_order_payment(
    order_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Reject payment verification"""
    require_god_mode(tg_user)

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    reason = data.get("reason", "Платёж не найден")

    old_status = order.status
    order.status = OrderStatus.WAITING_PAYMENT.value

    await log_admin_action(
        session, tg_user, AdminActionType.ORDER_PAYMENT_REJECT,
        target_type="order", target_id=order_id,
        details=f"Payment rejected: {reason}",
        old_value={"status": old_status},
        new_value={"status": order.status, "reason": reason},
        request=request,
    )

    await session.commit()

    # Notify user
    try:
        await bot.send_message(
            order.user_id,
            f"❌ <b>Платёж не подтверждён</b>\n\n"
            f"Заказ: #{order_id}\n"
            f"Причина: {reason}\n\n"
            f"Пожалуйста, проверьте перевод или свяжитесь с поддержкой.",
        )
    except Exception:
        pass

    return {"success": True, "new_status": order.status}


@router.post("/orders/{order_id}/message")
async def send_order_message(
    order_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Send message to user about order"""
    require_god_mode(tg_user)

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    text = data.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text required")

    # Save message to DB
    message = OrderMessage(
        order_id=order_id,
        sender_type="admin",
        sender_id=tg_user.id,
        message_text=text,
    )
    session.add(message)

    await log_admin_action(
        session, tg_user, AdminActionType.ORDER_MESSAGE_SEND,
        target_type="order", target_id=order_id,
        details=f"Sent message: {text[:100]}...",
        request=request,
    )

    await session.commit()

    # Send via Telegram
    try:
        await bot.send_message(
            order.user_id,
            f"💬 <b>Сообщение по заказу #{order_id}</b>\n\n{text}",
        )
    except Exception as e:
        logger.error(f"Failed to send message: {e}")

    return {"success": True, "message_id": message.id}


@router.post("/orders/{order_id}/notes")
async def update_order_notes(
    order_id: int,
    data: dict,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update admin notes for order"""
    require_god_mode(tg_user)

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.admin_notes = data.get("notes", "")
    await session.commit()

    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
#                          USERS MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/users")
async def get_users(
    search: Optional[str] = None,
    filter_type: Optional[str] = None,  # banned, watched, active, with_balance
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get users with filtering and search"""
    require_god_mode(tg_user)

    query = select(User).order_by(desc(User.created_at))

    # Apply filters
    if filter_type == "banned":
        query = query.where(User.is_banned == True)
    elif filter_type == "watched":
        query = query.where(User.is_watched == True)
    elif filter_type == "with_balance":
        query = query.where(User.balance > 0)

    # Search
    if search:
        search_term = f"%{search}%"
        try:
            user_id = int(search)
            query = query.where(User.telegram_id == user_id)
        except ValueError:
            query = query.where(
                or_(
                    User.username.ilike(search_term),
                    User.fullname.ilike(search_term),
                )
            )

    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total = await session.scalar(count_query) or 0

    # Apply pagination
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    users = result.scalars().all()

    users_data = []
    for u in users:
        rank_info = u.rank_info
        loyalty_status, loyalty_discount = u.loyalty_status
        users_data.append({
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "fullname": u.fullname,
            "balance": u.balance,
            "orders_count": u.orders_count,
            "total_spent": u.total_spent,
            "is_banned": u.is_banned,
            "is_watched": u.is_watched,
            "admin_notes": u.admin_notes,
            "rank_name": rank_info["name"],
            "rank_emoji": rank_info["emoji"],
            "loyalty_status": loyalty_status,
            "loyalty_discount": loyalty_discount,
            "referrals_count": u.referrals_count,
            "referral_earnings": u.referral_earnings,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "updated_at": u.updated_at.isoformat() if u.updated_at else None,
        })

    return {
        "users": users_data,
        "total": total,
        "has_more": offset + limit < total,
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get full user details with orders and transactions"""
    require_god_mode(tg_user)

    user = await session.scalar(
        select(User).where(User.telegram_id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get orders
    orders_result = await session.execute(
        select(Order)
        .where(Order.user_id == user_id)
        .order_by(desc(Order.created_at))
        .limit(50)
    )
    orders = orders_result.scalars().all()

    # Get transactions
    transactions_result = await session.execute(
        select(BalanceTransaction)
        .where(BalanceTransaction.user_id == user_id)
        .order_by(desc(BalanceTransaction.created_at))
        .limit(50)
    )
    transactions = transactions_result.scalars().all()

    rank_info = user.rank_info
    loyalty_status, loyalty_discount = user.loyalty_status
    bonus_expiry = user.bonus_expiry_info

    return {
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "username": user.username,
            "fullname": user.fullname,
            "balance": user.balance,
            "orders_count": user.orders_count,
            "total_spent": user.total_spent,
            "is_banned": user.is_banned,
            "is_watched": user.is_watched,
            "admin_notes": user.admin_notes,
            "ban_reason": user.ban_reason,
            "rank_name": rank_info["name"],
            "rank_emoji": rank_info["emoji"],
            "rank_cashback": rank_info["cashback"],
            "loyalty_status": loyalty_status,
            "loyalty_discount": loyalty_discount,
            "referrer_id": user.referrer_id,
            "referrals_count": user.referrals_count,
            "referral_earnings": user.referral_earnings,
            "daily_bonus_streak": user.daily_bonus_streak,
            "bonus_expiry": bonus_expiry,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "orders": [order_to_response(o).__dict__ for o in orders],
        "transactions": [
            {
                "id": t.id,
                "amount": t.amount,
                "type": t.type,
                "reason": t.reason,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions
        ],
    }


@router.post("/users/{user_id}/balance")
async def modify_user_balance(
    user_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Add or deduct balance from user"""
    require_god_mode(tg_user)

    user = await session.scalar(
        select(User).where(User.telegram_id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    amount = data.get("amount", 0)
    reason = data.get("reason", "Admin adjustment")
    notify = data.get("notify", True)

    if amount == 0:
        raise HTTPException(status_code=400, detail="Amount cannot be zero")

    old_balance = user.balance

    if amount > 0:
        await BonusService.add_bonus(
            session, user_id, float(amount),
            BonusReason.ADMIN_ADJUSTMENT,
            description=reason,
            bot=bot,
        )
        action_type = AdminActionType.USER_BALANCE_ADD
    else:
        success, _ = await BonusService.deduct_bonus(
            session, user_id, abs(float(amount)),
            BonusReason.ADMIN_ADJUSTMENT,
            description=reason,
            bot=bot,
            user=user,
        )
        if not success:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        action_type = AdminActionType.USER_BALANCE_DEDUCT

    await log_admin_action(
        session, tg_user, action_type,
        target_type="user", target_id=user_id,
        details=f"Balance: {old_balance} -> {user.balance} ({'+' if amount > 0 else ''}{amount})",
        old_value={"balance": old_balance},
        new_value={"balance": user.balance, "reason": reason},
        request=request,
    )

    # Notify user if requested
    if notify:
        try:
            emoji = "💰" if amount > 0 else "💸"
            action = "начислено" if amount > 0 else "списано"
            await bot.send_message(
                user_id,
                f"{emoji} <b>Баланс изменён</b>\n\n"
                f"{action.capitalize()}: <code>{abs(amount):.0f}₽</code>\n"
                f"Причина: {reason}\n"
                f"Новый баланс: <code>{user.balance:.0f}₽</code>",
            )
        except Exception:
            pass

    return {"success": True, "old_balance": old_balance, "new_balance": user.balance}


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Ban or unban user"""
    require_god_mode(tg_user)

    user = await session.scalar(
        select(User).where(User.telegram_id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ban = data.get("ban", True)
    reason = data.get("reason", "")

    old_banned = user.is_banned
    user.is_banned = ban
    user.ban_reason = reason if ban else None
    user.banned_at = datetime.now(MSK_TZ) if ban else None

    await log_admin_action(
        session, tg_user,
        AdminActionType.USER_BAN if ban else AdminActionType.USER_UNBAN,
        target_type="user", target_id=user_id,
        details=f"{'Banned' if ban else 'Unbanned'}: {reason}",
        old_value={"is_banned": old_banned},
        new_value={"is_banned": ban, "reason": reason},
        request=request,
    )

    await session.commit()

    # Notify user
    try:
        if ban:
            await bot.send_message(
                user_id,
                f"🚫 <b>Ваш аккаунт заблокирован</b>\n\n"
                f"Причина: {reason or 'Не указана'}\n\n"
                f"Для апелляции свяжитесь с @{settings.SUPPORT_USERNAME}",
            )
        else:
            await bot.send_message(
                user_id,
                f"✅ <b>Ваш аккаунт разблокирован!</b>\n\n"
                f"Добро пожаловать обратно в Салун!",
            )
    except Exception:
        pass

    return {"success": True, "is_banned": user.is_banned}


@router.post("/users/{user_id}/watch")
async def toggle_watch_user(
    user_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Enable/disable watch mode for user"""
    require_god_mode(tg_user)

    user = await session.scalar(
        select(User).where(User.telegram_id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    watch = data.get("watch", True)

    old_watched = user.is_watched
    user.is_watched = watch

    await log_admin_action(
        session, tg_user,
        AdminActionType.USER_WATCH_ENABLE if watch else AdminActionType.USER_WATCH_DISABLE,
        target_type="user", target_id=user_id,
        details=f"Watch mode: {old_watched} -> {watch}",
        old_value={"is_watched": old_watched},
        new_value={"is_watched": watch},
        request=request,
    )

    await session.commit()

    return {"success": True, "is_watched": user.is_watched}


@router.post("/users/{user_id}/notes")
async def update_user_notes(
    user_id: int,
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update admin notes for user"""
    require_god_mode(tg_user)

    user = await session.scalar(
        select(User).where(User.telegram_id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_notes = user.admin_notes
    user.admin_notes = data.get("notes", "")

    await log_admin_action(
        session, tg_user, AdminActionType.USER_NOTE_UPDATE,
        target_type="user", target_id=user_id,
        details=f"Notes updated",
        old_value={"notes": old_notes},
        new_value={"notes": user.admin_notes},
        request=request,
    )

    await session.commit()

    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
#                          PROMO CODES MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/promos")
async def get_promos(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all promo codes"""
    require_god_mode(tg_user)

    result = await session.execute(
        select(PromoCode).order_by(desc(PromoCode.created_at))
    )
    promos = result.scalars().all()

    return {
        "promos": [
            {
                "id": p.id,
                "code": p.code,
                "discount_percent": p.discount_percent,
                "max_uses": p.max_uses,
                "current_uses": p.current_uses,
                "is_active": p.is_active,
                "valid_from": p.valid_from.isoformat() if p.valid_from else None,
                "valid_until": p.valid_until.isoformat() if p.valid_until else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in promos
        ]
    }


@router.post("/promos")
async def create_promo(
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create new promo code"""
    require_god_mode(tg_user)

    code = data.get("code", "").strip().upper()
    if not code or len(code) < 3:
        raise HTTPException(status_code=400, detail="Code must be at least 3 characters")

    # Check if exists
    existing = await session.scalar(
        select(PromoCode).where(PromoCode.code == code)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")

    discount = data.get("discount_percent", 10)
    max_uses = data.get("max_uses", 0)
    valid_until = data.get("valid_until")

    promo = PromoCode(
        code=code,
        discount_percent=float(discount),
        max_uses=int(max_uses),
        valid_until=datetime.fromisoformat(valid_until) if valid_until else None,
        is_active=True,
        created_by=tg_user.id,
    )
    session.add(promo)

    await log_admin_action(
        session, tg_user, AdminActionType.PROMO_CREATE,
        target_type="promo",
        details=f"Created promo: {code} ({discount}%)",
        new_value={"code": code, "discount": discount, "max_uses": max_uses},
        request=request,
    )

    await session.commit()

    return {"success": True, "promo_id": promo.id, "code": code}


@router.post("/promos/{promo_id}/toggle")
async def toggle_promo(
    promo_id: int,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Toggle promo code active status"""
    require_god_mode(tg_user)

    promo = await session.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo not found")

    promo.is_active = not promo.is_active

    await log_admin_action(
        session, tg_user, AdminActionType.PROMO_TOGGLE,
        target_type="promo", target_id=promo_id,
        details=f"Toggled promo {promo.code}: {'active' if promo.is_active else 'inactive'}",
        request=request,
    )

    await session.commit()

    return {"success": True, "is_active": promo.is_active}


@router.delete("/promos/{promo_id}")
async def delete_promo(
    promo_id: int,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete promo code"""
    require_god_mode(tg_user)

    promo = await session.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo not found")

    code = promo.code
    await session.delete(promo)

    await log_admin_action(
        session, tg_user, AdminActionType.PROMO_DELETE,
        target_type="promo", target_id=promo_id,
        details=f"Deleted promo: {code}",
        request=request,
    )

    await session.commit()

    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
#                          LIVE MONITORING
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/live")
async def get_live_activity(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get live user activity - who's online and what they're doing"""
    require_god_mode(tg_user)

    now = datetime.now(MSK_TZ)
    five_min_ago = now - timedelta(minutes=5)

    # Get recent activity
    result = await session.execute(
        select(UserActivity)
        .where(UserActivity.last_activity_at >= five_min_ago)
        .order_by(desc(UserActivity.last_activity_at))
    )
    activities = result.scalars().all()

    return {
        "timestamp": now.isoformat(),
        "online_count": len(activities),
        "users": [
            {
                "telegram_id": a.telegram_id,
                "username": a.username,
                "fullname": a.fullname,
                "current_page": a.current_page,
                "current_action": a.current_action,
                "current_order_id": a.current_order_id,
                "session_duration_min": a.activity_duration_minutes,
                "last_activity": a.last_activity_at.isoformat() if a.last_activity_at else None,
                "platform": a.platform,
            }
            for a in activities
        ],
    }


@router.post("/activity")
async def update_user_activity(
    data: dict,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update user activity (called by frontend)"""
    # This endpoint is for all users, not just admin
    user_id = tg_user.id

    activity = await session.scalar(
        select(UserActivity).where(UserActivity.telegram_id == user_id)
    )

    now = datetime.now(MSK_TZ)

    if not activity:
        activity = UserActivity(
            telegram_id=user_id,
            username=tg_user.username,
            fullname=tg_user.first_name,
            session_started_at=now,
        )
        session.add(activity)

    activity.current_page = data.get("page")
    activity.current_action = data.get("action")
    activity.current_order_id = data.get("order_id")
    activity.is_online = True
    activity.platform = data.get("platform")
    activity.last_activity_at = now

    await session.commit()

    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
#                          AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/logs")
async def get_admin_logs(
    action_type: Optional[str] = None,
    target_type: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get admin action logs"""
    require_god_mode(tg_user)

    query = select(AdminActionLog).order_by(desc(AdminActionLog.created_at))

    if action_type:
        query = query.where(AdminActionLog.action_type == action_type)
    if target_type:
        query = query.where(AdminActionLog.target_type == target_type)

    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": log.id,
                "admin_id": log.admin_id,
                "admin_username": log.admin_username,
                "action_type": log.action_type,
                "action_emoji": log.action_emoji,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "details": log.details,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════════
#                          SAFE SQL CONSOLE
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/sql")
async def execute_safe_sql(
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Execute SQL query (SELECT only for safety)"""
    require_god_mode(tg_user)

    query = data.get("query", "").strip()

    if not query:
        raise HTTPException(status_code=400, detail="Query required")

    # Security: Only allow SELECT queries
    query_upper = query.upper()
    if not query_upper.startswith("SELECT"):
        raise HTTPException(
            status_code=400,
            detail="Only SELECT queries allowed. Use specific endpoints for modifications."
        )

    # Block dangerous patterns
    dangerous_patterns = [
        "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE",
        "CREATE", "GRANT", "REVOKE", ";", "--"
    ]
    for pattern in dangerous_patterns:
        if pattern in query_upper:
            raise HTTPException(status_code=400, detail=f"Query contains forbidden pattern: {pattern}")

    try:
        result = await session.execute(text(query))
        rows = result.fetchall()
        columns = list(result.keys())

        # Log the query
        await log_admin_action(
            session, tg_user, AdminActionType.SQL_EXECUTE,
            details=f"Query: {query[:200]}...",
            new_value={"query": query, "rows_returned": len(rows)},
            request=request,
        )
        await session.commit()

        return {
            "success": True,
            "columns": columns,
            "rows": [[str(item) for item in row] for row in rows[:1000]],  # Limit rows
            "total_rows": len(rows),
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "columns": [],
            "rows": [],
        }


# ═══════════════════════════════════════════════════════════════════════════════
#                          BROADCAST MESSAGING
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/broadcast")
async def send_broadcast(
    data: dict,
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot),
):
    """Send broadcast message to users"""
    require_god_mode(tg_user)

    text = data.get("text", "").strip()
    target = data.get("target", "all")  # all, active, with_orders

    if not text:
        raise HTTPException(status_code=400, detail="Message text required")

    # Get target users
    query = select(User.telegram_id).where(User.is_banned == False)

    if target == "active":
        week_ago = datetime.now(MSK_TZ) - timedelta(days=7)
        query = query.where(User.updated_at >= week_ago)
    elif target == "with_orders":
        query = query.where(User.orders_count > 0)

    result = await session.execute(query)
    user_ids = [row[0] for row in result.fetchall()]

    # Send messages
    sent = 0
    failed = 0

    for user_id in user_ids:
        try:
            await bot.send_message(user_id, text)
            sent += 1
        except Exception:
            failed += 1

    await log_admin_action(
        session, tg_user, AdminActionType.BROADCAST_SEND,
        details=f"Broadcast to {target}: {sent} sent, {failed} failed",
        new_value={"text": text[:100], "target": target, "sent": sent, "failed": failed},
        request=request,
    )
    await session.commit()

    return {"success": True, "sent": sent, "failed": failed, "total": len(user_ids)}


# ═══════════════════════════════════════════════════════════════════════════════
#                          SYSTEM INFO
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/system")
async def get_system_info(
    tg_user: TelegramUser = Depends(get_current_user),
):
    """Get system configuration info"""
    require_god_mode(tg_user)

    return {
        "bot_username": settings.BOT_USERNAME,
        "admin_ids": settings.ADMIN_IDS,
        "support_username": settings.SUPPORT_USERNAME,
        "webapp_url": settings.WEBAPP_URL,
        "payment_phone": settings.PAYMENT_PHONE,
        "payment_card": settings.PAYMENT_CARD[-4:],  # Only last 4 digits
        "payment_banks": settings.PAYMENT_BANKS,
        "orders_channel_id": settings.ORDERS_CHANNEL_ID,
        "admin_group_id": settings.ADMIN_GROUP_ID,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#                          WEBSOCKET ADMIN REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/subscribe")
async def subscribe_admin_notifications(
    tg_user: TelegramUser = Depends(get_current_user),
):
    """
    Register this admin to receive real-time WebSocket notifications.
    Call this when opening God Mode page to enable push notifications.
    """
    require_god_mode(tg_user)

    from bot.api.websocket import register_admin_id
    register_admin_id(tg_user.id)

    logger.info(f"[GOD MODE] Admin {tg_user.id} subscribed to notifications")
    return {"success": True, "message": "Subscribed to admin notifications"}


@router.post("/unsubscribe")
async def unsubscribe_admin_notifications(
    tg_user: TelegramUser = Depends(get_current_user),
):
    """
    Unregister this admin from real-time notifications.
    Call this when leaving God Mode page.
    """
    require_god_mode(tg_user)

    from bot.api.websocket import unregister_admin_id
    unregister_admin_id(tg_user.id)

    logger.info(f"[GOD MODE] Admin {tg_user.id} unsubscribed from notifications")
    return {"success": True, "message": "Unsubscribed from admin notifications"}

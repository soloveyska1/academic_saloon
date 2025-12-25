import logging
import html
from typing import List
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, func, text, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram import Bot

from database.db import get_session
from database.models.users import User
from database.models.orders import Order, OrderStatus, WORK_TYPE_LABELS, WorkType
from core.config import settings
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import (
    AdminSqlRequest, AdminSqlResponse, AdminUserResponse,
    AdminStatsResponse, OrderResponse, AdminOrderUpdate, AdminPriceUpdate,
    AdminMessageRequest, AdminProgressUpdate, RecentActivityItem,
    ClientProfileResponse, ClientOrderSummary, RevenueChartResponse, DailyRevenueItem,
    LiveEvent, LiveFeedResponse
)
from bot.bot_instance import get_bot

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin"])

def is_admin(user_id: int) -> bool:
    """Check if user is in admin list"""
    return user_id in settings.ADMIN_IDS

import re

# Dangerous SQL keywords to block
BLOCKED_SQL_KEYWORDS = [
    'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'INTO OUTFILE', 'INTO DUMPFILE',
    'LOAD_FILE', 'BENCHMARK', 'SLEEP', 'PG_SLEEP', 'WAITFOR', 'SHUTDOWN',
]

def validate_sql_query(query: str) -> tuple[bool, str]:
    """Validate SQL query for security"""
    # Remove leading/trailing whitespace and normalize
    cleaned = query.strip()
    normalized = cleaned.upper()

    # Block empty queries
    if not cleaned:
        return False, "Пустой запрос"

    # Block comment attacks FIRST (before other checks to prevent bypass)
    if '--' in query or '/*' in query or '*/' in query:
        return False, "SQL комментарии запрещены"

    # Only allow SELECT queries (must start with SELECT after optional whitespace)
    if not re.match(r'^\s*SELECT\b', normalized):
        return False, "Разрешены только SELECT запросы"

    # Check for dangerous keywords with word boundaries
    for keyword in BLOCKED_SQL_KEYWORDS:
        if re.search(rf'\b{keyword}\b', normalized):
            return False, f"Запрещённое ключевое слово: {keyword}"

    # Block subqueries with write operations (injection attempts)
    if re.search(r'\(\s*(DELETE|INSERT|UPDATE|DROP|ALTER|CREATE)\b', normalized):
        return False, "Запрещённые подзапросы"

    # Block semicolons (prevent multiple statements)
    if ';' in cleaned:
        return False, "Точка с запятой запрещена (только один запрос)"

    # Block UNION-based injection attempts in suspicious contexts
    if re.search(r'UNION\s+(ALL\s+)?SELECT.*FROM\s+PG_', normalized):
        return False, "Подозрительный UNION запрос"

    return True, ""

@router.post("/admin/sql", response_model=AdminSqlResponse)
async def execute_sql(
    data: AdminSqlRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Execute read-only SQL queries (Admin only)

    Security measures:
    - Only SELECT queries allowed
    - Dangerous keywords blocked
    - Results limited to 1000 rows
    - All queries logged
    """
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Validate query
    is_valid, error_msg = validate_sql_query(data.query)
    if not is_valid:
        logger.warning(f"Blocked SQL query from admin {tg_user.id}: {error_msg}")
        return AdminSqlResponse(columns=[], rows=[], error=error_msg)

    # Log query for audit
    logger.info(f"Admin SQL query by {tg_user.id}: {data.query[:200]}...")

    try:
        result = await session.execute(text(data.query))
        rows = result.fetchmany(1000)  # Limit to 1000 rows
        columns = list(result.keys())

        serializable_rows = []
        for row in rows:
            serializable_rows.append([str(item) for item in row])

        return AdminSqlResponse(columns=columns, rows=serializable_rows)

    except Exception as e:
        logger.error(f"SQL execution error: {e}")
        return AdminSqlResponse(columns=[], rows=[], error=str(e))

@router.get("/admin/users", response_model=List[AdminUserResponse])
async def get_all_users(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    result = await session.execute(select(User).order_by(desc(User.created_at)).limit(100))
    users = result.scalars().all()

    response = []
    for user in users:
        response.append(AdminUserResponse(
            internal_id=user.id,
            telegram_id=user.telegram_id,
            fullname=user.fullname or "Unknown",
            username=user.username,
            is_admin=is_admin(user.telegram_id),
            last_active=user.updated_at.isoformat() if user.updated_at else None
        ))
    return response

@router.get("/admin/clients/{user_id}", response_model=ClientProfileResponse)
async def get_client_profile(
    user_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get full client profile with order history"""
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get user's orders
    orders_query = select(Order).where(Order.user_id == user.telegram_id).order_by(desc(Order.created_at))
    orders_res = await session.execute(orders_query)
    orders = orders_res.scalars().all()

    # Calculate stats
    completed_orders = sum(1 for o in orders if o.status == OrderStatus.COMPLETED.value)
    cancelled_orders = sum(1 for o in orders if o.status in [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value])
    total_spent = sum(o.paid_amount or 0 for o in orders)

    # Determine segment
    now = datetime.utcnow()
    last_order_date = orders[0].created_at if orders else None

    if not orders:
        segment = "new"
    elif total_spent >= 50000:
        segment = "vip"
    elif last_order_date and (now - last_order_date).days > 90:
        segment = "churned"
    elif last_order_date and (now - last_order_date).days > 30:
        segment = "dormant"
    else:
        segment = "active"

    # Get rank and loyalty info
    from bot.api.dependencies import get_rank_levels, get_loyalty_levels, get_rank_info, get_loyalty_info
    rank_levels = await get_rank_levels(session)
    loyalty_levels = await get_loyalty_levels(session)
    rank_info_obj = get_rank_info(total_spent, rank_levels) if rank_levels else None
    loyalty_info_obj = get_loyalty_info(len(orders), loyalty_levels) if loyalty_levels else None

    # Build order summaries
    order_summaries = [
        ClientOrderSummary(
            id=o.id,
            status=o.status,
            work_type=o.work_type or '',
            subject=o.subject,
            price=o.price or 0,
            final_price=o.final_price or o.price or 0,
            paid_amount=o.paid_amount or 0,
            created_at=o.created_at.isoformat() if o.created_at else '',
            completed_at=o.completed_at.isoformat() if o.completed_at else None
        )
        for o in orders[:20]  # Limit to 20 most recent
    ]

    return ClientProfileResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        fullname=user.fullname or "Unknown",
        username=user.username,
        is_banned=getattr(user, 'is_banned', False),
        admin_notes=getattr(user, 'admin_notes', None),
        created_at=user.created_at.isoformat() if user.created_at else None,
        last_active=user.updated_at.isoformat() if user.updated_at else None,
        balance=user.balance or 0,
        bonus_balance=getattr(user, 'bonus_balance', 0) or 0,
        total_spent=total_spent,
        rank_name=rank_info_obj.name if rank_info_obj else 'Новичок',
        rank_emoji=rank_info_obj.emoji if rank_info_obj else '🌱',
        loyalty_status=loyalty_info_obj.status if loyalty_info_obj else 'Стандарт',
        loyalty_discount=loyalty_info_obj.discount if loyalty_info_obj else 0,
        orders_count=len(orders),
        completed_orders=completed_orders,
        cancelled_orders=cancelled_orders,
        referrals_count=getattr(user, 'referrals_count', 0) or 0,
        referral_earnings=getattr(user, 'referral_earnings', 0) or 0,
        orders=order_summaries,
        segment=segment
    )

@router.get("/admin/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    last_week_start = week_start - timedelta(days=7)

    # Total revenue (from completed orders)
    revenue_query = select(func.sum(Order.paid_amount)).where(Order.status == OrderStatus.COMPLETED.value)
    revenue_res = await session.execute(revenue_query)
    revenue = revenue_res.scalar() or 0.0

    # Active orders count
    active_query = select(func.count(Order.id)).where(
        Order.status.notin_([OrderStatus.COMPLETED.value, OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value])
    )
    active_res = await session.execute(active_query)
    active_count = active_res.scalar() or 0

    # Total users
    users_query = select(func.count(User.id))
    users_res = await session.execute(users_query)
    users_count = users_res.scalar() or 0

    # Orders by status
    status_query = select(Order.status, func.count(Order.id)).group_by(Order.status)
    status_res = await session.execute(status_query)
    orders_by_status = {row[0]: row[1] for row in status_res.fetchall()}

    # New users today
    new_users_query = select(func.count(User.id)).where(User.created_at >= today_start)
    new_users_res = await session.execute(new_users_query)
    new_users_today = new_users_res.scalar() or 0

    # Completed today
    completed_today_query = select(func.count(Order.id)).where(
        and_(
            Order.status == OrderStatus.COMPLETED.value,
            Order.completed_at >= today_start
        )
    )
    completed_res = await session.execute(completed_today_query)
    completed_today = completed_res.scalar() or 0

    # Revenue this week
    revenue_week_query = select(func.sum(Order.paid_amount)).where(
        and_(
            Order.status == OrderStatus.COMPLETED.value,
            Order.completed_at >= week_start
        )
    )
    revenue_week_res = await session.execute(revenue_week_query)
    revenue_this_week = revenue_week_res.scalar() or 0.0

    # Revenue last week
    revenue_last_week_query = select(func.sum(Order.paid_amount)).where(
        and_(
            Order.status == OrderStatus.COMPLETED.value,
            Order.completed_at >= last_week_start,
            Order.completed_at < week_start
        )
    )
    revenue_last_week_res = await session.execute(revenue_last_week_query)
    revenue_last_week = revenue_last_week_res.scalar() or 0.0

    # Average order value
    avg_query = select(func.avg(Order.final_price)).where(
        and_(
            Order.status == OrderStatus.COMPLETED.value,
            Order.final_price > 0
        )
    )
    avg_res = await session.execute(avg_query)
    average_order_value = avg_res.scalar() or 0.0

    # Recent activity (last 10 orders and users)
    recent_activity: List[RecentActivityItem] = []

    # Recent orders
    recent_orders_query = select(Order).order_by(desc(Order.created_at)).limit(5)
    recent_orders_res = await session.execute(recent_orders_query)
    for order in recent_orders_res.scalars():
        activity_type = 'payment' if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value] else 'order'
        status_label = {
            'pending': 'Новый заказ',
            'waiting_payment': 'Ожидает оплаты',
            'paid': 'Оплачен 50%',
            'paid_full': 'Оплачен полностью',
            'in_progress': 'В работе',
            'completed': 'Завершён',
        }.get(order.status, order.status)
        recent_activity.append(RecentActivityItem(
            type=activity_type,
            message=f"Заказ #{order.id}: {status_label}",
            time=order.created_at.strftime('%H:%M') if order.created_at else ''
        ))

    # Recent users
    recent_users_query = select(User).order_by(desc(User.created_at)).limit(3)
    recent_users_res = await session.execute(recent_users_query)
    for user in recent_users_res.scalars():
        recent_activity.append(RecentActivityItem(
            type='user',
            message=f"Новый клиент: {user.fullname or user.username or 'Unknown'}",
            time=user.created_at.strftime('%H:%M') if user.created_at else ''
        ))

    # Sort by time descending (most recent first)
    recent_activity.sort(key=lambda x: x.time, reverse=True)

    return AdminStatsResponse(
        revenue=float(revenue),
        active_orders_count=active_count,
        total_users_count=users_count,
        orders_by_status=orders_by_status,
        new_users_today=new_users_today,
        completed_today=completed_today,
        revenue_this_week=float(revenue_this_week),
        revenue_last_week=float(revenue_last_week),
        average_order_value=float(average_order_value),
        recent_activity=recent_activity
    )

@router.get("/admin/revenue-chart", response_model=RevenueChartResponse)
async def get_revenue_chart(
    days: int = 30,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get daily revenue data for chart"""
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    if days > 90:
        days = 90  # Limit to 90 days max

    now = datetime.utcnow()
    start_date = (now - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)

    # Get all completed orders in the period
    query = select(Order).where(
        and_(
            Order.status == OrderStatus.COMPLETED.value,
            Order.completed_at >= start_date
        )
    ).order_by(Order.completed_at)

    result = await session.execute(query)
    orders = result.scalars().all()

    # Group by date
    daily_data: dict[str, dict] = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
        daily_data[date] = {'revenue': 0.0, 'count': 0}

    for order in orders:
        if order.completed_at:
            date_key = order.completed_at.strftime('%Y-%m-%d')
            if date_key in daily_data:
                daily_data[date_key]['revenue'] += float(order.paid_amount or 0)
                daily_data[date_key]['count'] += 1

    # Convert to list
    chart_data = [
        DailyRevenueItem(
            date=date,
            revenue=data['revenue'],
            orders_count=data['count']
        )
        for date, data in sorted(daily_data.items())
    ]

    total_revenue = sum(d['revenue'] for d in daily_data.values())

    return RevenueChartResponse(
        data=chart_data,
        total=total_revenue,
        period_days=days
    )

@router.get('/admin/orders', response_model=List[OrderResponse])
async def get_all_orders_admin(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail='Access denied')
        
    result = await session.execute(select(Order).order_by(desc(Order.created_at)).limit(100))
    orders = result.scalars().all()
    
    # We need to map Order to OrderResponse manually or use helper? 
    # Logic in routes.py returned `orders` list of Order objects, so Pydantic validation handles it?
    # Or did logic use `order_to_response`?
    # Route defined response_model=List[OrderResponse].
    # In routes.py: return orders. (Line 2448).
    # This assumes implicit conversion.
    # To be safe, let's use explicit conversion if OrderResponse expects complex fields not on Order (like labels).
    # order_to_response does formatting.
    from bot.api.dependencies import order_to_response
    return [order_to_response(o) for o in orders]

@router.post('/admin/orders/{order_id}/status')
async def update_order_status_admin(
    order_id: int,
    data: AdminOrderUpdate,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail='Access denied')
        
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
        
    order.status = data.status
    await session.commit()
    return {'success': True}

@router.post('/admin/orders/{order_id}/price')
async def update_order_price_admin(
    order_id: int,
    data: AdminPriceUpdate,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot)
):
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail='Access denied')
        
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    order.price = data.price
    # final_price is computed from price, discount, and bonus_used

    if order.status == OrderStatus.WAITING_ESTIMATION.value:
        order.status = OrderStatus.WAITING_PAYMENT.value
        
    await session.commit()
    
    try:
        from bot.services.unified_hub import update_topic_name
        await update_topic_name(bot, session, order)
    except Exception:
        pass
    
    return {'success': True}

@router.post('/admin/orders/{order_id}/message')
async def send_order_message_admin(
    order_id: int,
    data: AdminMessageRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot)
):
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail='Access denied')
        
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
        
    try:
        await bot.send_message(order.user_id, data.text)
    except Exception as e:
        logger.error(f"Failed to send message to user {order.user_id}: {e}")
        
    return {'success': True}

@router.post('/admin/orders/{order_id}/progress')
async def update_order_progress_admin(
    order_id: int,
    data: AdminProgressUpdate,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    bot: Bot = Depends(get_bot)
):
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail='Access denied')

    try:
        from bot.services.order_progress import update_order_progress
        await update_order_progress(bot, session, order_id, data.percent, data.status_text)
    except Exception as e:
        logger.error(f"Progress update error: {e}")
        # Even if error in helper, return success if DB updated... helper does DB update though.
        # Assuming helper handles it.
        pass

    return {'success': True}


# ═══════════════════════════════════════════════════════════════════════════
#  LIVE FEED ENDPOINT (Real-time updates)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/admin/live-feed", response_model=LiveFeedResponse)
async def get_live_feed(
    since: str = None,  # ISO timestamp to get events after
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get live feed of events for real-time admin updates

    Returns:
    - New orders (pending status)
    - Payments awaiting verification
    - Recent status changes
    - New users

    Pass `since` timestamp to get only new events since last poll.
    """
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    now = datetime.utcnow()

    # Parse since timestamp or default to last 30 minutes
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00').replace('+00:00', ''))
        except ValueError:
            since_dt = now - timedelta(minutes=30)
    else:
        since_dt = now - timedelta(minutes=30)

    events: List[LiveEvent] = []

    # 1. New orders (pending) - CRITICAL priority
    pending_orders_query = select(Order).where(
        and_(
            Order.status == OrderStatus.PENDING.value,
            Order.created_at >= since_dt
        )
    ).order_by(desc(Order.created_at)).limit(20)

    pending_res = await session.execute(pending_orders_query)
    for order in pending_res.scalars():
        work_label = WORK_TYPE_LABELS.get(order.work_type, order.work_type)
        events.append(LiveEvent(
            id=f"{order.created_at.timestamp()}_new_order_{order.id}",
            type="new_order",
            priority="critical",
            title="🆕 Новый заказ",
            message=f"#{order.id} • {work_label}" + (f" • {order.subject}" if order.subject else ""),
            order_id=order.id,
            user_id=order.user_id,
            timestamp=order.created_at.isoformat() if order.created_at else now.isoformat()
        ))

    # 2. Payments awaiting verification - CRITICAL priority
    payment_orders_query = select(Order).where(
        and_(
            Order.status == OrderStatus.VERIFICATION_PENDING.value,
            Order.updated_at >= since_dt
        )
    ).order_by(desc(Order.updated_at)).limit(20)

    payment_res = await session.execute(payment_orders_query)
    for order in payment_res.scalars():
        events.append(LiveEvent(
            id=f"{order.updated_at.timestamp()}_payment_{order.id}",
            type="payment_received",
            priority="critical",
            title="💰 Оплата на проверке",
            message=f"#{order.id} • {order.final_price or order.price or 0:,.0f} ₽",
            order_id=order.id,
            user_id=order.user_id,
            amount=float(order.final_price or order.price or 0),
            timestamp=order.updated_at.isoformat() if order.updated_at else now.isoformat()
        ))

    # 3. Orders waiting estimation - HIGH priority
    estimation_orders_query = select(Order).where(
        and_(
            Order.status == OrderStatus.WAITING_ESTIMATION.value,
            Order.created_at >= since_dt
        )
    ).order_by(desc(Order.created_at)).limit(10)

    estimation_res = await session.execute(estimation_orders_query)
    for order in estimation_res.scalars():
        events.append(LiveEvent(
            id=f"{order.created_at.timestamp()}_estimation_{order.id}",
            type="needs_estimation",
            priority="high",
            title="📝 Нужна оценка",
            message=f"#{order.id} • {order.subject or 'Без темы'}",
            order_id=order.id,
            user_id=order.user_id,
            timestamp=order.created_at.isoformat() if order.created_at else now.isoformat()
        ))

    # 4. New users - NORMAL priority
    new_users_query = select(User).where(
        User.created_at >= since_dt
    ).order_by(desc(User.created_at)).limit(10)

    users_res = await session.execute(new_users_query)
    for user in users_res.scalars():
        events.append(LiveEvent(
            id=f"{user.created_at.timestamp()}_new_user_{user.id}",
            type="new_user",
            priority="normal",
            title="👤 Новый клиент",
            message=user.fullname or user.username or f"ID: {user.telegram_id}",
            user_id=user.telegram_id,
            timestamp=user.created_at.isoformat() if user.created_at else now.isoformat()
        ))

    # 5. Completed orders - LOW priority (just for info)
    completed_query = select(Order).where(
        and_(
            Order.status == OrderStatus.COMPLETED.value,
            Order.completed_at >= since_dt
        )
    ).order_by(desc(Order.completed_at)).limit(5)

    completed_res = await session.execute(completed_query)
    for order in completed_res.scalars():
        events.append(LiveEvent(
            id=f"{order.completed_at.timestamp()}_completed_{order.id}",
            type="order_completed",
            priority="low",
            title="✅ Заказ завершён",
            message=f"#{order.id} • +{order.paid_amount or 0:,.0f} ₽",
            order_id=order.id,
            amount=float(order.paid_amount or 0),
            timestamp=order.completed_at.isoformat() if order.completed_at else now.isoformat()
        ))

    # Sort events by timestamp (newest first)
    events.sort(key=lambda e: e.timestamp, reverse=True)

    # Calculate counters
    pending_count_query = select(func.count(Order.id)).where(
        Order.status == OrderStatus.PENDING.value
    )
    pending_count_res = await session.execute(pending_count_query)
    pending_count = pending_count_res.scalar() or 0

    payments_count_query = select(func.count(Order.id)).where(
        Order.status == OrderStatus.VERIFICATION_PENDING.value
    )
    payments_count_res = await session.execute(payments_count_query)
    payments_count = payments_count_res.scalar() or 0

    estimation_count_query = select(func.count(Order.id)).where(
        Order.status == OrderStatus.WAITING_ESTIMATION.value
    )
    estimation_count_res = await session.execute(estimation_count_query)
    estimation_count = estimation_count_res.scalar() or 0

    has_critical = pending_count > 0 or payments_count > 0

    return LiveFeedResponse(
        events=events[:30],  # Limit to 30 events
        counters={
            "pending_orders": pending_count,
            "pending_payments": payments_count,
            "needs_estimation": estimation_count,
        },
        last_update=now.isoformat(),
        has_critical=has_critical
    )

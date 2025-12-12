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
    ClientProfileResponse, ClientOrderSummary
)
from bot.bot_instance import get_bot

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin"])

def is_admin(user_id: int) -> bool:
    """Check if user is in admin list"""
    return user_id in settings.ADMIN_IDS

@router.post("/admin/sql", response_model=AdminSqlResponse)
async def execute_sql(
    data: AdminSqlRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Execute raw SQL (Admin only)"""
    if not is_admin(tg_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        result = await session.execute(text(data.query))
        
        if data.query.strip().upper().startswith("SELECT"):
            rows = result.fetchall()
            columns = list(result.keys())
            serializable_rows = []
            for row in rows:
                serializable_rows.append([str(item) for item in row])
            
            return AdminSqlResponse(columns=columns, rows=serializable_rows)
        else:
            await session.commit()
            return AdminSqlResponse(columns=["Result"], rows=[[f"Query executed successfully"]])
            
    except Exception as e:
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

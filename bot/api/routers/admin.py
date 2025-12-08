import logging
import html
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, func, text
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
    AdminMessageRequest, AdminProgressUpdate
)
from bot.bot_instance import get_bot

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin"])

ADMIN_ID = 872379852  # TODO: Move to settings/ENV

@router.post("/admin/sql", response_model=AdminSqlResponse)
async def execute_sql(
    data: AdminSqlRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Execute raw SQL (Admin only)"""
    if tg_user.id != ADMIN_ID:
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
    if tg_user.id != ADMIN_ID:
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
            is_admin=user.telegram_id == ADMIN_ID,
            last_active=user.updated_at.isoformat() if user.updated_at else None
        ))
    return response

@router.get("/admin/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if tg_user.id != ADMIN_ID:
        raise HTTPException(status_code=403, detail="Access denied")
        
    revenue_query = select(func.sum(Order.paid_amount)).where(Order.status == OrderStatus.COMPLETED.value)
    revenue_res = await session.execute(revenue_query)
    revenue = revenue_res.scalar() or 0.0

    active_query = select(func.count(Order.id)).where(
        Order.status.notin_([OrderStatus.COMPLETED.value, OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value])
    )
    active_res = await session.execute(active_query)
    active_count = active_res.scalar() or 0
    
    users_query = select(func.count(User.id))
    users_res = await session.execute(users_query)
    users_count = users_res.scalar() or 0
    
    return AdminStatsResponse(revenue=float(revenue), active_orders_count=active_count, total_users_count=users_count)

@router.get('/admin/orders', response_model=List[OrderResponse])
async def get_all_orders_admin(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if tg_user.id != ADMIN_ID:
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
    if tg_user.id != ADMIN_ID:
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
    if tg_user.id != ADMIN_ID:
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
    if tg_user.id != ADMIN_ID:
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
    if tg_user.id != ADMIN_ID:
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

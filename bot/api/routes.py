"""
API routes for Mini App
"""

import logging
import random
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.users import User
from database.models.orders import Order
from database.db import get_session
from core.config import settings

from .auth import TelegramUser, get_current_user
from .schemas import (
    UserResponse, OrderResponse, OrdersListResponse,
    PromoCodeRequest, PromoCodeResponse,
    RouletteResponse, ConfigResponse,
    RankInfo, LoyaltyInfo
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Mini App"])


# Rank thresholds (from User model)
RANK_LEVELS = [
    {"name": "Салага", "emoji": "🌵", "min_spent": 0, "cashback": 0},
    {"name": "Ковбой", "emoji": "🤠", "min_spent": 5000, "cashback": 3},
    {"name": "Головорез", "emoji": "🔫", "min_spent": 20000, "cashback": 5},
    {"name": "Легенда Запада", "emoji": "⭐", "min_spent": 50000, "cashback": 7},
]

# Loyalty thresholds
LOYALTY_LEVELS = [
    {"name": "Новичок", "emoji": "🌱", "min_orders": 0, "discount": 0},
    {"name": "Завсегдатай", "emoji": "🍺", "min_orders": 3, "discount": 3},
    {"name": "Шериф", "emoji": "⭐", "min_orders": 7, "discount": 5},
    {"name": "Легенда салуна", "emoji": "👑", "min_orders": 15, "discount": 10},
]


def get_rank_info(total_spent: float) -> RankInfo:
    """Calculate user rank based on total spent"""
    current_level = 0
    for i, level in enumerate(RANK_LEVELS):
        if total_spent >= level["min_spent"]:
            current_level = i

    current = RANK_LEVELS[current_level]
    next_rank = RANK_LEVELS[current_level + 1] if current_level < len(RANK_LEVELS) - 1 else None

    if next_rank:
        progress_range = next_rank["min_spent"] - current["min_spent"]
        progress_current = total_spent - current["min_spent"]
        progress = min(100, int((progress_current / progress_range) * 100))
        spent_to_next = int(next_rank["min_spent"] - total_spent)
    else:
        progress = 100
        spent_to_next = 0

    return RankInfo(
        name=current["name"],
        emoji=current["emoji"],
        level=current_level + 1,
        next_rank=next_rank["name"] if next_rank else None,
        progress=progress,
        spent_to_next=spent_to_next
    )


def get_loyalty_info(orders_count: int) -> LoyaltyInfo:
    """Calculate user loyalty based on orders count"""
    current_level = 0
    for i, level in enumerate(LOYALTY_LEVELS):
        if orders_count >= level["min_orders"]:
            current_level = i

    current = LOYALTY_LEVELS[current_level]
    next_level = LOYALTY_LEVELS[current_level + 1] if current_level < len(LOYALTY_LEVELS) - 1 else None

    if next_level:
        orders_to_next = next_level["min_orders"] - orders_count
    else:
        orders_to_next = 0

    return LoyaltyInfo(
        status=current["name"],
        emoji=current["emoji"],
        level=current_level + 1,
        discount=current["discount"],
        orders_to_next=orders_to_next
    )


def order_to_response(order: Order) -> OrderResponse:
    """Convert Order model to response schema"""
    return OrderResponse(
        id=order.id,
        status=order.status.value if hasattr(order.status, 'value') else str(order.status),
        work_type=order.work_type.value if hasattr(order.work_type, 'value') else str(order.work_type),
        work_type_label=order.work_type_label,
        subject=order.subject,
        topic=order.topic,
        deadline=None,  # TODO: add deadline field to Order model if needed
        price=float(order.price or 0),
        final_price=float(order.final_price),
        paid_amount=float(order.paid_amount or 0),
        discount=float(order.discount or 0),
        bonus_used=float(order.bonus_used or 0),
        progress=order.progress or 0,
        created_at=order.created_at.isoformat() if order.created_at else "",
        completed_at=order.completed_at.isoformat() if order.completed_at else None
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Get public configuration"""
    return ConfigResponse(
        bot_username=settings.BOT_USERNAME,
        support_username=settings.SUPPORT_USERNAME,
        reviews_channel=settings.REVIEWS_CHANNEL
    )


@router.get("/user", response_model=UserResponse)
async def get_user_profile(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get current user profile with rank, loyalty, and orders"""
    logger.info(f"[API /user] Request from telegram_id={tg_user.id} ({tg_user.first_name})")

    # Get user from database
    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()

    # Auto-register user if not found (opened Mini App before /start)
    if not user:
        logger.info(f"[API /user] User {tg_user.id} not found, auto-registering...")
        user = User(
            telegram_id=tg_user.id,
            username=tg_user.username,
            fullname=f"{tg_user.first_name} {tg_user.last_name or ''}".strip(),
            role="user",
            terms_accepted_at=datetime.utcnow(),  # Implicit consent via Mini App
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logger.info(f"[API /user] User {tg_user.id} auto-registered successfully")

    # Get user's orders (Order.user_id = telegram_id, NOT internal id!)
    orders_result = await session.execute(
        select(Order)
        .where(Order.user_id == user.telegram_id)
        .order_by(desc(Order.created_at))
        .limit(50)
    )
    orders = orders_result.scalars().all()

    # Calculate completed orders count
    completed_orders = sum(1 for o in orders if str(o.status) == 'completed' or (hasattr(o.status, 'value') and o.status.value == 'completed'))

    # Generate referral code from telegram_id
    referral_code = f"REF{user.telegram_id}"

    # Check daily bonus availability
    can_spin = True
    if user.last_daily_bonus_at:
        next_spin = user.last_daily_bonus_at + timedelta(hours=24)
        can_spin = datetime.utcnow() >= next_spin

    return UserResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        username=user.username,
        fullname=user.fullname or tg_user.first_name,
        balance=float(user.balance or 0),
        bonus_balance=float(user.referral_earnings or 0),  # Using referral_earnings as bonus
        orders_count=user.orders_count or 0,
        total_spent=float(user.total_spent or 0),
        discount=get_loyalty_info(completed_orders).discount,
        referral_code=referral_code,
        daily_luck_available=can_spin,
        rank=get_rank_info(float(user.total_spent or 0)),
        loyalty=get_loyalty_info(completed_orders),
        orders=[order_to_response(o) for o in orders]
    )


@router.get("/orders", response_model=OrdersListResponse)
async def get_orders(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get user's orders with optional filtering"""

    # Get user from database to get internal user.id
    user_result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = select(Order).where(Order.user_id == user.telegram_id)

    if status:
        # Filter by status
        if status == "active":
            query = query.where(Order.status.notin_(['completed', 'cancelled', 'rejected']))
        elif status == "completed":
            query = query.where(Order.status == 'completed')
        else:
            query = query.where(Order.status == status)

    # Count total
    count_result = await session.execute(
        query.with_only_columns(Order.id)
    )
    total = len(count_result.all())

    # Get paginated results
    query = query.order_by(desc(Order.created_at)).offset(offset).limit(limit)
    result = await session.execute(query)
    orders = result.scalars().all()

    return OrdersListResponse(
        orders=[order_to_response(o) for o in orders],
        total=total,
        has_more=offset + len(orders) < total
    )


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get single order details"""

    # Get user from database to get internal user.id
    user_result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await session.execute(
        select(Order).where(
            Order.id == order_id,
            Order.user_id == user.telegram_id
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return order_to_response(order)


@router.post("/promo", response_model=PromoCodeResponse)
async def apply_promo_code(
    data: PromoCodeRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Apply promo code"""

    code = data.code.upper().strip()

    # TODO: Implement real promo code system
    # For now, hardcoded demo codes
    promo_codes = {
        "COWBOY20": {"discount": 20, "message": "Йи-ха! Скидка 20% применена!"},
        "SALOON10": {"discount": 10, "message": "Скидка 10% — добро пожаловать в салун!"},
        "WELCOME5": {"discount": 5, "message": "Скидка 5% для новичка!"},
    }

    if code in promo_codes:
        promo = promo_codes[code]
        return PromoCodeResponse(
            success=True,
            message=promo["message"],
            discount=promo["discount"]
        )

    return PromoCodeResponse(
        success=False,
        message="Промокод не найден или истёк"
    )


@router.post("/roulette/spin", response_model=RouletteResponse)
async def spin_roulette(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Spin daily luck roulette"""

    # Get user
    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check cooldown
    now = datetime.utcnow()
    if user.last_daily_bonus_at:
        next_spin = user.last_daily_bonus_at + timedelta(hours=24)
        if now < next_spin:
            return RouletteResponse(
                success=False,
                message="Колесо фортуны ещё отдыхает",
                next_spin_at=next_spin.isoformat()
            )

    # Spin the wheel!
    prizes = [
        {"prize": "50 бонусов", "type": "bonus", "value": 50, "weight": 30},
        {"prize": "100 бонусов", "type": "bonus", "value": 100, "weight": 15},
        {"prize": "200 бонусов", "type": "bonus", "value": 200, "weight": 5},
        {"prize": "5% скидка", "type": "discount", "value": 5, "weight": 20},
        {"prize": "10% скидка", "type": "discount", "value": 10, "weight": 10},
        {"prize": "Попробуй завтра", "type": "nothing", "value": 0, "weight": 20},
    ]

    # Weighted random selection
    total_weight = sum(p["weight"] for p in prizes)
    rand = random.randint(1, total_weight)
    cumulative = 0
    selected = prizes[-1]
    for prize in prizes:
        cumulative += prize["weight"]
        if rand <= cumulative:
            selected = prize
            break

    # Update user's last spin time
    user.last_daily_bonus_at = now

    # Apply bonus if won
    if selected["type"] == "bonus":
        user.referral_earnings = (user.referral_earnings or 0) + selected["value"]

    await session.commit()

    next_spin_at = (now + timedelta(hours=24)).isoformat()

    if selected["type"] == "nothing":
        return RouletteResponse(
            success=True,
            prize=selected["prize"],
            type=selected["type"],
            value=0,
            message="Не повезло! Возвращайся завтра, ковбой!",
            next_spin_at=next_spin_at
        )

    return RouletteResponse(
        success=True,
        prize=selected["prize"],
        type=selected["type"],
        value=selected["value"],
        message=f"Поздравляем! Ты выиграл {selected['prize']}!",
        next_spin_at=next_spin_at
    )

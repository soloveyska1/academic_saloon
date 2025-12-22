import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_session
from database.models.users import User
from database.models.orders import Order, OrderStatus
from database.models.transactions import BalanceTransaction
from core.config import settings
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import (
    UserResponse, ConfigResponse, BonusExpiryInfo, BalanceTransactionResponse
)
from bot.api.dependencies import (
    get_rank_levels, get_loyalty_levels, get_rank_info, get_loyalty_info, order_to_response
)
from bot.services.qr_generator import generate_premium_qr_card, generate_simple_qr
# Rate limiting temporarily disabled - uncomment when slowapi is installed on server
# from bot.api.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth & User"])

@router.get("/config", response_model=ConfigResponse)
# @limiter.limit("60/minute")  # Rate limiting disabled
async def get_config(request: Request):
    """Get public configuration"""
    return ConfigResponse(
        bot_username=settings.BOT_USERNAME,
        support_username=settings.SUPPORT_USERNAME,
        reviews_channel=settings.REVIEWS_CHANNEL
    )

@router.get("/user", response_model=UserResponse)
# @limiter.limit("30/minute")  # Rate limiting disabled
async def get_user_profile(
    request: Request,
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
            terms_accepted_at=datetime.now(timezone.utc),  # Implicit consent via Mini App
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

    # OPTIMIZED: Single query for all order statistics (was 3 separate queries)
    # Combines: total_orders count, completed_orders count, and total_spent sum
    stats_query = select(
        func.count(Order.id).label('total_orders'),
        func.count(Order.id).filter(Order.status == OrderStatus.COMPLETED.value).label('completed_orders'),
        func.coalesce(func.sum(Order.paid_amount).filter(Order.status == OrderStatus.COMPLETED.value), 0).label('total_spent')
    ).where(Order.user_id == user.telegram_id)

    stats_result = await session.execute(stats_query)
    stats = stats_result.one()

    total_orders_count = stats.total_orders or 0
    completed_orders = stats.completed_orders or 0
    actual_total_spent = float(stats.total_spent or 0)

    # OPTIMIZED: rank_levels and loyalty_levels now use 5-minute cache
    rank_levels = await get_rank_levels(session)
    loyalty_levels = await get_loyalty_levels(session)
    rank_info = get_rank_info(actual_total_spent, rank_levels)
    loyalty_info = get_loyalty_info(completed_orders, loyalty_levels)

    # Generate referral code from telegram_id
    referral_code = f"REF{user.telegram_id}"

    # Recent balance transactions
    tx_result = await session.execute(
        select(BalanceTransaction)
        .where(BalanceTransaction.user_id == user.telegram_id)
        .order_by(desc(BalanceTransaction.created_at))
        .limit(20)
    )
    transactions = tx_result.scalars().all()

    # Check daily bonus availability (use timezone-aware datetime!)
    can_spin = True
    if user.last_daily_bonus_at:
        # Ensure both datetimes are timezone-aware for comparison
        next_spin = user.last_daily_bonus_at + timedelta(hours=24)
        now_utc = datetime.now(timezone.utc)
        # If next_spin is naive, make it aware
        if next_spin.tzinfo is None:
            next_spin = next_spin.replace(tzinfo=timezone.utc)
        can_spin = now_utc >= next_spin

    # Get bonus expiry info
    bonus_expiry_data = user.bonus_expiry_info
    bonus_expiry = BonusExpiryInfo(**bonus_expiry_data) if bonus_expiry_data else None

    return UserResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        username=user.username,
        fullname=user.fullname or tg_user.first_name,
        balance=round(float(user.balance or 0), 2),
        bonus_balance=round(float(user.balance or 0), 2),  # Same as balance - no separate bonus_balance in DB
        orders_count=total_orders_count,  # Use actual count from orders table
        total_spent=actual_total_spent,   # Use actual sum from completed orders
        discount=loyalty_info.discount,
        referral_code=referral_code,
        daily_luck_available=can_spin,
        daily_bonus_streak=user.daily_bonus_streak or 0,
        rank=rank_info,  # Use actual total spent
        loyalty=loyalty_info,
        bonus_expiry=bonus_expiry,
        transactions=[
            BalanceTransactionResponse(
                id=tx.id,
                amount=round(float(tx.amount), 2),
                type=tx.type,
                reason=tx.reason,
                description=tx.description,
                created_at=tx.created_at.isoformat() if tx.created_at else "",
            )
            for tx in transactions
        ],
        orders=[order_to_response(o) for o in orders]
    )

@router.get("/qr/referral")
async def get_referral_qr(
    current_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    style: str = "card"  # "card" or "simple"
):
    """
    Generate a premium QR code for user's referral link.

    style: "card" - full branded card, "simple" - just the QR code
    """
    # Get user by telegram_id (not by primary key!)
    user_result = await session.execute(
        select(User).where(User.telegram_id == current_user.id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Referral code for display
    referral_code = f"REF{user.telegram_id}"

    # Get username for personalization
    username = user.username or user.fullname or "друг"

    if style == "simple":
        # Simple QR code (just the QR, no card)
        qr_bytes = generate_simple_qr(user_id=user.telegram_id, size=400)
    else:
        # Premium branded card with QR
        qr_bytes = generate_premium_qr_card(
            user_id=user.telegram_id,
            username=username,
            referral_code=referral_code,
            invited_count=user.referrals_count or 0,
            earnings=user.referral_earnings or 0.0,
        )

    if not qr_bytes:
        raise HTTPException(
            status_code=500,
            detail="QR generation failed. Please try again."
        )

    return Response(
        content=qr_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="academic-saloon-{referral_code}.png"',
            "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
        }
    )

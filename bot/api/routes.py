"""
API routes for Mini App
"""

import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.users import User
from database.models.orders import Order, Conversation, ConversationType
from database.db import get_session
from core.config import settings

from .auth import TelegramUser, get_current_user
from .rate_limit import rate_limit_default, rate_limit_create, rate_limit_roulette, rate_limit_payment
from .schemas import (
    UserResponse, OrderResponse, OrdersListResponse,
    PromoCodeRequest, PromoCodeResponse,
    RouletteResponse, ConfigResponse,
    RankInfo, LoyaltyInfo,
    OrderCreateRequest, OrderCreateResponse
)
from database.models.orders import WorkType, OrderStatus, WORK_TYPE_LABELS
from bot.services.pricing import calculate_price, DEADLINE_LABELS
from bot.bot_instance import get_bot
from bot.services.mini_app_logger import (
    log_order_created, log_roulette_spin, log_mini_app_event, MiniAppEvent
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

# Loyalty thresholds (premium naming)
LOYALTY_LEVELS = [
    {"name": "Резидент", "emoji": "🌵", "min_orders": 0, "discount": 0},
    {"name": "Партнёр", "emoji": "🤝", "min_orders": 3, "discount": 3},
    {"name": "VIP-Клиент", "emoji": "⭐", "min_orders": 7, "discount": 5},
    {"name": "Премиум", "emoji": "👑", "min_orders": 15, "discount": 10},
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
        payment_scheme=order.payment_scheme,  # full / half
        files_url=getattr(order, 'files_url', None),  # Work files URL (Yandex.Disk)
        review_submitted=getattr(order, 'review_submitted', False),  # Whether review was submitted
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

    # Calculate orders counts from actual orders (more reliable than DB field)
    total_orders_count = len(orders)
    completed_orders = sum(1 for o in orders if str(o.status) == 'completed' or (hasattr(o.status, 'value') and o.status.value == 'completed'))

    # Calculate total spent from actual orders (more reliable than DB field)
    actual_total_spent = sum(float(o.paid_amount or o.price or 0) for o in orders if str(o.status) == 'completed' or (hasattr(o.status, 'value') and o.status.value == 'completed'))

    # Generate referral code from telegram_id
    referral_code = f"REF{user.telegram_id}"

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

    return UserResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        username=user.username,
        fullname=user.fullname or tg_user.first_name,
        balance=float(user.balance or 0),
        bonus_balance=float(user.referral_earnings or 0),  # Using referral_earnings as bonus
        orders_count=total_orders_count,  # Use actual count from orders table
        total_spent=actual_total_spent,   # Use actual sum from completed orders
        discount=get_loyalty_info(completed_orders).discount,
        referral_code=referral_code,
        daily_luck_available=can_spin,
        rank=get_rank_info(actual_total_spent),  # Use actual total spent
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
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Spin daily luck roulette"""
    # Rate limit check
    await rate_limit_roulette.check(request)

    # Get user
    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check cooldown (use timezone-aware datetime!)
    now = datetime.now(timezone.utc)

    # Check if user is admin (for testing purposes)
    is_admin = user.telegram_id in settings.ADMIN_IDS

    # Standard cooldown logic
    can_spin = True  # Default to true if no previous spin
    if user.last_daily_bonus_at and not is_admin:
        next_spin = user.last_daily_bonus_at + timedelta(hours=24)
        if next_spin.tzinfo is None:
            next_spin = next_spin.replace(tzinfo=timezone.utc)
        can_spin = now >= next_spin

    # Block users who can't spin
    if not can_spin:
        next_spin = user.last_daily_bonus_at + timedelta(hours=24)
        if next_spin.tzinfo is None:
            next_spin = next_spin.replace(tzinfo=timezone.utc)
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

    # Log to Mini App topic
    try:
        bot = get_bot()
        await log_roulette_spin(
            bot=bot,
            user_id=user.telegram_id,
            username=user.username,
            prize=selected["prize"],
            prize_type=selected["type"],
            value=selected["value"],
        )
    except Exception as e:
        logger.warning(f"[API /roulette/spin] Failed to log: {e}")

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


# ═══════════════════════════════════════════════════════════════════════════
#  ORDER CREATION (Web App First)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/orders/create", response_model=OrderCreateResponse)
async def create_order(
    request: Request,
    data: OrderCreateRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new order from Mini App.
    Calculates preliminary price and notifies admins via Forum Topic.
    """
    # Rate limit check - prevent order spam
    await rate_limit_create.check(request)
    from bot.handlers.order_chat import get_or_create_topic
    from bot.services.live_cards import send_or_update_card

    logger.info(f"[API /orders/create] New order from user {tg_user.id}: {data.work_type}")

    # Get shared bot instance
    bot = get_bot()

    # Get or create user
    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Auto-register
        user = User(
            telegram_id=tg_user.id,
            username=tg_user.username,
            fullname=f"{tg_user.first_name} {tg_user.last_name or ''}".strip(),
            role="user",
            terms_accepted_at=datetime.utcnow(),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    # Validate work_type
    try:
        work_type_enum = WorkType(data.work_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid work_type: {data.work_type}")

    # Calculate price
    user_discount = get_loyalty_info(user.orders_count or 0).discount
    price_calc = calculate_price(
        work_type=data.work_type,
        deadline_key=data.deadline,
        discount_percent=user_discount
    )

    # Determine initial status - Web orders always start as WAITING_ESTIMATION
    # to ensure admin review
    initial_status = OrderStatus.WAITING_ESTIMATION.value

    # Create order
    order = Order(
        user_id=user.telegram_id,
        work_type=data.work_type,
        subject=data.subject,
        topic=data.topic,
        description=data.description,
        deadline=data.deadline,
        price=float(price_calc.final_price) if not price_calc.is_manual_required else 0.0,
        discount=float(user_discount),
        status=initial_status,
    )

    try:
        session.add(order)
        await session.commit()
        await session.refresh(order)
    except Exception as db_error:
        logger.error(f"[API /orders/create] Database error: {db_error}")
        await session.rollback()
        return OrderCreateResponse(
            success=False,
            order_id=0,
            message="Ошибка создания заказа. Попробуйте позже.",
            price=None,
            is_manual_required=False
        )

    logger.info(f"[API /orders/create] Order #{order.id} created, status={initial_status}, price={price_calc.final_price}")

    # ═══ WEBSOCKET SMART УВЕДОМЛЕНИЕ О НОВОМ ЗАКАЗЕ ═══
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=tg_user.id,
            order_id=order.id,
            new_status=initial_status,
            extra_data={"work_type": data.work_type, "subject": data.subject, "is_new": True}
        )
    except Exception as e:
        logger.warning(f"[WS] Failed to send new order notification: {e}")

    # ═══════════════════════════════════════════════════════════════
    #  ADMIN WORKFLOW INTEGRATION
    # ═══════════════════════════════════════════════════════════════

    try:
        # 1. Create Forum Topic in Admin Group
        conv, topic_id = await get_or_create_topic(
            bot=bot,
            session=session,
            user_id=user.telegram_id,
            order_id=order.id,
            conv_type=ConversationType.ORDER_CHAT.value,
        )
        logger.info(f"[API /orders/create] Created topic {topic_id} for order #{order.id}")

        # 2. Send/Update Order Card in Topic
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username,
            client_name=user.fullname,
            extra_text="📱 Заказ из Mini App",
        )
        logger.info(f"[API /orders/create] Order card sent to topic for order #{order.id}")

    except Exception as e:
        # Don't fail the order creation if admin notification fails
        logger.error(f"[API /orders/create] Failed to notify admins for order #{order.id}: {e}")

    # ═══════════════════════════════════════════════════════════════
    #  USER NOTIFICATION
    # ═══════════════════════════════════════════════════════════════

    try:
        # Send confirmation message to user
        work_label = WORK_TYPE_LABELS.get(work_type_enum, data.work_type)

        user_message = f"""✅ <b>Заказ #{order.id} принят!</b>

📋 <b>{work_label}</b>
📚 {data.subject}
⏰ Срок: {data.deadline}

Менеджер оценит заказ и вернётся с точной ценой.
Следи за обновлениями в Мини-апп! 👇"""

        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="📱 Открыть Мини-апп",
                web_app={"url": f"{settings.WEBAPP_URL}/orders"}
            )],
            [InlineKeyboardButton(
                text="💬 Написать менеджеру",
                callback_data=f"enter_chat_order_{order.id}"
            )],
        ])

        await bot.send_message(
            chat_id=user.telegram_id,
            text=user_message,
            reply_markup=keyboard,
        )
        logger.info(f"[API /orders/create] User {user.telegram_id} notified about order #{order.id}")

    except Exception as e:
        logger.warning(f"[API /orders/create] Failed to notify user about order #{order.id}: {e}")

    # ═══════════════════════════════════════════════════════════════
    #  MINI APP LOG
    # ═══════════════════════════════════════════════════════════════

    try:
        await log_order_created(
            bot=bot,
            user_id=user.telegram_id,
            username=user.username,
            order_id=order.id,
            work_type=WORK_TYPE_LABELS.get(work_type_enum, data.work_type),
            subject=data.subject,
            price=price_calc.final_price if not price_calc.is_manual_required else None,
        )
    except Exception as e:
        logger.warning(f"[API /orders/create] Failed to log to Mini App topic: {e}")

    # Prepare response message
    if price_calc.is_manual_required:
        message = "🦄 Спецзаказ принят! Шериф оценит сложность и вернётся с ценой."
    else:
        message = f"✅ Заказ #{order.id} создан! Ожидайте оценку от менеджера."

    return OrderCreateResponse(
        success=True,
        order_id=order.id,
        message=message,
        price=float(price_calc.final_price) if not price_calc.is_manual_required else None,
        is_manual_required=price_calc.is_manual_required
    )


# ═══════════════════════════════════════════════════════════════════════════
#  FILE UPLOAD (Yandex.Disk Integration)
# ═══════════════════════════════════════════════════════════════════════════

from fastapi import File, UploadFile
from typing import List
from bot.services.yandex_disk import yandex_disk_service


class FileUploadResponse(BaseModel):
    success: bool
    message: str
    files_url: Optional[str] = None
    uploaded_count: int = 0


@router.post("/orders/{order_id}/upload-files", response_model=FileUploadResponse)
async def upload_order_files(
    order_id: int,
    files: List[UploadFile] = File(...),
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Upload files to an order. Files are stored on Yandex.Disk.
    Returns the public folder URL.
    """
    logger.info(f"[API /orders/{order_id}/upload-files] Upload request from user {tg_user.id}, {len(files)} files")

    # Get user
    user_result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Check if Yandex Disk is available
    if not yandex_disk_service.is_available:
        logger.warning("[API] Yandex Disk not configured, skipping file upload")
        return FileUploadResponse(
            success=False,
            message="Файловое хранилище временно недоступно",
            uploaded_count=0
        )

    # Read all files
    file_data = []
    for file in files:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:  # 50MB limit per file
            continue
        file_data.append((content, file.filename))

    if not file_data:
        return FileUploadResponse(
            success=False,
            message="Нет файлов для загрузки или файлы слишком большие",
            uploaded_count=0
        )

    # Upload to Yandex Disk
    result = await yandex_disk_service.upload_multiple_files(
        files=file_data,
        order_id=order.id,
        client_name=user.fullname or f"User_{user.telegram_id}",
        work_type=order.work_type,
        telegram_id=user.telegram_id,
    )

    if result.success:
        # Save the folder URL to order
        order.files_url = result.folder_url
        await session.commit()

        # Update the order card in admin topic with files link
        try:
            bot = get_bot()
            from bot.services.live_cards import send_or_update_card
            await send_or_update_card(
                bot=bot,
                order=order,
                session=session,
                client_username=user.username,
                client_name=user.fullname,
                extra_text=f"📎 {len(file_data)} файл(ов) загружено",
            )
        except Exception as e:
            logger.warning(f"[API] Failed to update order card: {e}")

        logger.info(f"[API /orders/{order_id}/upload-files] Uploaded {len(file_data)} files")

        return FileUploadResponse(
            success=True,
            message=f"✅ Загружено {len(file_data)} файл(ов)",
            files_url=result.folder_url,
            uploaded_count=len(file_data)
        )

    return FileUploadResponse(
        success=False,
        message=f"Ошибка загрузки: {result.error}",
        uploaded_count=0
    )


# ═══════════════════════════════════════════════════════════════════════════
#  PAYMENT CONFIRMATION (Manual Transfer Flow)
# ═══════════════════════════════════════════════════════════════════════════

class PaymentConfirmRequest(BaseModel):
    payment_method: str  # 'card', 'sbp', 'transfer'
    payment_scheme: str  # 'full', 'half'


class PaymentConfirmResponse(BaseModel):
    success: bool
    message: str
    new_status: str
    amount_to_pay: float


@router.post("/orders/{order_id}/confirm-payment", response_model=PaymentConfirmResponse)
async def confirm_payment(
    request: Request,
    order_id: int,
    data: PaymentConfirmRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    User confirms they have made a manual payment.
    Changes status to VERIFICATION_PENDING and notifies admins.
    """
    # Rate limit check
    await rate_limit_payment.check(request)

    logger.info(f"[API /orders/{order_id}/confirm-payment] User {tg_user.id} confirming payment")

    # Get user
    user_result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Check order can accept payment (has price, not paid, not cancelled/completed)
    cancelled_statuses = [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value, OrderStatus.COMPLETED.value]
    if order.status in cancelled_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot accept payment (status: {order.status})"
        )

    if not order.final_price or order.final_price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Order has no price set yet"
        )

    if order.paid_amount and order.paid_amount >= order.final_price:
        raise HTTPException(
            status_code=400,
            detail="Order is already fully paid"
        )

    # Calculate amount based on scheme
    final_price = order.final_price
    if data.payment_scheme == 'half':
        amount_to_pay = final_price / 2
    else:
        amount_to_pay = final_price

    # Update order
    order.status = OrderStatus.VERIFICATION_PENDING.value
    order.payment_method = data.payment_method
    order.payment_scheme = data.payment_scheme
    await session.commit()

    # ═══ WEBSOCKET SMART УВЕДОМЛЕНИЕ ═══
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=tg_user.id,
            order_id=order_id,
            new_status=order.status,
            extra_data={"payment_method": data.payment_method, "payment_scheme": data.payment_scheme}
        )
    except Exception as e:
        logger.warning(f"[WS] Failed to send payment notification: {e}")

    # Notify admin in topic
    try:
        bot = get_bot()

        # Update order card
        from bot.services.live_cards import send_or_update_card
        scheme_text = "100%" if data.payment_scheme == 'full' else "50% аванс"
        method_text = {"card": "Карта", "sbp": "СБП", "transfer": "Перевод"}.get(data.payment_method, data.payment_method)

        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username,
            client_name=user.fullname,
            extra_text=f"💳 Ожидает проверки: {scheme_text} ({method_text})\n💰 Сумма: {amount_to_pay:,.0f}₽".replace(",", " "),
        )

        # Send notification to user
        await bot.send_message(
            chat_id=user.telegram_id,
            text=f"✅ <b>Заявка на оплату принята!</b>\n\n"
                 f"Заказ <code>#{order.id}</code>\n"
                 f"Сумма: <b>{amount_to_pay:,.0f}₽</b>\n\n"
                 f"Менеджер проверит поступление и подтвердит.\n"
                 f"Обычно это занимает 5-15 минут.".replace(",", " ")
        )

    except Exception as e:
        logger.error(f"[API] Failed to notify about payment: {e}")

    # Log to Mini App topic
    try:
        await log_mini_app_event(
            bot=get_bot(),
            event=MiniAppEvent.ORDER_VIEW,
            user_id=user.telegram_id,
            username=user.username,
            order_id=order.id,
            details=f"Подтвердил оплату: {amount_to_pay:,.0f}₽".replace(",", " "),
        )
    except Exception as e:
        logger.warning(f"[API] Failed to log payment confirmation: {e}")

    return PaymentConfirmResponse(
        success=True,
        message="Заявка на оплату отправлена на проверку",
        new_status=order.status,
        amount_to_pay=amount_to_pay
    )


# ═══════════════════════════════════════════════════════════════════════════
#  PAYMENT INFO (Get payment details for order)
# ═══════════════════════════════════════════════════════════════════════════

class PaymentInfoResponse(BaseModel):
    order_id: int
    status: str
    price: float
    final_price: float
    discount: float
    bonus_used: float
    paid_amount: float
    remaining: float
    card_number: str
    card_holder: str
    sbp_phone: str
    sbp_bank: str


@router.get("/orders/{order_id}/payment-info", response_model=PaymentInfoResponse)
async def get_payment_info(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get payment details for an order including bank requisites.
    Only available for orders that are awaiting payment.
    """
    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Only show payment info for orders that need payment
    allowed_statuses = [
        OrderStatus.CONFIRMED.value,           # After price is set by admin
        OrderStatus.WAITING_PAYMENT.value,     # Awaiting payment
        OrderStatus.VERIFICATION_PENDING.value, # User clicked "I paid"
        OrderStatus.PAID.value,                # Half paid, needs remaining
    ]
    if order.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Реквизиты доступны только для заказов, ожидающих оплаты"
        )

    # Must have a price set
    if not order.final_price or order.final_price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Цена заказа ещё не определена"
        )

    # Already fully paid
    if order.paid_amount and order.paid_amount >= order.final_price:
        raise HTTPException(
            status_code=400,
            detail="Заказ уже полностью оплачен"
        )

    # Format card number with spaces for display (XXXX XXXX XXXX XXXX)
    card_raw = settings.PAYMENT_CARD.replace(" ", "").replace("-", "")
    card_formatted = " ".join([card_raw[i:i+4] for i in range(0, len(card_raw), 4)])

    # Format phone for display
    phone_raw = settings.PAYMENT_PHONE.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if phone_raw.startswith("8"):
        phone_raw = "+7" + phone_raw[1:]
    elif not phone_raw.startswith("+"):
        phone_raw = "+7" + phone_raw
    # Format as +7 (XXX) XXX-XX-XX
    if len(phone_raw) >= 12:
        phone_formatted = f"{phone_raw[:2]} ({phone_raw[2:5]}) {phone_raw[5:8]}-{phone_raw[8:10]}-{phone_raw[10:12]}"
    else:
        phone_formatted = phone_raw

    return PaymentInfoResponse(
        order_id=order.id,
        status=order.status,
        price=float(order.price),
        final_price=float(order.final_price),
        discount=float(order.discount),
        bonus_used=float(order.bonus_used),
        paid_amount=float(order.paid_amount or 0),
        remaining=float(order.final_price - (order.paid_amount or 0)),
        # Payment requisites from settings
        card_number=card_formatted,
        card_holder=settings.PAYMENT_NAME.upper(),
        sbp_phone=phone_formatted,
        sbp_bank=settings.PAYMENT_BANKS,
    )


# ═══════════════════════════════════════════════════════════════════════════
#  CHAT API — In-App Messaging
# ═══════════════════════════════════════════════════════════════════════════

from database.models.orders import OrderMessage


class ChatMessageResponse(BaseModel):
    id: int
    sender_type: str  # 'admin' | 'client'
    sender_name: str
    message_text: Optional[str]
    file_type: Optional[str]
    file_name: Optional[str]
    file_url: Optional[str]
    created_at: str
    is_read: bool


class ChatMessagesListResponse(BaseModel):
    order_id: int
    messages: List[ChatMessageResponse]
    unread_count: int


class SendMessageRequest(BaseModel):
    text: str


class SendMessageResponse(BaseModel):
    success: bool
    message_id: int
    message: str


@router.get("/orders/{order_id}/messages", response_model=ChatMessagesListResponse)
async def get_order_messages(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Get chat messages for an order.
    Only the order owner can access messages.
    """
    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Get messages
    query = (
        select(OrderMessage)
        .where(OrderMessage.order_id == order_id)
        .order_by(OrderMessage.created_at.asc())
    )
    result = await session.execute(query)
    messages = result.scalars().all()

    # Mark messages as read (from admin)
    unread_count = 0
    for msg in messages:
        if msg.sender_type == 'admin' and not msg.is_read:
            msg.is_read = True
            unread_count += 1

    if unread_count > 0:
        await session.commit()

    # Format response
    formatted_messages = []
    for msg in messages:
        formatted_messages.append(ChatMessageResponse(
            id=msg.id,
            sender_type=msg.sender_type,
            sender_name="Менеджер" if msg.sender_type == 'admin' else "Вы",
            message_text=msg.message_text,
            file_type=msg.file_type,
            file_name=msg.file_name,
            file_url=msg.yadisk_url,
            created_at=msg.created_at.isoformat() if msg.created_at else "",
            is_read=msg.is_read or False,
        ))

    return ChatMessagesListResponse(
        order_id=order_id,
        messages=formatted_messages,
        unread_count=sum(1 for m in messages if m.sender_type == 'admin' and not m.is_read),
    )


@router.post("/orders/{order_id}/messages", response_model=SendMessageResponse)
async def send_order_message(
    order_id: int,
    data: SendMessageRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Send a chat message for an order.
    Message is forwarded to admin via Forum Topics.
    """
    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Validate message
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(text) > 4000:
        raise HTTPException(status_code=400, detail="Message too long (max 4000 chars)")

    # Get user
    user = await session.get(User, tg_user.id)

    # Create message record
    message = OrderMessage(
        order_id=order_id,
        sender_type='client',
        sender_id=tg_user.id,
        message_text=text,
        is_read=False,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)

    # Forward to admin via Forum Topic
    try:
        bot = get_bot()

        # Get or create conversation topic
        from bot.handlers.order_chat import get_or_create_topic

        conv = await get_or_create_topic(
            bot=bot,
            session=session,
            user_id=tg_user.id,
            order_id=order_id,
            user_full_name=user.fullname if user else tg_user.first_name,
            username=user.username if user else tg_user.username,
        )

        if conv and conv.topic_id:
            # Send message to admin topic
            user_name = user.fullname if user else tg_user.first_name
            username_part = f" (@{user.username})" if user and user.username else ""

            admin_text = (
                f"💬 <b>Сообщение от клиента</b> (Mini App)\n"
                f"👤 {user_name}{username_part}\n\n"
                f"{text}"
            )

            await bot.send_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=conv.topic_id,
                text=admin_text,
            )

    except Exception as e:
        logger.error(f"[Chat API] Failed to forward message to admin: {e}")
        # Don't fail the request - message is saved in DB

    return SendMessageResponse(
        success=True,
        message_id=message.id,
        message="Сообщение отправлено"
    )


# ═══════════════════════════════════════════════════════════════════════════
#  CHAT FILE UPLOADS
# ═══════════════════════════════════════════════════════════════════════════

class ChatFileUploadResponse(BaseModel):
    success: bool
    message_id: int
    message: str
    file_url: Optional[str] = None


@router.post("/orders/{order_id}/messages/file", response_model=ChatFileUploadResponse)
async def upload_chat_file(
    order_id: int,
    file: UploadFile = File(...),
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Upload a file to order chat.
    File is stored on Yandex Disk and message is forwarded to admin.
    """
    from bot.services.yandex_disk import yandex_disk_service

    # Verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Get user
    user = await session.get(User, tg_user.id)

    # Validate file size (max 20MB)
    MAX_FILE_SIZE = 20 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 20 МБ)")

    # Determine file type
    filename = file.filename or "file"
    content_type = file.content_type or ""

    if content_type.startswith("image/"):
        file_type = "photo"
    elif content_type.startswith("audio/") or filename.endswith((".ogg", ".mp3", ".wav")):
        file_type = "voice" if "ogg" in filename.lower() else "audio"
    elif content_type.startswith("video/"):
        file_type = "video"
    else:
        file_type = "document"

    # Upload to Yandex Disk
    file_url = None
    if yandex_disk_service.is_available:
        result = await yandex_disk_service.upload_chat_file(
            file_bytes=content,
            filename=filename,
            order_id=order_id,
            client_name=user.fullname if user else "Client",
            telegram_id=tg_user.id,
        )
        if result.success:
            file_url = result.public_url

    # Create message record
    message = OrderMessage(
        order_id=order_id,
        sender_type='client',
        sender_id=tg_user.id,
        message_text=None,
        file_type=file_type,
        file_name=filename,
        yadisk_url=file_url,
        is_read=False,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)

    # Forward to admin via Forum Topic
    try:
        bot = get_bot()
        from bot.handlers.order_chat import get_or_create_topic

        conv = await get_or_create_topic(
            bot=bot,
            session=session,
            user_id=tg_user.id,
            order_id=order_id,
            user_full_name=user.fullname if user else tg_user.first_name,
            username=user.username if user else tg_user.username,
        )

        if conv and conv.topic_id:
            user_name = user.fullname if user else tg_user.first_name
            username_part = f" (@{user.username})" if user and user.username else ""

            # Send file info to admin
            file_emoji = {"photo": "🖼", "voice": "🎤", "audio": "🎵", "video": "🎬"}.get(file_type, "📎")
            admin_text = (
                f"{file_emoji} <b>Файл от клиента</b> (Mini App)\n"
                f"👤 {user_name}{username_part}\n\n"
                f"📁 {filename}"
            )

            if file_url:
                admin_text += f"\n🔗 <a href='{file_url}'>Скачать с Я.Диска</a>"

            await bot.send_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=conv.topic_id,
                text=admin_text,
            )

    except Exception as e:
        logger.error(f"[Chat API] Failed to forward file to admin: {e}")

    return ChatFileUploadResponse(
        success=True,
        message_id=message.id,
        message="Файл отправлен",
        file_url=file_url,
    )


@router.post("/orders/{order_id}/messages/voice", response_model=ChatFileUploadResponse)
async def upload_voice_message(
    order_id: int,
    file: UploadFile = File(...),
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Upload a voice message to order chat.
    Voice is stored on Yandex Disk and forwarded to admin.
    """
    from bot.services.yandex_disk import yandex_disk_service

    # Verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Get user
    user = await session.get(User, tg_user.id)

    # Validate file size (max 10MB for voice)
    MAX_VOICE_SIZE = 10 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_VOICE_SIZE:
        raise HTTPException(status_code=400, detail="Голосовое слишком длинное (макс. 10 МБ)")

    # Generate voice filename
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"voice_{timestamp}.ogg"

    # Upload to Yandex Disk
    file_url = None
    if yandex_disk_service.is_available:
        result = await yandex_disk_service.upload_chat_file(
            file_bytes=content,
            filename=filename,
            order_id=order_id,
            client_name=user.fullname if user else "Client",
            telegram_id=tg_user.id,
        )
        if result.success:
            file_url = result.public_url

    # Create message record
    message = OrderMessage(
        order_id=order_id,
        sender_type='client',
        sender_id=tg_user.id,
        message_text=None,
        file_type='voice',
        file_name=filename,
        yadisk_url=file_url,
        is_read=False,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)

    # Forward to admin
    try:
        bot = get_bot()
        from bot.handlers.order_chat import get_or_create_topic

        conv = await get_or_create_topic(
            bot=bot,
            session=session,
            user_id=tg_user.id,
            order_id=order_id,
            user_full_name=user.fullname if user else tg_user.first_name,
            username=user.username if user else tg_user.username,
        )

        if conv and conv.topic_id:
            user_name = user.fullname if user else tg_user.first_name
            username_part = f" (@{user.username})" if user and user.username else ""

            admin_text = (
                f"🎤 <b>Голосовое от клиента</b> (Mini App)\n"
                f"👤 {user_name}{username_part}"
            )

            if file_url:
                admin_text += f"\n🔗 <a href='{file_url}'>Прослушать</a>"

            await bot.send_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=conv.topic_id,
                text=admin_text,
            )

    except Exception as e:
        logger.error(f"[Chat API] Failed to forward voice to admin: {e}")

    return ChatFileUploadResponse(
        success=True,
        message_id=message.id,
        message="Голосовое отправлено",
        file_url=file_url,
    )


# ═══════════════════════════════════════════════════════════════════════════
#  ORDER REVIEWS
# ═══════════════════════════════════════════════════════════════════════════

REVIEWS_CHANNEL_ID = -1003241736635  # Channel for anonymous reviews


class SubmitReviewRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)  # 1-5 stars
    text: str = Field(..., min_length=10, max_length=2000)


class SubmitReviewResponse(BaseModel):
    success: bool
    message: str


@router.post("/orders/{order_id}/review", response_model=SubmitReviewResponse)
async def submit_order_review(
    order_id: int,
    data: SubmitReviewRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Submit a review for a completed order.
    Review is sent anonymously to the reviews channel.
    """
    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Only allow reviews for completed orders
    if order.status != OrderStatus.COMPLETED.value:
        raise HTTPException(
            status_code=400,
            detail="Отзывы можно оставлять только для завершённых заказов"
        )

    # Check if review already submitted (use a simple check via order field)
    if getattr(order, 'review_submitted', False):
        raise HTTPException(
            status_code=400,
            detail="Вы уже оставили отзыв на этот заказ"
        )

    # Format star rating
    stars = "⭐" * data.rating + "☆" * (5 - data.rating)

    # Get work type label
    work_label = order.work_type_label or order.work_type

    # Format anonymous review message
    review_text = f"""💬 <b>Новый отзыв</b>

{stars}

📚 <b>Тип работы:</b> {work_label}
📝 <b>Предмет:</b> {order.subject or 'Не указан'}

<i>"{data.text}"</i>

━━━━━━━━━━━━━━━
<i>Отзыв проверен • Academic Saloon</i>"""

    # Send to reviews channel
    try:
        bot = get_bot()
        await bot.send_message(
            chat_id=REVIEWS_CHANNEL_ID,
            text=review_text,
        )

        # Mark order as reviewed (we can use a simple attribute or create a field)
        order.review_submitted = True
        await session.commit()

        logger.info(f"[Review] Order #{order_id} review submitted: {data.rating} stars")

        return SubmitReviewResponse(
            success=True,
            message="Спасибо за отзыв! Он опубликован анонимно."
        )

    except Exception as e:
        logger.error(f"[Review] Failed to send review to channel: {e}")
        raise HTTPException(
            status_code=500,
            detail="Не удалось отправить отзыв. Попробуйте позже."
        )


# ═══════════════════════════════════════════════════════════════════════════
#  ЗАПРОС ПРАВОК И ПОДТВЕРЖДЕНИЕ РАБОТЫ
# ═══════════════════════════════════════════════════════════════════════════

class RevisionRequestData(BaseModel):
    message: str = Field(default="", description="Описание правок (опционально)")


class RevisionRequestResponse(BaseModel):
    success: bool
    message: str
    prefilled_text: str  # Текст для pre-filled чата


class ConfirmWorkResponse(BaseModel):
    success: bool
    message: str


@router.post("/orders/{order_id}/request-revision", response_model=RevisionRequestResponse)
async def request_revision(
    order_id: int,
    data: RevisionRequestData,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Клиент запрашивает правки.
    - Меняет статус на revision
    - Отправляет уведомление админу
    - Возвращает prefilled_text для чата
    """
    from database.models.orders import OrderMessage, MessageSender

    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Это не ваш заказ")

    # Check if order is in review status
    if order.status != OrderStatus.REVIEW.value:
        raise HTTPException(
            status_code=400,
            detail="Правки можно запросить только для работы на проверке"
        )

    # Check 30-day limit
    if order.delivered_at:
        days_since_delivery = (datetime.now(timezone.utc) - order.delivered_at.replace(tzinfo=timezone.utc)).days
        if days_since_delivery > 30:
            raise HTTPException(
                status_code=400,
                detail="Период бесплатных правок (30 дней) истёк"
            )

    # Get user
    user = await session.get(User, tg_user.id)

    # Change status to revision
    old_status = order.status
    order.status = OrderStatus.REVISION.value
    await session.commit()

    # Create auto-message in chat
    prefilled_text = "Прошу внести правки:\n\n"
    if data.message:
        prefilled_text += data.message

    # Save revision request as message
    revision_message = OrderMessage(
        order_id=order_id,
        sender_type=MessageSender.CLIENT.value,
        sender_id=tg_user.id,
        message_text=f"📝 <b>Запрос на правки</b>\n\n{data.message}" if data.message else "📝 <b>Запрос на правки</b>",
        is_read=False,
    )
    session.add(revision_message)
    await session.commit()

    # Notify admin via Forum Topic
    try:
        bot = get_bot()
        from bot.handlers.order_chat import get_or_create_topic

        conv, topic_id = await get_or_create_topic(
            bot=bot,
            session=session,
            user_id=tg_user.id,
            order_id=order_id,
        )

        if conv and topic_id:
            client_name = user.fullname if user else tg_user.first_name
            admin_text = f"""✏️ <b>ЗАПРОС НА ПРАВКИ</b>

👤 Клиент: <b>{client_name}</b>
📦 Заказ: <code>#{order.id}</code>

{f'💬 Комментарий:\n<i>{data.message}</i>' if data.message else '<i>Без комментария</i>'}

━━━━━━━━━━━━━━━━━━━━
📌 Статус изменён на <b>«Правки»</b>"""

            await bot.send_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=topic_id,
                text=admin_text,
            )

        # Update live card
        from bot.services.live_cards import send_or_update_card
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            extra_text=f"✏️ Запрос правок — {datetime.now().strftime('%d.%m %H:%M')}",
        )

    except Exception as e:
        logger.error(f"[Revision] Failed to notify admin: {e}")

    # WebSocket notification to admin (if connected)
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=OrderStatus.REVISION.value,
            old_status=old_status,
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")

    return RevisionRequestResponse(
        success=True,
        message="Запрос на правки отправлен! Менеджер свяжется с вами.",
        prefilled_text=prefilled_text,
    )


@router.post("/orders/{order_id}/confirm-completion", response_model=ConfirmWorkResponse)
async def confirm_work_completion(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Клиент подтверждает, что работа выполнена качественно.
    - Меняет статус на completed
    - Начисляет кешбэк
    - Отправляет уведомления
    """
    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Это не ваш заказ")

    # Check if order is in review status
    if order.status != OrderStatus.REVIEW.value:
        raise HTTPException(
            status_code=400,
            detail="Подтвердить можно только работу на проверке"
        )

    # Get user
    user = await session.get(User, tg_user.id)

    # Complete order
    old_status = order.status
    order.status = OrderStatus.COMPLETED.value
    order.completed_at = datetime.utcnow()

    # Increment user stats
    if user:
        user.orders_count = (user.orders_count or 0) + 1
        user.total_spent = (user.total_spent or 0) + float(order.paid_amount or order.final_price or order.price or 0)

    await session.commit()

    # Add cashback
    cashback_amount = 0.0
    try:
        bot = get_bot()
        from bot.services.bonus import BonusService
        order_amount = float(order.paid_amount or order.final_price or order.price or 0)
        cashback_amount = await BonusService.add_order_cashback(
            session=session,
            bot=bot,
            user_id=order.user_id,
            order_id=order.id,
            order_amount=order_amount,
        )
    except Exception as e:
        logger.error(f"[Confirm] Failed to add cashback: {e}")

    # Notify admin
    try:
        bot = get_bot()
        from bot.handlers.order_chat import get_or_create_topic
        from bot.services.unified_hub import close_order_topic

        conv, topic_id = await get_or_create_topic(
            bot=bot,
            session=session,
            user_id=tg_user.id,
            order_id=order_id,
        )

        if conv and topic_id:
            client_name = user.fullname if user else tg_user.first_name
            admin_text = f"""✅ <b>КЛИЕНТ ПОДТВЕРДИЛ РАБОТУ!</b>

👤 Клиент: <b>{client_name}</b>
📦 Заказ: <code>#{order.id}</code>

🎉 Заказ успешно завершён!"""

            await bot.send_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=topic_id,
                text=admin_text,
            )

        # Close topic
        await close_order_topic(bot, session, order)

        # Update live card
        from bot.services.live_cards import send_or_update_card
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
        )

    except Exception as e:
        logger.error(f"[Confirm] Failed to notify admin: {e}")

    # WebSocket notification
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=OrderStatus.COMPLETED.value,
            old_status=old_status,
            extra_data={"cashback": cashback_amount} if cashback_amount > 0 else None,
        )
    except Exception as ws_err:
        logger.debug(f"WebSocket notification failed: {ws_err}")

    cashback_text = f" +{cashback_amount:.0f}₽ кешбэк!" if cashback_amount > 0 else ""
    return ConfirmWorkResponse(
        success=True,
        message=f"Спасибо! Заказ завершён.{cashback_text}",
    )

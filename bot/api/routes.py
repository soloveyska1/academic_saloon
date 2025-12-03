"""
API routes for Mini App
"""

import logging
import random
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.users import User
from database.models.orders import Order, Conversation, ConversationType
from database.db import get_session
from core.config import settings

from .auth import TelegramUser, get_current_user
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

    # Check cooldown (use timezone-aware datetime!)
    now = datetime.now(timezone.utc)

    # --- GOD MODE FOR ADMIN ---
    # Admin can spin infinitely for testing animations
    if user.telegram_id == 872379852:
        can_spin = True
        logger.info(f"GOD MODE: Allowing infinite spin for admin {user.telegram_id}")
    else:
        # Standard user cooldown logic
        can_spin = True  # Default to true if no previous spin
        if user.last_daily_bonus_at:
            next_spin = user.last_daily_bonus_at + timedelta(hours=24)
            if next_spin.tzinfo is None:
                next_spin = next_spin.replace(tzinfo=timezone.utc)
            can_spin = now >= next_spin

    # Block non-admin users who can't spin
    if not can_spin and user.telegram_id != 872379852:
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
    data: OrderCreateRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new order from Mini App.
    Calculates preliminary price and notifies admins via Forum Topic.
    """
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

    session.add(order)
    await session.commit()
    await session.refresh(order)

    logger.info(f"[API /orders/create] Order #{order.id} created, status={initial_status}, price={price_calc.final_price}")

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
    order_id: int,
    data: PaymentConfirmRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    User confirms they have made a manual payment.
    Changes status to VERIFICATION_PENDING and notifies admins.
    """
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
    """
    # Get order and verify ownership
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

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

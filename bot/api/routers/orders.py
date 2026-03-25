from __future__ import annotations

import logging
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_session
from database.models.users import User
from database.models.orders import Order, OrderStatus, WorkType, WORK_TYPE_LABELS, OrderMessage, MessageSender, ConversationType
from core.config import settings
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import (
    OrderResponse, OrdersListResponse, OrderCreateRequest, OrderCreateResponse,
    PromoCodeRequest, PromoCodeResponse, FileUploadResponse,
    PaymentConfirmRequest, PaymentConfirmResponse, PaymentInfoResponse,
    SubmitReviewRequest, SubmitReviewResponse, RevisionRequestData, RevisionRequestResponse,
    ConfirmWorkResponse,
    PauseOrderRequest, PauseOrderResponse,
    BatchPaymentInfoRequest, BatchPaymentInfoResponse, BatchOrderItem,
    BatchPaymentConfirmRequest, BatchPaymentConfirmResponse
)
from bot.api.dependencies import (
    get_loyalty_levels, get_loyalty_info, order_to_response
)
from bot.api.rate_limit import rate_limit
from bot.services.pricing import calculate_price
from bot.services.yandex_disk import yandex_disk_service
from bot.services.mini_app_logger import (
    log_order_created, log_mini_app_event, MiniAppEvent
)
from bot.bot_instance import get_bot
from bot.utils.formatting import format_price
from bot.services.order_message_formatter import (
    build_client_order_created_text,
    build_order_keyboard,
)
from bot.services.order_pause import (
    MAX_ORDER_PAUSE_DAYS,
    can_pause_order,
    get_pause_available_days,
    pause_order,
    resume_order,
)
from bot.services.order_pause_events import (
    notify_pause_state_change,
    sync_order_pause_state,
    sync_orders_pause_state,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Orders"])

# Allowed file extensions for upload (whitelist)
ALLOWED_EXTENSIONS = {
    # Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.odt', '.ods', '.odp', '.rtf', '.txt', '.csv',
    # Images
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
    # Archives
    '.zip', '.rar', '.7z', '.tar', '.gz',
    # Code/Data
    '.py', '.js', '.ts', '.html', '.css', '.json', '.xml', '.sql',
    # Other
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
}

# Blocked file extensions (dangerous)
BLOCKED_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js',
    '.msi', '.dll', '.scr', '.com', '.pif',
}


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    if not filename:
        return False
    # Sanitize: strip path components to prevent traversal
    import os
    filename = os.path.basename(filename)
    ext = '.' + filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext in BLOCKED_EXTENSIONS:
        return False
    return ext in ALLOWED_EXTENSIONS


def get_order_remaining_amount(order: Order) -> Decimal:
    """Return remaining amount for an order after already confirmed payments."""
    final_price = Decimal(str(order.final_price or 0))
    paid_amount = Decimal(str(order.paid_amount or 0))
    return max(final_price - paid_amount, Decimal("0"))


def is_followup_payment(order: Order) -> bool:
    """Whether the next payment should be treated as a final settlement."""
    return Decimal(str(order.paid_amount or 0)) > 0 and get_order_remaining_amount(order) > 0


def get_requested_payment_amount(order: Order, payment_scheme: str) -> Decimal:
    """Calculate amount requested right now for first or final payment."""
    remaining = get_order_remaining_amount(order)
    if remaining <= 0:
        return Decimal("0")

    if is_followup_payment(order):
        return remaining

    final_price = Decimal(str(order.final_price or 0))
    if payment_scheme == "half":
        return final_price / Decimal("2")
    return final_price


# ═══════════════════════════════════════════════════════════════════════════
#  ORDER LIST & DETAIL
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/orders", response_model=OrdersListResponse)
async def get_orders(
    status: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get user's orders with optional filtering"""
    # Get user to get internal ID (if needed, but telegram_id is on Order)
    # Actually Order.user_id IS telegram_id.
    # But we check user existence.
    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    query = select(Order).where(
        Order.user_id == user.telegram_id,
        Order.work_type != 'support_chat'
    )

    if status:
        if status == "active":
            query = query.where(Order.status.notin_([
                OrderStatus.COMPLETED.value,
                OrderStatus.CANCELLED.value,
                OrderStatus.REJECTED.value
            ]))
        elif status == "completed":
            query = query.where(Order.status == OrderStatus.COMPLETED.value)
        else:
            query = query.where(Order.status == status)

    count_query = query.with_only_columns(func.count(Order.id))
    total = (await session.execute(count_query)).scalar() or 0

    query = query.order_by(desc(Order.created_at)).offset(offset).limit(limit)
    result = await session.execute(query)
    orders = result.scalars().all()
    await sync_orders_pause_state(session, list(orders), notify_user=True)

    return OrdersListResponse(
        orders=[order_to_response(o) for o in orders],
        total=total,
        has_more=offset + len(orders) < total
    )

# ═══════════════════════════════════════════════════════════════════════════
#  BATCH PAYMENT (Pay All) — Must be before /orders/{order_id} route!
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/orders/batch-payment-info", response_model=BatchPaymentInfoResponse)
async def get_batch_payment_info(
    data: BatchPaymentInfoRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get payment info for multiple orders at once"""
    result = await session.execute(
        select(Order).where(
            Order.id.in_(data.order_ids),
            Order.user_id == tg_user.id,
            Order.status.in_(['confirmed', 'waiting_payment'])
        )
    )
    orders = result.scalars().all()

    if not orders:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Не найдено заказов для оплаты"}
        )

    order_items = []
    total_amount = 0.0

    for order in orders:
        if not order.final_price or order.final_price <= 0:
            continue
        remaining = float(order.final_price - (order.paid_amount or 0))
        if remaining <= 0:
            continue
        work_label = WORK_TYPE_LABELS.get(order.work_type, order.work_type)
        order_items.append(BatchOrderItem(
            id=order.id,
            work_type_label=work_label,
            subject=order.subject,
            final_price=round(float(order.final_price), 2),
            remaining=round(remaining, 2)
        ))
        total_amount += remaining

    if not order_items:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Все заказы уже оплачены"}
        )

    card_raw = settings.PAYMENT_CARD.replace(" ", "").replace("-", "")
    card_formatted = " ".join([card_raw[i:i+4] for i in range(0, len(card_raw), 4)])
    phone_raw = settings.PAYMENT_PHONE.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if phone_raw.startswith("8"):
        phone_raw = "+7" + phone_raw[1:]
    elif not phone_raw.startswith("+"):
        phone_raw = "+7" + phone_raw
    phone_formatted = f"{phone_raw[:2]} ({phone_raw[2:5]}) {phone_raw[5:8]}-{phone_raw[8:10]}-{phone_raw[10:12]}" if len(phone_raw) >= 12 else phone_raw

    return BatchPaymentInfoResponse(
        orders=order_items,
        total_amount=round(total_amount, 2),
        orders_count=len(order_items),
        card_number=card_formatted,
        card_holder=settings.PAYMENT_NAME.upper(),
        sbp_phone=phone_formatted,
        sbp_bank=settings.PAYMENT_BANKS
    )


@router.post("/orders/batch-payment-confirm", response_model=BatchPaymentConfirmResponse)
@rate_limit(limit=3, window=60, key_prefix="rl:batch_confirm")
async def confirm_batch_payment(
    request: Request,
    data: BatchPaymentConfirmRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Confirm payment for multiple orders at once"""

    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    if not user:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "User not found"}
        )

    result = await session.execute(
        select(Order).where(
            Order.id.in_(data.order_ids),
            Order.user_id == tg_user.id,
            Order.status.in_(['confirmed', 'waiting_payment'])
        )
    )
    orders = result.scalars().all()

    if not orders:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Не найдено заказов для оплаты"}
        )

    processed_orders = []
    failed_orders = []
    total_amount = 0.0

    for order in orders:
        if not order.final_price or order.final_price <= 0:
            failed_orders.append(order.id)
            continue
        remaining = float(order.final_price - (order.paid_amount or 0))
        if remaining <= 0:
            failed_orders.append(order.id)
            continue
        amount_to_pay = remaining / 2 if data.payment_scheme == 'half' else remaining
        order.status = OrderStatus.VERIFICATION_PENDING.value
        order.payment_method = data.payment_method
        order.payment_scheme = data.payment_scheme
        processed_orders.append(order)
        total_amount += amount_to_pay

    await session.commit()

    for order in processed_orders:
        try:
            from bot.services.realtime_notifications import send_order_status_notification
            await send_order_status_notification(
                telegram_id=tg_user.id, order_id=order.id, new_status=order.status,
                extra_data={"payment_method": data.payment_method, "payment_scheme": data.payment_scheme, "is_batch": True}
            )
        except Exception as e:
            logger.warning(f"[Batch] Failed to send WS notification for order #{order.id}: {e}")

    if processed_orders:
        try:
            bot = get_bot()
            from bot.services.live_cards import send_or_update_card
            scheme_text = "100%" if data.payment_scheme == 'full' else "50% аванс"
            method_text = {"card": "Карта", "sbp": "СБП", "transfer": "Перевод"}.get(data.payment_method, data.payment_method)
            order_ids_str = ", ".join([f"#{o.id}" for o in processed_orders])
            for order in processed_orders:
                await send_or_update_card(
                    bot=bot, order=order, session=session, client_username=user.username, client_name=user.fullname,
                    extra_text=f"💳 Batch-оплата: {scheme_text} ({method_text})\n🔗 Заказы: {order_ids_str}"
                )
            await bot.send_message(
                chat_id=user.telegram_id,
                text=f"✅ <b>Заявка на оплату принята!</b>\n\nЗаказы: <code>{order_ids_str}</code>\nСумма: <b>{format_price(total_amount)}</b>\nСпособ: {method_text}\n\nМенеджер проверит поступление и подтвердит все заказы."
            )
        except Exception as e:
            logger.error(f"Batch payment notification error: {e}")

    if not processed_orders:
        return BatchPaymentConfirmResponse(
            success=False,
            message="Не удалось обработать ни один заказ",
            processed_count=0,
            total_amount=0,
            failed_orders=[o.id for o in orders]
        )

    return BatchPaymentConfirmResponse(
        success=True,
        message=f"Заявка на оплату {len(processed_orders)} заказов отправлена на проверку",
        processed_count=len(processed_orders),
        total_amount=round(total_amount, 2),
        failed_orders=failed_orders
    )

# ═══════════════════════════════════════════════════════════════════════════
#  ORDER DETAIL (after batch routes to avoid path parameter conflicts)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get single order details"""
    result = await session.execute(
        select(Order).where(
            Order.id == order_id,
            Order.user_id == tg_user.id
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    await sync_order_pause_state(session, order, notify_user=True)
    return order_to_response(order)

# ═══════════════════════════════════════════════════════════════════════════
#  PROMO CODE
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/promo", response_model=PromoCodeResponse)
async def apply_promo_code(
    request: Request,
    data: PromoCodeRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Validate promo code - checks database only.
    Returns validation result without "applying" the promo.
    Actual application happens at order creation time.
    """
    from bot.services.promo_service import PromoService

    code = data.code.upper().strip()

    # Check database for promo codes (atomic check with row locking)
    is_valid, message, discount, expires_at = await PromoService.validate_promo_code(
        session, code, tg_user.id
    )

    if is_valid:
        # Format discount nicely (show as int if whole number, otherwise show decimals)
        discount_display = int(discount) if discount == int(discount) else discount
        return PromoCodeResponse(
            success=True,
            message=f"Промокод {code} активирован! Скидка {discount_display}%",
            discount=discount,  # Keep as float to preserve precision
            valid_until=expires_at.isoformat() if expires_at else None,
        )

    # Return specific error message from PromoService
    return PromoCodeResponse(
        success=False,
        message=message
    )

# ═══════════════════════════════════════════════════════════════════════════
#  ORDER CREATION
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/orders/create", response_model=OrderCreateResponse)
async def create_order(
    request: Request,
    data: OrderCreateRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new order from Mini App."""

    logger.info(f"[API /orders/create] New order from user {tg_user.id}: {data.work_type}, promo_code={data.promo_code}")

    try:
        bot = get_bot()
    except Exception as bot_error:
        logger.error(f"[API /orders/create] Failed to get bot instance: {bot_error}")
        return OrderCreateResponse(
            success=False, order_id=0, message="Сервис временно недоступен. Попробуйте позже.", price=None, is_manual_required=False
        )

    # Get or create user
    result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = result.scalar_one_or_none()
    if not user:
        try:
            user = User(
                telegram_id=tg_user.id,
                username=tg_user.username,
                fullname=f"{tg_user.first_name} {tg_user.last_name or ''}".strip(),
                role="user",
                terms_accepted_at=datetime.now(timezone.utc),
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return OrderCreateResponse(success=False, order_id=0, message="Ошибка регистрации", price=None, is_manual_required=False)

    # Validate work_type
    try:
        work_type_enum = WorkType(data.work_type)
    except ValueError:
        return OrderCreateResponse(success=False, order_id=0, message=f"Неизвестный тип работы: {data.work_type}", price=None, is_manual_required=False)

    # Calculate base price with loyalty discount
    try:
        user_discount = 0
        loyalty_levels = await get_loyalty_levels(session)
        if loyalty_levels:
            user_discount = get_loyalty_info(user.orders_count or 0, loyalty_levels).discount

        price_calc = calculate_price(
            work_type=data.work_type,
            deadline_key=data.deadline,
            discount_percent=user_discount
        )
    except Exception as price_error:
        logger.error(f"Price calc error: {price_error}")
        return OrderCreateResponse(success=False, order_id=0, message=f"Ошибка расчёта цены", price=None, is_manual_required=False)

    # Handle promo code if provided (atomic check and reserve)
    from bot.services.promo_service import PromoService

    promo_discount = 0.0
    promo_code_used = None
    promo_validation_failed = False
    promo_failure_reason = None

    if data.promo_code:
        code = data.promo_code.upper().strip()
        logger.info(f"[API /orders/create] 🎟️ Received promo_code: '{code}' from user {tg_user.id}")
        # Atomic validation with row locking to prevent race conditions
        is_valid, message, discount, _ = await PromoService.validate_promo_code(
            session, code, tg_user.id
        )
        logger.info(f"[API /orders/create] 🎟️ Promo validation result: is_valid={is_valid}, message='{message}', discount={discount}")
        if is_valid:
            promo_discount = float(discount)
            promo_code_used = code
            logger.info(f"[API /orders/create] ✅ Promo code {code} validated: {discount}% discount")
        else:
            # Promo code was invalid - log but continue without it
            promo_validation_failed = True
            promo_failure_reason = message
            logger.warning(f"[API /orders/create] ❌ Promo code {code} invalid: {message}")
    else:
        logger.info(f"[API /orders/create] 🎟️ No promo_code received in request")

    # Calculate final price with BOTH loyalty and promo discounts
    base_price = float(price_calc.final_price) if not price_calc.is_manual_required else 0.0

    # Cap loyalty discount at 50%
    capped_loyalty_discount = min(user_discount, 50.0)

    # We do NOT combine them here, because Order.final_price property applies them sequentially:
    # price * (1 - discount/100) * (1 - promo_discount/100)
    # So we store them separately.

    # Auto-priced orders skip admin estimation and go straight to payment
    if price_calc.is_manual_required:
        initial_status = OrderStatus.WAITING_ESTIMATION.value
    else:
        initial_status = OrderStatus.WAITING_PAYMENT.value

    logger.info(f"[API /orders/create] 🎟️ Creating order with promo_code={promo_code_used}, promo_discount={promo_discount}, base_price={base_price}")

    order = Order(
        user_id=user.telegram_id,
        work_type=data.work_type,
        subject=data.subject,
        topic=data.topic,
        description=data.description,
        deadline=data.deadline,
        price=base_price,
        discount=float(capped_loyalty_discount),
        promo_code=promo_code_used,
        promo_discount=float(promo_discount) if promo_discount else 0.0,
        status=initial_status,
    )
    logger.info(f"[API /orders/create] 🎟️ Order object created: promo_code={order.promo_code}, promo_discount={order.promo_discount}")

    try:
        session.add(order)
        await session.flush()  # Get order.id without committing

        # Apply promo code atomically (records usage and increments counter)
        # BUT: For manual orders (base_price=0), don't apply promo yet!
        # The promo will be applied when admin sets the price in god_mode.
        # This prevents "burning" promo usage with discount_amount=0.
        if promo_code_used and base_price > 0:
            apply_success, apply_msg, _ = await PromoService.apply_promo_to_order(
                session=session,
                order_id=order.id,
                code=promo_code_used,
                user_id=tg_user.id,
                base_price=base_price,
                loyalty_discount=capped_loyalty_discount,
                bot=bot  # Pass bot for admin notifications
            )
            if not apply_success:
                # Promo became invalid between validation and order creation
                # Continue without promo discount
                logger.warning(f"[API /orders/create] Promo application failed: {apply_msg}")
                order.promo_code = None
                order.promo_discount = 0.0
                # Recalculate discount with only loyalty (capped at 50%)
                capped_loyalty = min(user_discount, 50.0)
                order.discount = float(capped_loyalty)
                # final_price is computed from price, discount, and bonus_used
                promo_code_used = None
                promo_discount = 0.0
                promo_validation_failed = True
                promo_failure_reason = apply_msg
        elif promo_code_used and base_price == 0:
            # Manual order with promo - promo_code is saved but usage not recorded yet
            # Will be applied when admin sets price in god_mode
            logger.info(
                f"[API /orders/create] Manual order #{order.id} with promo {promo_code_used} - "
                f"usage will be recorded when price is set"
            )

        await session.commit()
        await session.refresh(order)
        logger.info(f"[API /orders/create] 🎟️ After commit - Order #{order.id}: promo_code={order.promo_code}, promo_discount={order.promo_discount}")
    except Exception as db_error:
        logger.error(f"DB Error: {db_error}")
        await session.rollback()
        return OrderCreateResponse(success=False, order_id=0, message="Ошибка создания заказа", price=None, is_manual_required=False)

    logger.info(f"[API /orders/create] ✅ Order #{order.id} created successfully with promo_code={order.promo_code}")

    # Notify via WS
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=tg_user.id,
            order_id=order.id,
            new_status=initial_status,
            extra_data={"work_type": data.work_type, "subject": data.subject, "is_new": True}
        )
    except Exception as e:
        logger.warning(f"[WS] Failed: {e}")

    # Notify admins via WebSocket
    try:
        from bot.api.websocket import notify_admin_new_order
        work_label = WORK_TYPE_LABELS.get(work_type_enum, data.work_type)
        await notify_admin_new_order({
            "id": order.id,
            "work_type": data.work_type,
            "work_type_label": work_label,
            "subject": data.subject,
            "user_fullname": user.fullname,
            "user_username": user.username,
            "promo_code": promo_code_used,
            "promo_discount": promo_discount if promo_code_used else None,
        })
    except Exception as e:
        logger.warning(f"[WS Admin] Failed to notify admins: {e}")

    # Admin notification
    try:
        from bot.handlers.order_chat import get_or_create_topic
        from bot.services.live_cards import send_or_update_card

        conv, topic_id = await get_or_create_topic(
            bot=bot,
            session=session,
            user_id=user.telegram_id,
            order_id=order.id,
            conv_type=ConversationType.ORDER_CHAT.value,
        )
        admin_extra_text = "📱 Заказ из Mini App"
        if promo_code_used:
            admin_extra_text += f"\n🏷️ Промокод: {promo_code_used} (-{promo_discount}%)"
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username,
            client_name=user.fullname,
            extra_text=admin_extra_text,
        )
    except Exception as e:
        logger.error(f"Admin Notify Failed: {e}")

    # User notification
    try:
        user_message = build_client_order_created_text(
            order=order,
            subject=data.subject,
            promo_code=promo_code_used,
            promo_discount=promo_discount if promo_code_used else None,
        )
        keyboard = build_order_keyboard(
            order_id=order.id,
            primary_text="Открыть заказ",
            chat_callback=f"enter_chat_order_{order.id}",
            chat_text="Написать менеджеру",
        )
        await bot.send_message(chat_id=user.telegram_id, text=user_message, reply_markup=keyboard)
    except Exception as e:
        logger.warning(f"User Notify Failed: {e}")

    # Mini App Log
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
        logger.warning(f"Log Failed: {e}")

    message = (
        "Заявка принята. Менеджер вручную оценит детали и вернётся с точной стоимостью."
        if price_calc.is_manual_required
        else f"Заказ #{order.id} создан. Можете перейти к оплате."
    )

    # Add promo failure warning to message if applicable
    if promo_validation_failed and promo_failure_reason:
        message += f"\n\n⚠️ Промокод не применён: {promo_failure_reason}"

    return OrderCreateResponse(
        success=True,
        order_id=order.id,
        message=message,
        price=float(order.final_price) if not price_calc.is_manual_required else None,
        is_manual_required=price_calc.is_manual_required,
        promo_applied=bool(promo_code_used),
        promo_failed=promo_validation_failed,
        promo_failure_reason=promo_failure_reason if promo_validation_failed else None
    )

# ═══════════════════════════════════════════════════════════════════════════
#  FILE UPLOAD
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/orders/{order_id}/upload-files", response_model=FileUploadResponse)
async def upload_order_files(
    order_id: int,
    files: List[UploadFile] = File(...),
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Upload files to an order"""
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    if not user:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "User not found"}
        )

    order = await session.get(Order, order_id)
    if not order:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )
    # Allow order owner OR admins to upload files
    is_admin = tg_user.id in settings.ADMIN_IDS
    if order.user_id != tg_user.id and not is_admin:
        return JSONResponse(
            status_code=403,
            content={"success": False, "message": "Not your order"}
        )

    if not yandex_disk_service.is_available:
        return FileUploadResponse(success=False, message="Файловое хранилище временно недоступно")

    file_data = []
    blocked_files = []
    oversized_files = []
    for file in files:
        import os as _os
        filename = _os.path.basename(file.filename or "unnamed_file")
        # Check file extension
        if not is_allowed_file(filename):
            blocked_files.append(filename)
            logger.warning(f"Blocked file upload: {filename} (order_id={order_id})")
            continue

        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            oversized_files.append(filename)
            continue
        file_data.append((content, filename))

    if (blocked_files or oversized_files) and not file_data:
        reasons = []
        if blocked_files:
            reasons.append(f"неподдерживаемый тип: {', '.join(blocked_files)}")
        if oversized_files:
            reasons.append(f"превышен лимит 50 МБ: {', '.join(oversized_files)}")
        return FileUploadResponse(
            success=False,
            message="; ".join(reasons),
            uploaded_count=0,
            blocked_files=blocked_files,
            oversized_files=oversized_files,
        )

    if not file_data:
        return FileUploadResponse(
            success=False,
            message="Нет файлов для загрузки",
            uploaded_count=0,
            blocked_files=blocked_files,
            oversized_files=oversized_files,
        )

    result = await yandex_disk_service.upload_multiple_files(
        files=file_data,
        order_id=order.id,
        client_name=user.fullname or f"User_{user.telegram_id}",
        work_type=order.work_type,
        telegram_id=user.telegram_id,
    )

    if result.success:
        if result.folder_url:
            order.files_url = result.folder_url
            await session.commit()

        uploaded_count = result.uploaded_count or len(file_data)

        try:
            bot = get_bot()
            from bot.services.live_cards import send_or_update_card
            await send_or_update_card(
                bot=bot,
                order=order,
                session=session,
                client_username=user.username,
                client_name=user.fullname,
                extra_text=f"📎 {uploaded_count} файл(ов) загружено",
            )
        except Exception as e:
            logger.warning(f"[Files] Failed to update live card for order #{order.id}: {e}")

        # Notify client about file delivery via WebSocket
        try:
            from bot.api.websocket import notify_file_delivery
            await notify_file_delivery(
                telegram_id=order.user_id,
                order_id=order.id,
                file_count=uploaded_count,
                files_url=result.folder_url
            )
        except Exception as e:
            logger.warning(f"[Files] Failed to send WS file delivery notification for order #{order.id}: {e}")

        rejected_count = len(blocked_files) + len(oversized_files)
        storage_failed_count = max(len(file_data) - uploaded_count, 0)

        message = f"✅ Загружено {uploaded_count} из {len(files)} файл(ов)"
        issue_notes = []
        if blocked_files:
            issue_notes.append(f"пропущены неподдерживаемые файлы ({len(blocked_files)})")
        if oversized_files:
            issue_notes.append(f"пропущены файлы больше 50 МБ ({len(oversized_files)})")
        if storage_failed_count > 0:
            issue_notes.append(f"не загрузились {storage_failed_count} файл(ов)")
        if not result.folder_url:
            issue_notes.append("ссылка на папку обновится в заказе с небольшой задержкой")
        elif rejected_count == 0 and uploaded_count == len(file_data):
            message = f"✅ Загружено {uploaded_count} файл(ов)"

        if issue_notes:
            message = f"{message}; {', '.join(issue_notes)}"

        return FileUploadResponse(
            success=True,
            message=message,
            files_url=result.folder_url,
            uploaded_count=uploaded_count,
            blocked_files=blocked_files,
            oversized_files=oversized_files,
        )

    return FileUploadResponse(
        success=False,
        message=f"Ошибка загрузки: {result.error}",
        uploaded_count=result.uploaded_count,
        blocked_files=blocked_files,
        oversized_files=oversized_files,
    )

# ═══════════════════════════════════════════════════════════════════════════
#  PAYMENT
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/orders/{order_id}/confirm-payment", response_model=PaymentConfirmResponse)
@rate_limit(limit=3, window=60, key_prefix="rl:confirm_pay")
async def confirm_payment(
    request: Request,
    order_id: int,
    data: PaymentConfirmRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()

    # Lock the order row to prevent concurrent payment confirmations
    order_result = await session.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    allowed_statuses = {
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,
        OrderStatus.PAID.value,
        OrderStatus.IN_PROGRESS.value,
        OrderStatus.REVIEW.value,
    }

    # Idempotency: if already in verification_pending, return success without re-processing
    if order.status == OrderStatus.VERIFICATION_PENDING.value:
        requested_scheme = "half" if data.payment_scheme == "half" else "full"
        idempotent_amount = get_requested_payment_amount(order, requested_scheme)
        return PaymentConfirmResponse(
            success=True,
            message="Оплата уже на проверке",
            new_status=order.status,
            amount_to_pay=float(idempotent_amount),
        )

    if order.status in [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value, OrderStatus.COMPLETED.value]:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order cannot accept payment"}
        )

    if order.status not in allowed_statuses:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order cannot accept payment right now"}
        )

    if not order.final_price or order.final_price <= 0:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order has no price"}
        )

    requested_scheme = "half" if data.payment_scheme == "half" else "full"
    payment_phase = "final" if is_followup_payment(order) else "initial"
    amount_to_pay = get_requested_payment_amount(order, requested_scheme)
    if amount_to_pay <= 0:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order is already fully paid"}
        )

    order.status = OrderStatus.VERIFICATION_PENDING.value
    order.payment_method = data.payment_method
    if payment_phase == "initial":
        order.payment_scheme = requested_scheme
    elif order.payment_scheme not in {"half", "full"}:
        order.payment_scheme = "half"
    await session.commit()

    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=tg_user.id, order_id=order_id, new_status=order.status,
            extra_data={
                "payment_method": data.payment_method,
                "payment_scheme": order.payment_scheme,
                "payment_phase": payment_phase,
            }
        )
    except Exception as e:
        logger.warning(f"[Payment] Failed to send WS notification for order #{order_id}: {e}")

    # Notify admins about pending payment
    try:
        from bot.api.websocket import notify_admin_payment_pending
        await notify_admin_payment_pending(
            order_id=order.id,
            user_fullname=user.fullname if user else "Unknown",
            amount=amount_to_pay,
            payment_method=data.payment_method,
            payment_phase=payment_phase,
        )
    except Exception as e:
        logger.warning(f"[Payment] Failed to notify admins about pending payment for order #{order.id}: {e}")

    try:
        bot = get_bot()
        from bot.services.admin_payment_notifications import send_admin_payment_pending_alert
        await send_admin_payment_pending_alert(
            bot=bot,
            session=session,
            order=order,
            user=user,
            amount=float(amount_to_pay),
            payment_method=data.payment_method,
            payment_phase=payment_phase,
        )
    except Exception as e:
        logger.warning(f"[Payment] Failed to send bot admin alert for order #{order.id}: {e}")

    try:
        bot = get_bot()
        from bot.services.live_cards import send_or_update_card
        if payment_phase == "final":
            scheme_text = "доплата"
        else:
            scheme_text = "100%" if requested_scheme == 'full' else "50% аванс"
        method_text = {"card": "Карта", "sbp": "СБП", "transfer": "Перевод"}.get(data.payment_method, data.payment_method)
        await send_or_update_card(
            bot=bot, order=order, session=session, client_username=user.username, client_name=user.fullname,
            extra_text=f"💳 Ожидает проверки: {scheme_text} ({method_text})\n💰 Сумма: {format_price(amount_to_pay)}"
        )
        await bot.send_message(
            chat_id=user.telegram_id,
            text=f"✅ <b>Заявка на оплату принята!</b>\n\nЗаказ <code>#{order.id}</code>\nСумма: <b>{format_price(amount_to_pay)}</b>\n\nМенеджер проверит поступление и подтвердит."
        )
    except Exception as e:
        logger.warning(f"[Payment] Failed to send live card/notification for order #{order.id}: {e}")

    try:
        await log_mini_app_event(
            bot=get_bot(), event=MiniAppEvent.ORDER_VIEW, user_id=user.telegram_id, username=user.username,
            order_id=order.id, details=f"Подтвердил оплату: {format_price(amount_to_pay)}"
        )
    except Exception as e:
        logger.warning(f"[Payment] Failed to log mini app event for order #{order.id}: {e}")

    return PaymentConfirmResponse(
        success=True, message="Заявка на оплату отправлена на проверку", new_status=order.status, amount_to_pay=amount_to_pay
    )

@router.get("/orders/{order_id}/payment-info", response_model=PaymentInfoResponse)
async def get_payment_info(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    await sync_order_pause_state(session, order, notify_user=True)
    card_raw = settings.PAYMENT_CARD.replace(" ", "").replace("-", "")
    card_formatted = " ".join([card_raw[i:i+4] for i in range(0, len(card_raw), 4)])
    
    phone_raw = settings.PAYMENT_PHONE.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if phone_raw.startswith("8"): phone_raw = "+7" + phone_raw[1:]
    elif not phone_raw.startswith("+"): phone_raw = "+7" + phone_raw
    
    phone_formatted = f"{phone_raw[:2]} ({phone_raw[2:5]}) {phone_raw[5:8]}-{phone_raw[8:10]}-{phone_raw[10:12]}" if len(phone_raw) >= 12 else phone_raw

    # Safe conversion with null checks
    price = round(float(order.price or 0), 2)
    final_price = round(float(order.final_price or 0), 2)
    discount = round(float(order.discount or 0), 2)
    bonus_used = round(float(order.bonus_used or 0), 2)
    paid_amount = round(float(order.paid_amount or 0), 2)
    remaining = round(float(max((order.final_price or 0) - (order.paid_amount or 0), 0)), 2)

    return PaymentInfoResponse(
        order_id=order.id, status=order.status,
        price=price, final_price=final_price,
        discount=discount, bonus_used=bonus_used,
        paid_amount=paid_amount,
        remaining=remaining,
        card_number=card_formatted, card_holder=settings.PAYMENT_NAME.upper(),
        sbp_phone=phone_formatted, sbp_bank=settings.PAYMENT_BANKS,
    )


@router.post("/orders/{order_id}/pause", response_model=PauseOrderResponse)
@rate_limit(limit=3, window=300, key_prefix="rl:pause_order")
async def pause_client_order(
    request: Request,
    order_id: int,
    data: PauseOrderRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    order_result = await session.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if not order or order.user_id != tg_user.id:
        return JSONResponse(status_code=404, content={"success": False, "message": "Order not found"})

    await sync_order_pause_state(session, order, notify_user=True)

    if order.status == OrderStatus.PAUSED.value:
        return PauseOrderResponse(
            success=True,
            message="Заказ уже на паузе",
            new_status=order.status,
            pause_until=getattr(order.pause_until, "isoformat", lambda: None)(),
            paused_from_status=order.paused_from_status,
            pause_available_days=get_pause_available_days(order),
        )

    if float(order.paid_amount or 0) <= 0:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Пауза доступна только после оплаты заказа"},
        )

    if get_pause_available_days(order) < MAX_ORDER_PAUSE_DAYS:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Лимит заморозки уже использован для этого заказа"},
        )

    if not can_pause_order(order):
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Заказ нельзя поставить на паузу в текущем статусе"},
        )

    old_status = order.status
    pause_until = pause_order(order, data.reason)
    await session.commit()
    await notify_pause_state_change(session, order, user, event="paused", old_status=old_status)

    return PauseOrderResponse(
        success=True,
        message="Заказ поставлен на паузу на 7 дней",
        new_status=order.status,
        pause_until=pause_until.isoformat(),
        paused_from_status=order.paused_from_status,
        pause_available_days=get_pause_available_days(order),
    )


@router.post("/orders/{order_id}/resume", response_model=PauseOrderResponse)
@rate_limit(limit=5, window=300, key_prefix="rl:resume_order")
async def resume_client_order(
    request: Request,
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    order_result = await session.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if not order or order.user_id != tg_user.id:
        return JSONResponse(status_code=404, content={"success": False, "message": "Order not found"})

    auto_resumed = await sync_order_pause_state(session, order, notify_user=True)

    if order.status != OrderStatus.PAUSED.value:
        if auto_resumed:
            return PauseOrderResponse(
                success=True,
                message="Пауза уже завершилась, заказ снова активен",
                new_status=order.status,
                pause_until=None,
                paused_from_status=None,
                pause_available_days=get_pause_available_days(order),
            )
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Заказ сейчас не находится на паузе"},
        )

    old_status = order.status
    resumed_status = resume_order(order)
    await session.commit()
    await notify_pause_state_change(session, order, user, event="resumed", old_status=old_status)

    return PauseOrderResponse(
        success=True,
        message="Заказ снова активен",
        new_status=resumed_status,
        pause_until=None,
        paused_from_status=None,
        pause_available_days=get_pause_available_days(order),
    )

# ═══════════════════════════════════════════════════════════════════════════
#  REVIEWS & CONFIRMATION
# ═══════════════════════════════════════════════════════════════════════════

REVIEWS_CHANNEL_ID = -1003241736635

@router.post("/orders/{order_id}/review", response_model=SubmitReviewResponse)
async def submit_order_review(
    order_id: int,
    data: SubmitReviewRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    if order.status != OrderStatus.COMPLETED.value:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Only for completed orders"}
        )

    if getattr(order, 'review_submitted', False):
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Review already submitted"}
        )

    stars = "⭐" * data.rating + "☆" * (5 - data.rating)
    work_label = order.work_type_label or order.work_type
    review_text = f"💬 <b>Новый отзыв</b>\n\n{stars}\n\n📚 <b>Тип работы:</b> {work_label}\n📝 <b>Предмет:</b> {order.subject or 'Не указан'}\n\n<i>\"{data.text}\"</i>\n\n━━━━━━━━━━━━━━━\n<i>Отзыв проверен • Academic Saloon</i>"

    try:
        bot = get_bot()
        await bot.send_message(chat_id=REVIEWS_CHANNEL_ID, text=review_text)
        order.review_submitted = True
        await session.commit()
    except Exception as e:
        logger.error(f"Review Error: {e}")
        return SubmitReviewResponse(success=False, message="Ошибка публикации")

    return SubmitReviewResponse(success=True, message="Спасибо за отзыв!")


@router.post("/orders/{order_id}/request-revision", response_model=RevisionRequestResponse)
async def request_revision(
    order_id: int,
    data: RevisionRequestData,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    if order.status != OrderStatus.REVIEW.value:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order must be in review"}
        )

    order.status = OrderStatus.REVISION.value
    order.revision_count = (order.revision_count or 0) + 1
    is_paid = order.revision_count > 3
    
    msg = OrderMessage(
        order_id=order_id, sender_type=MessageSender.CLIENT.value, sender_id=tg_user.id,
        message_text=f"📝 <b>Запрос на правки</b>\n\n{data.message}" if data.message else "📝 <b>Запрос на правки</b>",
        is_read=False,
    )
    session.add(msg)
    await session.commit()

    # Notify admin... (simplified for brevity, assume similar logic to create_order notification)
    try:
        from bot.handlers.order_chat import get_or_create_topic
        from bot.services.live_cards import send_or_update_card
        bot = get_bot()
        # Get user info for card update
        user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
        user = user_result.scalar_one_or_none()
        conv, topic_id = await get_or_create_topic(bot, session, tg_user.id, order_id)
        if topic_id:
            paid_text = "💰 <b>ПЛАТНАЯ ПРАВКА</b>\n" if is_paid else ""
            await bot.send_message(settings.ADMIN_GROUP_ID, message_thread_id=topic_id, text=f"✏️ <b>ЗАПРОС НА ПРАВКИ</b>\n{paid_text}Комментарий: {data.message}")
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None
        )
    except Exception as e:
        logger.warning(f"[Revision] Failed to notify admin about revision for order #{order_id}: {e}")

    return RevisionRequestResponse(success=True, message="Запрос отправлен", prefilled_text=f"Прошу внести правки:\n\n{data.message}", revision_count=order.revision_count, is_paid=is_paid)

@router.post("/orders/{order_id}/confirm-completion", response_model=ConfirmWorkResponse)
async def confirm_work_completion(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    if order.status != OrderStatus.REVIEW.value:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order must be in review"}
        )

    order.status = OrderStatus.COMPLETED.value
    order.completed_at = datetime.now(timezone.utc)

    await session.commit()

    # Cashback
    cashback = 0
    try:
        from bot.services.bonus import BonusService
        bot = get_bot()
        cashback_base = float(order.paid_amount or order.final_price or order.price or 0)
        cashback = await BonusService.add_order_cashback(session, bot, order.user_id, order.id, cashback_base)
    except Exception as e:
        logger.warning(f"[Completion] Failed to process cashback for order #{order.id}: {e}")

    # Notify Admin and Close Topic
    try:
        from bot.services.unified_hub import close_order_topic
        bot = get_bot()
        await close_order_topic(bot, session, order)
    except Exception as e:
        logger.warning(f"[Completion] Failed to close order topic for order #{order.id}: {e}")

    return ConfirmWorkResponse(success=True, message=f"Спасибо! Заказ завершён.")


# ═══════════════════════════════════════════════════════════════════════════
#  ARCHIVE / UNARCHIVE
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/orders/{order_id}/archive")
async def archive_order(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Archive an order to hide it from the main list"""
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    if order.is_archived:
        return {"success": True, "message": "Заказ уже в архиве"}

    order.is_archived = True
    await session.commit()

    return {"success": True, "message": "Заказ перемещён в архив"}


@router.post("/orders/{order_id}/unarchive")
async def unarchive_order(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Restore an order from archive"""
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    if not order.is_archived:
        return {"success": True, "message": "Заказ уже не в архиве"}

    order.is_archived = False
    await session.commit()

    return {"success": True, "message": "Заказ восстановлен из архива"}


# ═══════════════════════════════════════════════════════════════════════════
#  ORDER CANCELLATION
# ═══════════════════════════════════════════════════════════════════════════

CANCELABLE_STATUSES = {
    OrderStatus.DRAFT.value,
    OrderStatus.PENDING.value,
    OrderStatus.WAITING_PAYMENT.value,
    OrderStatus.CONFIRMED.value,
    OrderStatus.WAITING_ESTIMATION.value,
}

@router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Cancel an order (only for early-stage statuses)"""
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Заказ не найден"}
        )

    if order.status not in CANCELABLE_STATUSES:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Заказ в текущем статусе нельзя отменить"}
        )

    old_status = order.status
    order.status = OrderStatus.CANCELLED.value
    await session.commit()

    # Notify via WebSocket
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=tg_user.id,
            order_id=order_id,
            new_status=order.status,
        )
    except Exception as e:
        logger.warning(f"[Cancel] Failed to send WS notification for order #{order_id}: {e}")

    # Notify admin
    try:
        bot = get_bot()
        from bot.services.live_cards import send_or_update_card
        user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
        user = user_result.scalar_one_or_none()
        await send_or_update_card(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            extra_text=f"❌ Клиент отменил заказ (был: {old_status})",
        )
    except Exception as e:
        logger.warning(f"[Cancel] Failed to notify admin about order #{order_id} cancellation: {e}")

    return {"success": True, "message": "Заказ отменён"}

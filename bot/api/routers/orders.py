from __future__ import annotations

import html
import logging
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_session
from database.models.users import User
from database.models.orders import (
    LEGACY_WAITING_PAYMENT_STATUSES,
    ConversationType,
    MessageSender,
    Order,
    OrderMessage,
    OrderStatus,
    WORK_TYPE_LABELS,
    WorkType,
    canonicalize_order_status,
)
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
    BatchProcessedOrderItem, BatchFailedOrderItem,
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
from bot.services.order_lifecycle import can_complete_order
from bot.services.order_delivery_service import (
    get_delivery_history,
    get_latest_sent_delivery_batch,
    send_order_delivery_batch,
    serialize_delivery_batch,
)
from bot.services.order_revision_round_service import (
    bind_order_to_revision_round,
    get_current_revision_round,
    get_revision_round_history,
    serialize_revision_round,
)
from bot.services.order_status_service import (
    OrderStatusDispatchOptions,
    OrderStatusTransitionError,
    apply_order_status_transition,
    finalize_order_status_change,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Orders"])

PAYMENT_METHOD_LABELS = {
    "card": "Карта",
    "sbp": "СБП",
    "transfer": "Перевод",
}

PAYMENT_CONFIRM_ALLOWED_STATUSES = {
    OrderStatus.WAITING_PAYMENT.value,
    OrderStatus.PAID.value,
    OrderStatus.IN_PROGRESS.value,
    OrderStatus.REVIEW.value,
}

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


def get_payment_phase(order: Order) -> str:
    return "final" if is_followup_payment(order) else "initial"


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


def can_accept_payment_status(status: str) -> bool:
    return status in PAYMENT_CONFIRM_ALLOWED_STATUSES


def get_batch_payment_order_item(order: Order) -> BatchOrderItem | None:
    if not order.final_price or order.final_price <= 0:
        return None

    canonical_status = canonicalize_order_status(order.status) or order.status
    if not can_accept_payment_status(canonical_status):
        return None

    remaining_amount = get_order_remaining_amount(order)
    if remaining_amount <= 0:
        return None

    return BatchOrderItem(
        id=order.id,
        work_type_label=order.work_type_label,
        subject=order.subject,
        topic=order.topic,
        status=canonical_status,
        payment_phase=get_payment_phase(order),
        payment_scheme=order.payment_scheme,
        final_price=round(float(order.final_price), 2),
        remaining=round(float(remaining_amount), 2),
        amount_for_half=round(float(get_requested_payment_amount(order, "half")), 2),
        amount_for_full=round(float(get_requested_payment_amount(order, "full")), 2),
    )


def get_batch_processed_order_item(
    order: Order,
    *,
    amount_to_pay: Decimal,
    payment_phase: str,
) -> BatchProcessedOrderItem:
    return BatchProcessedOrderItem(
        id=order.id,
        work_type_label=order.work_type_label,
        subject=order.subject,
        topic=order.topic,
        amount_to_pay=round(float(amount_to_pay), 2),
        payment_phase=payment_phase,
        status=canonicalize_order_status(order.status) or order.status,
    )


def get_payment_method_label(payment_method: str) -> str:
    return PAYMENT_METHOD_LABELS.get(payment_method, payment_method)


def build_payment_card_extra_text(
    *,
    payment_method: str,
    payment_scheme: str,
    payment_phase: str,
    amount_to_pay: Decimal | float,
    related_order_ids: list[int] | None = None,
) -> str:
    method_text = get_payment_method_label(payment_method)
    if related_order_ids:
        scheme_text = "100%" if payment_scheme == "full" else "50% аванс"
        return (
            f"💳 Batch-оплата: {scheme_text} ({method_text})\n"
            f"📦 В общей заявке: {len(related_order_ids)} заказ(ов)\n"
            f"💰 Сумма по заказу: {format_price(amount_to_pay)}"
        )

    if payment_phase == "final":
        scheme_text = "доплата"
    else:
        scheme_text = "100%" if payment_scheme == "full" else "50% аванс"

    return (
        f"💳 Ожидает проверки: {scheme_text} ({method_text})\n"
        f"💰 Сумма: {format_price(amount_to_pay)}"
    )


async def sync_order_chat_conversation(
    *,
    session: AsyncSession,
    bot,
    user_id: int,
    order_id: int,
    preview_text: str,
) -> int | None:
    from bot.handlers.order_chat import get_or_create_topic, update_conversation

    conv, topic_id = await get_or_create_topic(
        bot=bot,
        session=session,
        user_id=user_id,
        order_id=order_id,
        conv_type=ConversationType.ORDER_CHAT.value,
    )
    await update_conversation(
        session,
        conv,
        last_message=preview_text,
        sender=MessageSender.CLIENT.value,
        increment_unread=True,
    )
    return topic_id


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
        )
    )
    orders = result.scalars().all()

    if not orders:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Не найдено заказов для оплаты"}
        )

    order_items: list[BatchOrderItem] = []
    total_amount_half = 0.0
    total_amount_full = 0.0
    order_index = {order_id: index for index, order_id in enumerate(data.order_ids)}

    for order in sorted(orders, key=lambda current: order_index.get(current.id, len(order_index))):
        item = get_batch_payment_order_item(order)
        if not item:
            continue
        order_items.append(item)
        total_amount_half += item.amount_for_half
        total_amount_full += item.amount_for_full

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
        total_amount=round(total_amount_full, 2),
        total_amount_half=round(total_amount_half, 2),
        total_amount_full=round(total_amount_full, 2),
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
        ).with_for_update()
    )
    orders = result.scalars().all()

    if not orders:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Не найдено заказов для оплаты"}
        )

    prepared_orders: list[tuple[Order, object, Decimal, str]] = []
    failed_orders: list[int] = []
    failed_order_details: list[BatchFailedOrderItem] = []
    order_index = {order_id: index for index, order_id in enumerate(data.order_ids)}
    found_order_ids = {order.id for order in orders}

    for missing_order_id in data.order_ids:
        if missing_order_id in found_order_ids:
            continue
        failed_orders.append(missing_order_id)
        failed_order_details.append(BatchFailedOrderItem(id=missing_order_id, reason="Заказ не найден"))

    for order in sorted(orders, key=lambda current: order_index.get(current.id, len(order_index))):
        canonical_status = canonicalize_order_status(order.status) or order.status
        if order.status == OrderStatus.VERIFICATION_PENDING.value:
            failed_orders.append(order.id)
            failed_order_details.append(BatchFailedOrderItem(id=order.id, reason="Оплата уже на проверке"))
            continue
        if canonical_status in {OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value, OrderStatus.COMPLETED.value}:
            failed_orders.append(order.id)
            failed_order_details.append(BatchFailedOrderItem(id=order.id, reason="Заказ больше не принимает оплату"))
            continue
        if not can_accept_payment_status(canonical_status):
            failed_orders.append(order.id)
            failed_order_details.append(BatchFailedOrderItem(id=order.id, reason="Сейчас этот заказ нельзя оплатить"))
            continue
        if not order.final_price or order.final_price <= 0:
            failed_orders.append(order.id)
            failed_order_details.append(BatchFailedOrderItem(id=order.id, reason="У заказа ещё нет цены"))
            continue
        amount_to_pay = get_requested_payment_amount(order, data.payment_scheme)
        if amount_to_pay <= 0:
            failed_orders.append(order.id)
            failed_order_details.append(BatchFailedOrderItem(id=order.id, reason="Заказ уже полностью оплачен"))
            continue
        payment_phase = get_payment_phase(order)
        try:
            change = apply_order_status_transition(order, OrderStatus.VERIFICATION_PENDING.value)
        except OrderStatusTransitionError as exc:
            failed_orders.append(order.id)
            failed_order_details.append(BatchFailedOrderItem(id=order.id, reason=str(exc)))
            continue
        order.payment_method = data.payment_method
        if payment_phase == "initial":
            order.payment_scheme = data.payment_scheme
        elif order.payment_scheme not in {"half", "full"}:
            order.payment_scheme = "half"
        prepared_orders.append((order, change, amount_to_pay, payment_phase))

    processed_orders: list[BatchProcessedOrderItem] = []
    total_amount = Decimal("0")

    if prepared_orders:
        bot = get_bot()
        related_order_ids = [order.id for order, _change, _amount, _phase in prepared_orders]
        planned_total_amount = sum(amount for _order, _change, amount, _phase in prepared_orders)
        for order, change, amount_to_pay, payment_phase in prepared_orders:
            try:
                await finalize_order_status_change(
                    session,
                    bot,
                    order,
                    change,
                    dispatch=OrderStatusDispatchOptions(
                        update_live_card=True,
                        client_username=user.username,
                        client_name=user.fullname,
                        notification_extra_data={
                            "payment_method": data.payment_method,
                            "payment_scheme": order.payment_scheme or data.payment_scheme,
                            "payment_phase": payment_phase,
                            "amount_to_pay": round(float(amount_to_pay), 2),
                            "is_batch": True,
                            "batch_orders_count": len(related_order_ids),
                            "batch_total_amount": round(float(planned_total_amount), 2),
                            "batch_order_ids": related_order_ids,
                        },
                        card_extra_text=build_payment_card_extra_text(
                            payment_method=data.payment_method,
                            payment_scheme=order.payment_scheme or data.payment_scheme,
                            payment_phase=payment_phase,
                            amount_to_pay=amount_to_pay,
                            related_order_ids=related_order_ids,
                        ),
                    ),
                )
            except Exception as exc:
                logger.warning(f"[Batch] Failed to finalize payment for order #{order.id}: {exc}")
                failed_orders.append(order.id)
                failed_order_details.append(BatchFailedOrderItem(id=order.id, reason="Не удалось отправить заказ на проверку"))
                continue

            total_amount += amount_to_pay
            processed_orders.append(
                get_batch_processed_order_item(
                    order,
                    amount_to_pay=amount_to_pay,
                    payment_phase=payment_phase,
                )
            )

        if processed_orders:
            try:
                from bot.api.websocket import notify_admin_batch_payment_pending
                await notify_admin_batch_payment_pending(
                    user_fullname=user.fullname,
                    user_username=user.username,
                    payment_method=data.payment_method,
                    payment_scheme=data.payment_scheme,
                    processed_orders=[item.model_dump() for item in processed_orders],
                    total_amount=float(total_amount),
                )
            except Exception as e:
                logger.warning(f"[Batch] Failed to notify admins about batch payment: {e}")

            try:
                from bot.services.admin_payment_notifications import (
                    send_admin_batch_payment_pending_summary,
                    send_admin_payment_pending_alert,
                )

                await send_admin_batch_payment_pending_summary(
                    bot=bot,
                    user=user,
                    processed_orders=[item.model_dump() for item in processed_orders],
                    total_amount=float(total_amount),
                    payment_method=data.payment_method,
                    payment_scheme=data.payment_scheme,
                )
            except Exception as e:
                logger.warning(f"[Batch] Failed to send admin batch summary for payment: {e}")

            try:
                processed_by_id = {item.id: item for item in processed_orders}
                for order, _change, amount_to_pay, payment_phase in prepared_orders:
                    item = processed_by_id.get(order.id)
                    if not item:
                        continue
                    try:
                        await send_admin_payment_pending_alert(
                            bot=bot,
                            session=session,
                            order=order,
                            user=user,
                            amount=float(amount_to_pay),
                            payment_method=data.payment_method,
                            payment_phase=payment_phase,
                            batch_orders_count=len(related_order_ids),
                            batch_total_amount=float(planned_total_amount),
                            batch_order_ids=related_order_ids,
                        )
                    except Exception as e:
                        logger.warning(f"[Batch] Failed to send admin bot alert for order #{order.id}: {e}")
            except Exception as e:
                logger.warning(f"[Batch] Failed to build admin bot alerts for batch payment: {e}")

            try:
                order_ids_str = ", ".join(f"#{item.id}" for item in processed_orders)
                failed_note = ""
                if failed_order_details:
                    failed_note = (
                        "\n\nНе удалось включить:\n"
                        + "\n".join(f"• #{item.id} — {item.reason}" for item in failed_order_details[:5])
                    )
                await bot.send_message(
                    chat_id=user.telegram_id,
                    text=(
                        "✅ <b>Заявка на оплату принята!</b>\n\n"
                        f"Заказы: <code>{order_ids_str}</code>\n"
                        f"Сумма: <b>{format_price(total_amount)}</b>\n"
                        f"Способ: {get_payment_method_label(data.payment_method)}\n\n"
                        "Менеджер проверит поступление и подтвердит все заказы."
                        f"{failed_note}"
                    ),
                )
            except Exception as e:
                logger.error(f"Batch payment notification error: {e}")

    if not processed_orders:
        return BatchPaymentConfirmResponse(
            success=False,
            message="Не удалось обработать ни один заказ",
            processed_count=0,
            total_amount=0,
            failed_orders=failed_orders or [o.id for o in orders],
            failed_order_details=failed_order_details,
            payment_method=data.payment_method,
            payment_scheme=data.payment_scheme,
        )

    return BatchPaymentConfirmResponse(
        success=True,
        message=f"Заявка на оплату {len(processed_orders)} заказов отправлена на проверку",
        processed_count=len(processed_orders),
        total_amount=round(float(total_amount), 2),
        failed_orders=failed_orders,
        processed_orders=processed_orders,
        failed_order_details=failed_order_details,
        payment_method=data.payment_method,
        payment_scheme=data.payment_scheme,
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
    latest_delivery = await get_latest_sent_delivery_batch(session, order.id)
    delivery_history = await get_delivery_history(session, order.id)
    current_revision_round = await get_current_revision_round(session, order.id)
    revision_history = await get_revision_round_history(session, order.id)
    return order_to_response(
        order,
        latest_delivery=serialize_delivery_batch(latest_delivery) if latest_delivery else None,
        delivery_history=[serialize_delivery_batch(batch) for batch in delivery_history],
        current_revision_round=serialize_revision_round(current_revision_round) if current_revision_round else None,
        revision_history=[serialize_revision_round(round_) for round_ in revision_history],
    )

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
        return OrderCreateResponse(success=False, order_id=0, message="Ошибка расчёта цены", price=None, is_manual_required=False)

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
        logger.info("[API /orders/create] 🎟️ No promo_code received in request")

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

    owner_result = await session.execute(select(User).where(User.telegram_id == order.user_id))
    order_owner = owner_result.scalar_one_or_none() or user

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

    uploader_is_admin = is_admin and order.user_id != tg_user.id
    upload_kwargs = {
        "files": file_data,
        "order_id": order.id,
        "client_name": order_owner.fullname or f"User_{order.user_id}",
        "work_type": order.work_type,
        "telegram_id": order_owner.telegram_id,
        "client_username": order_owner.username,
        "order_meta": yandex_disk_service.build_order_meta(order),
    }

    if uploader_is_admin:
        result = None
    else:
        result = await yandex_disk_service.upload_multiple_files(**upload_kwargs)

    if uploader_is_admin:
        try:
            delivery_result = await send_order_delivery_batch(
                session,
                get_bot(),
                order,
                user=order_owner,
                source="api_admin_upload",
                sent_by_admin_id=tg_user.id,
                binary_files=file_data,
            )
        except ValueError as exc:
            return FileUploadResponse(
                success=False,
                message=f"Ошибка загрузки: {exc}",
                uploaded_count=0,
                blocked_files=blocked_files,
                oversized_files=oversized_files,
            )

        uploaded_count = int(delivery_result.batch.file_count or len(file_data))
        rejected_count = len(blocked_files) + len(oversized_files)
        storage_failed_count = max(len(file_data) - uploaded_count, 0)
        review_reopened = delivery_result.review_status_changed
        response_files_url = delivery_result.batch.files_url or order.files_url
        message = f"✅ Версия {delivery_result.batch.version_number} отправлена клиенту"
        issue_notes = []
        if blocked_files:
            issue_notes.append(f"пропущены неподдерживаемые файлы ({len(blocked_files)})")
        if oversized_files:
            issue_notes.append(f"пропущены файлы больше 50 МБ ({len(oversized_files)})")
        if storage_failed_count > 0:
            issue_notes.append(f"не загрузились {storage_failed_count} файл(ов)")
        if review_reopened:
            message += " и заказ возвращён на проверку"
        if issue_notes:
            message = f"{message}; {', '.join(issue_notes)}"

        return FileUploadResponse(
            success=True,
            message=message,
            files_url=response_files_url,
            uploaded_count=uploaded_count,
            blocked_files=blocked_files,
            oversized_files=oversized_files,
        )

    if result.success:
        if result.folder_url:
            order.files_url = result.folder_url
            await session.commit()

        uploaded_count = result.uploaded_count or len(file_data)
        review_reopened = False

        try:
            bot = get_bot()
            from bot.services.live_cards import send_or_update_card
            card_prefix = "📤 Выгружено итоговых файлов" if uploader_is_admin else "📎"
            await send_or_update_card(
                bot=bot,
                order=order,
                session=session,
                client_username=order_owner.username,
                client_name=order_owner.fullname,
                extra_text=f"{card_prefix}: {uploaded_count}",
            )
        except Exception as e:
            logger.warning(f"[Files] Failed to update live card for order #{order.id}: {e}")

        rejected_count = len(blocked_files) + len(oversized_files)
        storage_failed_count = max(len(file_data) - uploaded_count, 0)

        if uploader_is_admin:
            message = f"✅ Загружено {uploaded_count} из {len(files)} файл(ов) в раздел готовой работы"
        else:
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
            if uploader_is_admin and review_reopened:
                message += " в раздел готовой работы и заказ возвращён клиенту на проверку"
            elif uploader_is_admin:
                message += " в раздел готовой работы"

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

    canonical_status = canonicalize_order_status(order.status) or order.status

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

    if canonical_status in [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value, OrderStatus.COMPLETED.value]:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order cannot accept payment"}
        )

    if not can_accept_payment_status(canonical_status):
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
    payment_phase = get_payment_phase(order)
    amount_to_pay = get_requested_payment_amount(order, requested_scheme)
    if amount_to_pay <= 0:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order is already fully paid"}
        )

    try:
        change = apply_order_status_transition(order, OrderStatus.VERIFICATION_PENDING.value)
    except OrderStatusTransitionError as exc:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": str(exc)}
        )
    order.payment_method = data.payment_method
    if payment_phase == "initial":
        order.payment_scheme = requested_scheme
    elif order.payment_scheme not in {"half", "full"}:
        order.payment_scheme = "half"

    bot = get_bot()
    await finalize_order_status_change(
        session,
        bot,
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            client_username=user.username if user else tg_user.username,
            client_name=user.fullname if user else tg_user.first_name,
            notification_extra_data={
                "payment_method": data.payment_method,
                "payment_scheme": order.payment_scheme,
                "payment_phase": payment_phase,
                "amount_to_pay": round(float(amount_to_pay), 2),
            },
            card_extra_text=build_payment_card_extra_text(
                payment_method=data.payment_method,
                payment_scheme=order.payment_scheme or requested_scheme,
                payment_phase=payment_phase,
                amount_to_pay=amount_to_pay,
            ),
        ),
    )

    # Notify admins about pending payment
    try:
        from bot.api.websocket import notify_admin_payment_pending
        await notify_admin_payment_pending(
            order_id=order.id,
            user_fullname=user.fullname if user else "Unknown",
            amount=float(amount_to_pay),
            payment_method=data.payment_method,
            payment_phase=payment_phase,
            work_type_label=order.work_type_label,
            subject=order.subject,
        )
    except Exception as e:
        logger.warning(f"[Payment] Failed to notify admins about pending payment for order #{order.id}: {e}")

    try:
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
        await bot.send_message(
            chat_id=tg_user.id,
            text=f"✅ <b>Заявка на оплату принята!</b>\n\nЗаказ <code>#{order.id}</code>\nСумма: <b>{format_price(amount_to_pay)}</b>\n\nМенеджер проверит поступление и подтвердит."
        )
    except Exception as e:
        logger.warning(f"[Payment] Failed to send live card/notification for order #{order.id}: {e}")

    try:
        await log_mini_app_event(
            bot=bot, event=MiniAppEvent.ORDER_VIEW, user_id=tg_user.id, username=user.username if user else tg_user.username,
            order_id=order.id, details=f"Подтвердил оплату: {format_price(amount_to_pay)}"
        )
    except Exception as e:
        logger.warning(f"[Payment] Failed to log mini app event for order #{order.id}: {e}")

    return PaymentConfirmResponse(
        success=True,
        message="Заявка на оплату отправлена на проверку",
        new_status=order.status,
        amount_to_pay=float(amount_to_pay),
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
    if phone_raw.startswith("8"):
        phone_raw = "+7" + phone_raw[1:]
    elif not phone_raw.startswith("+"):
        phone_raw = "+7" + phone_raw

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
    try:
        pause_until = pause_order(order, data.reason)
    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": str(exc)}
        )
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
    try:
        resumed_status = resume_order(order)
    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": str(exc)}
        )
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
    review_text = (
        "💬 <b>Новый отзыв</b>\n\n"
        f"{stars}\n\n"
        f"📚 <b>Тип работы:</b> {html.escape(work_label)}\n"
        f"📝 <b>Предмет:</b> {html.escape(order.subject or 'Не указан')}\n\n"
        f"<i>\"{html.escape(data.text)}\"</i>\n\n"
        "━━━━━━━━━━━━━━━\n"
        "<i>Отзыв проверен • Academic Saloon</i>"
    )

    try:
        bot = get_bot()
        await bot.send_message(chat_id=REVIEWS_CHANNEL_ID, text=review_text)
        order.review_submitted = True
        await session.commit()

        try:
            from bot.services.achievements import sync_user_achievements
            await sync_user_achievements(
                session=session,
                telegram_id=tg_user.id,
                bot=bot,
                notify=True,
            )
        except Exception as exc:
            logger.warning(f"[Achievements] Failed to sync review achievements for {tg_user.id}: {exc}")
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
    order_result = await session.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if not order or order.user_id != tg_user.id:
        return JSONResponse(
            status_code=404,
            content={"success": False, "message": "Order not found"}
        )

    if order.status not in {OrderStatus.REVIEW.value, OrderStatus.REVISION.value}:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order must be in review or revision"}
        )

    revision_comment = data.message
    revision_binding = await bind_order_to_revision_round(
        session,
        order,
        requested_by_user_id=tg_user.id,
        initial_comment=revision_comment,
        create_if_missing=True,
    )
    if revision_binding is None:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Failed to open revision round"},
        )
    revision_round = revision_binding.revision_round
    revision_created = revision_binding.created
    if revision_created:
        order.revision_count = max(int(order.revision_count or 0), int(revision_round.round_number or 0))

    change = None
    if order.status == OrderStatus.REVIEW.value:
        try:
            change = apply_order_status_transition(order, OrderStatus.REVISION.value)
        except OrderStatusTransitionError as exc:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": str(exc)}
            )

    msg = OrderMessage(
        order_id=order_id, sender_type=MessageSender.CLIENT.value, sender_id=tg_user.id,
        message_text=f"📝 <b>Запрос на правки</b>\n\n{revision_comment}",
        revision_round_id=revision_round.id,
        is_read=False,
    )
    session.add(msg)

    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    bot = get_bot()
    if change is not None:
        await finalize_order_status_change(
            session,
            bot,
            order,
            change,
            dispatch=OrderStatusDispatchOptions(
                update_live_card=True,
                client_username=user.username if user else tg_user.username,
                client_name=user.fullname if user else tg_user.first_name,
                notification_extra_data={
                    "revision_count": order.revision_count,
                    "revision_round_number": int(revision_round.round_number or order.revision_count or 0),
                    "is_paid": False,
                },
                card_extra_text="✏️ Клиент запросил правки",
            ),
        )
    else:
        await session.commit()

    try:
        topic_id = await sync_order_chat_conversation(
            session=session,
            bot=bot,
            user_id=tg_user.id,
            order_id=order_id,
            preview_text="📝 Клиент дополнил правки" if not revision_created else "📝 Запрос на правки",
        )
        if topic_id:
            await bot.send_message(
                settings.ADMIN_GROUP_ID,
                message_thread_id=topic_id,
                text=(
                    (
                        f"✏️ <b>ПРАВКА #{int(revision_round.round_number or 0)}</b>\n"
                        if not revision_created
                        else f"✏️ <b>ЗАПРОС НА ПРАВКИ #{int(revision_round.round_number or 0)}</b>\n"
                    )
                    + f"Комментарий: {html.escape(revision_comment)}"
                ),
            )
    except Exception as e:
        logger.warning(f"[Revision] Failed to notify admin about revision for order #{order_id}: {e}")

    try:
        from bot.api.websocket import (
            notify_revision_round_opened,
            notify_revision_round_updated,
        )

        if revision_created:
            await notify_revision_round_opened(
                telegram_id=tg_user.id,
                order_id=order.id,
                revision_round_id=revision_round.id,
                round_number=int(revision_round.round_number or 0),
                initial_comment=revision_comment,
            )
        else:
            await notify_revision_round_updated(
                telegram_id=tg_user.id,
                order_id=order.id,
                revision_round_id=revision_round.id,
                round_number=int(revision_round.round_number or 0),
                latest_comment=revision_comment,
            )
    except Exception as exc:
        logger.warning("[Revision] Failed to notify client about revision round event for order #%s: %s", order_id, exc)

    return RevisionRequestResponse(
        success=True,
        message="Запрос отправлен",
        prefilled_text=f"Прошу внести правки:\n\n{revision_comment}",
        revision_count=order.revision_count,
        is_paid=False,
    )

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

    if not can_complete_order(order):
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Order must be in review"}
        )

    try:
        change = apply_order_status_transition(order, OrderStatus.COMPLETED.value)
    except OrderStatusTransitionError as exc:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": str(exc)}
        )

    bot = get_bot()
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    change = await finalize_order_status_change(
        session,
        bot,
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            close_topic=True,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            card_extra_text="✅ Клиент подтвердил получение",
        ),
    )

    return ConfirmWorkResponse(success=True, message="Спасибо! Заказ завершён.")


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
    OrderStatus.WAITING_ESTIMATION.value,
    *LEGACY_WAITING_PAYMENT_STATUSES,
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

    try:
        change = apply_order_status_transition(order, OrderStatus.CANCELLED.value)
    except OrderStatusTransitionError as exc:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": str(exc)}
        )

    bot = get_bot()
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    await finalize_order_status_change(
        session,
        bot,
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            client_username=user.username if user else None,
            client_name=user.fullname if user else None,
            card_extra_text=f"❌ Клиент отменил заказ (был: {change.old_status})",
        ),
    )

    return {"success": True, "message": "Заказ отменён"}

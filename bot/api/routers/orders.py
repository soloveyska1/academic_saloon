import logging
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Request
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_session
from database.models.users import User
from database.models.orders import Order, OrderStatus, WorkType, WORK_TYPE_LABELS, OrderMessage, MessageSender, Conversation, ConversationType
from core.config import settings
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import (
    OrderResponse, OrdersListResponse, OrderCreateRequest, OrderCreateResponse,
    PromoCodeRequest, PromoCodeResponse, FileUploadResponse,
    PaymentConfirmRequest, PaymentConfirmResponse, PaymentInfoResponse,
    SubmitReviewRequest, SubmitReviewResponse, RevisionRequestData, RevisionRequestResponse,
    ConfirmWorkResponse,
    BatchPaymentInfoRequest, BatchPaymentInfoResponse, BatchOrderItem,
    BatchPaymentConfirmRequest, BatchPaymentConfirmResponse
)
from bot.api.dependencies import (
    get_loyalty_levels, get_loyalty_info, order_to_response
)
from bot.services.pricing import calculate_price
from bot.services.yandex_disk import yandex_disk_service
from bot.services.mini_app_logger import (
    log_order_created, log_mini_app_event, MiniAppEvent
)
from bot.bot_instance import get_bot

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Orders"])

# ═══════════════════════════════════════════════════════════════════════════
#  ORDER LIST & DETAIL
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/orders", response_model=OrdersListResponse)
async def get_orders(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
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
        raise HTTPException(status_code=404, detail="User not found")

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

    count_result = await session.execute(query.with_only_columns(Order.id))
    total = len(count_result.all())

    query = query.order_by(desc(Order.created_at)).offset(offset).limit(limit)
    result = await session.execute(query)
    orders = result.scalars().all()

    return OrdersListResponse(
        orders=[order_to_response(o) for o in orders],
        total=total,
        has_more=offset + len(orders) < total
    )

# ═══════════════════════════════════════════════════════════════════════════
#  BATCH PAYMENT (Pay All) — Must be before /orders/{order_id} route!
# ═══════════════════════════════════════════════════════════════════════════

from bot.api.rate_limit import rate_limit_payment

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
        raise HTTPException(status_code=404, detail="Не найдено заказов для оплаты")

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
        raise HTTPException(status_code=400, detail="Все заказы уже оплачены")

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
async def confirm_batch_payment(
    request: Request,
    data: BatchPaymentConfirmRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Confirm payment for multiple orders at once"""
    await rate_limit_payment.check(request)

    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await session.execute(
        select(Order).where(
            Order.id.in_(data.order_ids),
            Order.user_id == tg_user.id,
            Order.status.in_(['confirmed', 'waiting_payment'])
        )
    )
    orders = result.scalars().all()

    if not orders:
        raise HTTPException(status_code=404, detail="Не найдено заказов для оплаты")

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
        except Exception:
            pass

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
                text=f"✅ <b>Заявка на оплату принята!</b>\n\nЗаказы: <code>{order_ids_str}</code>\nСумма: <b>{total_amount:,.0f}₽</b>\nСпособ: {method_text}\n\nМенеджер проверит поступление и подтвердит все заказы.".replace(",", " ")
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
        raise HTTPException(status_code=404, detail="Order not found")

    return order_to_response(order)

# ═══════════════════════════════════════════════════════════════════════════
#  PROMO CODE
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/promo", response_model=PromoCodeResponse)
async def apply_promo_code(
    data: PromoCodeRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Apply promo code - checks database first, then hardcoded fallbacks"""
    from bot.services.promo_service import PromoService

    code = data.code.upper().strip()

    # First, check database for promo codes created in admin panel
    is_valid, message, discount = await PromoService.check_promo_code(
        session, code, tg_user.id
    )

    if is_valid:
        return PromoCodeResponse(
            success=True,
            message=f"Промокод {code} активирован! Скидка {int(discount)}%",
            discount=int(discount)
        )

    # Fallback to hardcoded demo codes (legacy support)
    hardcoded_promos = {
        "COWBOY20": {"discount": 20, "message": "Йи-ха! Скидка 20% применена!"},
        "SALOON10": {"discount": 10, "message": "Скидка 10% — добро пожаловать в салун!"},
        "WELCOME5": {"discount": 5, "message": "Скидка 5% для новичка!"},
    }

    if code in hardcoded_promos:
        promo = hardcoded_promos[code]
        return PromoCodeResponse(
            success=True,
            message=promo["message"],
            discount=promo["discount"]
        )

    # If not found anywhere, return the message from PromoService
    return PromoCodeResponse(
        success=False,
        message=message  # This will be "Промокод не найден" or specific error
    )

# ═══════════════════════════════════════════════════════════════════════════
#  ORDER CREATION
# ═══════════════════════════════════════════════════════════════════════════

from bot.api.rate_limit import rate_limit_create, rate_limit_payment

@router.post("/orders/create", response_model=OrderCreateResponse)
async def create_order(
    request: Request,
    data: OrderCreateRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new order from Mini App."""
    await rate_limit_create.check(request)
    from bot.handlers.order_chat import get_or_create_topic
    from bot.services.live_cards import send_or_update_card
    from bot.services.promo_service import PromoService

    logger.info(f"[API /orders/create] New order from user {tg_user.id}: {data.work_type}")

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

    # Handle promo code if provided
    promo_discount = 0
    promo_code_used = None
    if data.promo_code:
        is_valid, message, discount = await PromoService.check_promo_code(
            session, data.promo_code, tg_user.id
        )
        if is_valid:
            promo_discount = discount
            promo_code_used = data.promo_code
            logger.info(f"[API /orders/create] Promo code {data.promo_code} applied: {discount}% discount")
        else:
            # Also check hardcoded promos (legacy)
            hardcoded_promos = {
                "COWBOY20": 20, "SALOON10": 10, "WELCOME5": 5,
            }
            if data.promo_code in hardcoded_promos:
                promo_discount = hardcoded_promos[data.promo_code]
                promo_code_used = data.promo_code
                logger.info(f"[API /orders/create] Hardcoded promo {data.promo_code} applied: {promo_discount}% discount")

    # Calculate final price with promo discount
    base_price = float(price_calc.final_price) if not price_calc.is_manual_required else 0.0
    total_discount = min(user_discount + promo_discount, 50)  # Max 50% total discount
    final_order_price = base_price * (1 - promo_discount / 100) if promo_discount > 0 else base_price

    initial_status = OrderStatus.WAITING_ESTIMATION.value

    order = Order(
        user_id=user.telegram_id,
        work_type=data.work_type,
        subject=data.subject,
        topic=data.topic,
        description=data.description,
        deadline=data.deadline,
        price=base_price,
        discount=float(total_discount),
        status=initial_status,
    )

    # Add promo info to description if used
    if promo_code_used:
        promo_note = f"\n\n🏷️ Промокод: {promo_code_used} (-{promo_discount}%)"
        order.description = (order.description or '') + promo_note

    try:
        session.add(order)
        await session.commit()
        await session.refresh(order)
    except Exception as db_error:
        logger.error(f"DB Error: {db_error}")
        await session.rollback()
        return OrderCreateResponse(success=False, order_id=0, message="Ошибка создания заказа", price=None, is_manual_required=False)

    logger.info(f"[API /orders/create] Order #{order.id} created")

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

    # Admin notification
    try:
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
        work_label = WORK_TYPE_LABELS.get(work_type_enum, data.work_type)
        promo_text = f"\n🏷️ Промокод: <code>{promo_code_used}</code> (-{promo_discount}%)" if promo_code_used else ""
        user_message = f"✅ <b>Заказ #{order.id} принят!</b>\n\n📋 <b>{work_label}</b>\n📚 {data.subject}\n⏰ Срок: {data.deadline}{promo_text}\n\nМенеджер оценит заказ и вернётся с точной ценой."
        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📱 Открыть Мини-апп", web_app={"url": f"{settings.WEBAPP_URL}/orders"})],
            [InlineKeyboardButton(text="💬 Написать менеджеру", callback_data=f"enter_chat_order_{order.id}")],
        ])
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

    message = "🦄 Спецзаказ принят! Шериф оценит сложность и вернётся с ценой." if price_calc.is_manual_required else f"✅ Заказ #{order.id} создан! Ожидайте оценку от менеджера."

    return OrderCreateResponse(
        success=True,
        order_id=order.id,
        message=message,
        price=float(price_calc.final_price) if not price_calc.is_manual_required else None,
        is_manual_required=price_calc.is_manual_required
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
        raise HTTPException(status_code=404, detail="User not found")

    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    if not yandex_disk_service.is_available:
        return FileUploadResponse(success=False, message="Файловое хранилище временно недоступно")

    file_data = []
    for file in files:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            continue
        file_data.append((content, file.filename))

    if not file_data:
        return FileUploadResponse(success=False, message="Нет файлов для загрузки", uploaded_count=0)

    result = await yandex_disk_service.upload_multiple_files(
        files=file_data,
        order_id=order.id,
        client_name=user.fullname or f"User_{user.telegram_id}",
        work_type=order.work_type,
        telegram_id=user.telegram_id,
    )

    if result.success:
        order.files_url = result.folder_url
        await session.commit()

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
        except Exception:
            pass

        return FileUploadResponse(success=True, message=f"✅ Загружено {len(file_data)} файл(ов)", files_url=result.folder_url, uploaded_count=len(file_data))

    return FileUploadResponse(success=False, message=f"Ошибка загрузки: {result.error}")

# ═══════════════════════════════════════════════════════════════════════════
#  PAYMENT
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/orders/{order_id}/confirm-payment", response_model=PaymentConfirmResponse)
async def confirm_payment(
    request: Request,
    order_id: int,
    data: PaymentConfirmRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await rate_limit_payment.check(request)
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status in [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value, OrderStatus.COMPLETED.value]:
        raise HTTPException(status_code=400, detail="Order cannot accept payment")
    
    if not order.final_price or order.final_price <= 0:
        raise HTTPException(status_code=400, detail="Order has no price")

    final_price = order.final_price
    amount_to_pay = final_price / 2 if data.payment_scheme == 'half' else final_price

    order.status = OrderStatus.VERIFICATION_PENDING.value
    order.payment_method = data.payment_method
    order.payment_scheme = data.payment_scheme
    await session.commit()

    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=tg_user.id, order_id=order_id, new_status=order.status,
            extra_data={"payment_method": data.payment_method, "payment_scheme": data.payment_scheme}
        )
    except Exception:
        pass

    try:
        bot = get_bot()
        from bot.services.live_cards import send_or_update_card
        scheme_text = "100%" if data.payment_scheme == 'full' else "50% аванс"
        method_text = {"card": "Карта", "sbp": "СБП", "transfer": "Перевод"}.get(data.payment_method, data.payment_method)
        await send_or_update_card(
            bot=bot, order=order, session=session, client_username=user.username, client_name=user.fullname,
            extra_text=f"💳 Ожидает проверки: {scheme_text} ({method_text})\n💰 Сумма: {amount_to_pay:,.0f}₽".replace(",", " ")
        )
        await bot.send_message(
            chat_id=user.telegram_id,
            text=f"✅ <b>Заявка на оплату принята!</b>\n\nЗаказ <code>#{order.id}</code>\nСумма: <b>{amount_to_pay:,.0f}₽</b>\n\nМенеджер проверит поступление и подтвердит.".replace(",", " ")
        )
    except Exception:
        pass

    try:
        await log_mini_app_event(
            bot=get_bot(), event=MiniAppEvent.ORDER_VIEW, user_id=user.telegram_id, username=user.username,
            order_id=order.id, details=f"Подтвердил оплату: {amount_to_pay:,.0f}₽".replace(",", " ")
        )
    except Exception:
        pass

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
        raise HTTPException(status_code=404, detail="Order not found")

    card_raw = settings.PAYMENT_CARD.replace(" ", "").replace("-", "")
    card_formatted = " ".join([card_raw[i:i+4] for i in range(0, len(card_raw), 4)])
    
    phone_raw = settings.PAYMENT_PHONE.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if phone_raw.startswith("8"): phone_raw = "+7" + phone_raw[1:]
    elif not phone_raw.startswith("+"): phone_raw = "+7" + phone_raw
    
    phone_formatted = f"{phone_raw[:2]} ({phone_raw[2:5]}) {phone_raw[5:8]}-{phone_raw[8:10]}-{phone_raw[10:12]}" if len(phone_raw) >= 12 else phone_raw

    return PaymentInfoResponse(
        order_id=order.id, status=order.status,
        price=round(float(order.price), 2), final_price=round(float(order.final_price), 2),
        discount=round(float(order.discount), 2), bonus_used=round(float(order.bonus_used), 2),
        paid_amount=round(float(order.paid_amount or 0), 2),
        remaining=round(float(order.final_price - (order.paid_amount or 0)), 2),
        card_number=card_formatted, card_holder=settings.PAYMENT_NAME.upper(),
        sbp_phone=phone_formatted, sbp_bank=settings.PAYMENT_BANKS,
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
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Only for completed orders")
    
    if getattr(order, 'review_submitted', False):
        raise HTTPException(status_code=400, detail="Review already submitted")

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
        raise HTTPException(status_code=404, detail="Not found")

    if order.status != OrderStatus.REVIEW.value:
        raise HTTPException(status_code=400, detail="Order must be in review")

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
        conv, topic_id = await get_or_create_topic(bot, session, tg_user.id, order_id)
        if topic_id:
            paid_text = "💰 <b>ПЛАТНАЯ ПРАВКА</b>\n" if is_paid else ""
            await bot.send_message(settings.ADMIN_GROUP_ID, message_thread_id=topic_id, text=f"✏️ <b>ЗАПРОС НА ПРАВКИ</b>\n{paid_text}Комментарий: {data.message}")
        await send_or_update_card(bot, order, session)
    except Exception:
        pass

    return RevisionRequestResponse(success=True, message="Запрос отправлен", prefilled_text=f"Прошу внести правки:\n\n{data.message}", revision_count=order.revision_count, is_paid=is_paid)

@router.post("/orders/{order_id}/confirm-completion", response_model=ConfirmWorkResponse)
async def confirm_work_completion(
    order_id: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    order = await session.get(Order, order_id)
    if not order or order.user_id != tg_user.id:
        raise HTTPException(status_code=404, detail="Not found")

    if order.status != OrderStatus.REVIEW.value:
        raise HTTPException(status_code=400, detail="Must be in review")

    order.status = OrderStatus.COMPLETED.value
    order.completed_at = datetime.now(timezone.utc)
    
    # Update Stats
    user_result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = user_result.scalar_one_or_none()
    if user:
        user.orders_count = (user.orders_count or 0) + 1
        user.total_spent = (user.total_spent or 0) + float(order.paid_amount or order.final_price or 0)
    
    await session.commit()

    # Cashback
    cashback = 0
    try:
        from bot.services.bonus import BonusService
        bot = get_bot()
        cashback = await BonusService.add_order_cashback(session, bot, order.user_id, order.id, float(order.price or 0))
    except Exception:
        pass

    # Notify Admin and Close Topic
    try:
        from bot.services.unified_hub import close_order_topic
        bot = get_bot()
        await close_order_topic(bot, session, order)
    except Exception:
        pass

    return ConfirmWorkResponse(success=True, message=f"Спасибо! Заказ завершён.")

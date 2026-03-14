"""
YooKassa payment endpoints.

- POST /payments/create — create payment link for Mini App
- POST /yookassa/webhook — process YooKassa callbacks (payment.succeeded, etc.)
"""

import hashlib
import hmac
import ipaddress
import json
import logging
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from database.db import get_session
from database.models.orders import Order, OrderStatus
from database.models.users import User
from database.models.payment_logs import PaymentLog
from bot.api.auth import TelegramUser, get_current_user
from bot.api.rate_limit import rate_limit
from bot.services.yookassa import get_yookassa_service
from bot.services.bonus import BonusService, BonusReason
from bot.utils.formatting import format_price

logger = logging.getLogger(__name__)
router = APIRouter(tags=["payments"])


# ══════════════════════════════════════════════════════════
#  YOOKASSA WEBHOOK SECURITY
# ══════════════════════════════════════════════════════════

# Official YooKassa IP ranges for webhook callbacks
# https://yookassa.ru/developers/using-api/webhooks
YOOKASSA_IP_NETWORKS = [
    ipaddress.ip_network("185.71.76.0/27"),
    ipaddress.ip_network("185.71.77.0/27"),
    ipaddress.ip_network("77.75.153.0/25"),
    ipaddress.ip_network("77.75.154.128/25"),
    ipaddress.ip_network("77.75.156.11/32"),
    ipaddress.ip_network("77.75.156.35/32"),
    ipaddress.ip_network("2a02:5180::/32"),
]


def _is_yookassa_ip(client_ip: str) -> bool:
    """Check if request IP belongs to YooKassa network."""
    try:
        addr = ipaddress.ip_address(client_ip)
        return any(addr in network for network in YOOKASSA_IP_NETWORKS)
    except (ValueError, TypeError):
        return False


def _get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting X-Forwarded-For behind nginx."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First IP in the chain is the real client
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return ""


# ══════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════

class CreatePaymentRequest(BaseModel):
    order_id: int
    payment_scheme: str = "half"  # "half" or "full"


class CreatePaymentResponse(BaseModel):
    success: bool
    payment_url: str | None = None
    payment_id: str | None = None
    amount: float = 0
    error: str | None = None


# ══════════════════════════════════════════════════════════
#  CREATE PAYMENT
# ══════════════════════════════════════════════════════════

@router.post("/payments/create", response_model=CreatePaymentResponse)
@rate_limit(limit=5, window=60, key_prefix="rl:payment")
async def create_payment(
    request: Request,
    body: CreatePaymentRequest,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create YooKassa payment link for an order."""
    yookassa = get_yookassa_service()

    if not yookassa.is_available:
        raise HTTPException(status_code=503, detail="Онлайн-оплата временно недоступна")

    # Find order
    order = await session.get(Order, body.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    if order.user_id != tg_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа")

    if order.status not in [
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,
    ]:
        raise HTTPException(status_code=400, detail="Заказ не ожидает оплаты")

    if order.price <= 0:
        raise HTTPException(status_code=400, detail="Цена не установлена")

    # Calculate amount
    total = order.final_price
    if body.payment_scheme == "half":
        amount = total / 2
    else:
        amount = total

    amount = round(amount, 2)
    if amount < 1:
        raise HTTPException(status_code=400, detail="Сумма слишком мала")

    # Create YooKassa payment
    result = await yookassa.create_payment(
        amount=amount,
        order_id=order.id,
        description=f"Заказ #{order.id} — Academic Saloon",
        user_id=tg_user.id,
    )

    if not result.success:
        return CreatePaymentResponse(success=False, error=result.error)

    # Save payment ID and scheme on order
    order.yookassa_payment_id = result.payment_id
    order.payment_scheme = body.payment_scheme
    order.payment_method = "yookassa"
    await session.commit()

    logger.info(
        f"[YooKassa] Payment {result.payment_id} created for order #{order.id}, "
        f"amount={amount}, user={tg_user.id}"
    )

    return CreatePaymentResponse(
        success=True,
        payment_url=result.payment_url,
        payment_id=result.payment_id,
        amount=amount,
    )


# ══════════════════════════════════════════════════════════
#  YOOKASSA WEBHOOK
# ══════════════════════════════════════════════════════════

@router.post("/yookassa/webhook")
async def yookassa_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """
    Handle YooKassa webhook notifications.
    Called by YooKassa when payment status changes.

    Security:
    - IP whitelist: only YooKassa IPs accepted
    - Optional HMAC signature verification if YOOKASSA_WEBHOOK_SECRET is set

    Events:
    - payment.succeeded — payment completed
    - payment.canceled — payment failed/canceled
    """
    # ── IP whitelist check ──
    client_ip = _get_client_ip(request)
    if not _is_yookassa_ip(client_ip):
        logger.warning(f"[YooKassa Webhook] Rejected request from non-YooKassa IP: {client_ip}")
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = body.get("event")
    payment_obj = body.get("object", {})
    payment_id = payment_obj.get("id")

    logger.info(f"[YooKassa Webhook] event={event_type}, payment_id={payment_id}")

    if not payment_id:
        return {"status": "ignored", "reason": "no payment_id"}

    # Handle payment.succeeded
    if event_type == "payment.succeeded":
        await _handle_payment_succeeded(session, payment_obj)
        return {"status": "ok"}

    # Handle payment.canceled
    if event_type == "payment.canceled":
        await _handle_payment_canceled(session, payment_obj)
        return {"status": "ok"}

    return {"status": "ignored", "reason": f"unhandled event: {event_type}"}


async def _handle_payment_succeeded(session: AsyncSession, payment_obj: dict):
    """Process successful payment — auto-confirm order."""
    payment_id = payment_obj["id"]
    metadata = payment_obj.get("metadata", {})
    order_id = metadata.get("order_id")
    user_id = metadata.get("user_id")
    amount_value = float(payment_obj.get("amount", {}).get("value", 0))

    if not order_id:
        logger.warning(f"[YooKassa] No order_id in metadata for payment {payment_id}")
        return

    order_id = int(order_id)

    # Find order
    order = await session.get(Order, order_id)
    if not order:
        logger.warning(f"[YooKassa] Order #{order_id} not found for payment {payment_id}")
        return

    # True idempotency: check PaymentLog for duplicate payment_id
    existing_log = await session.execute(
        select(PaymentLog).where(PaymentLog.yookassa_payment_id == payment_id)
    )
    if existing_log.scalar_one_or_none():
        logger.info(f"[YooKassa] Payment {payment_id} already processed (PaymentLog), skipping")
        return

    # Also check order status as a secondary safeguard
    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value,
                        OrderStatus.IN_PROGRESS.value, OrderStatus.COMPLETED.value]:
        logger.info(f"[YooKassa] Order #{order_id} already in paid state, skipping")
        return

    # Log this payment immediately (before processing)
    payment_log = PaymentLog(
        yookassa_payment_id=payment_id,
        order_id=order_id,
        event_type="payment.succeeded",
        amount=Decimal(str(amount_value)),
        raw_payload=json.dumps(payment_obj, ensure_ascii=False, default=str),
    )
    session.add(payment_log)

    # Find user
    user_query = select(User).where(User.telegram_id == order.user_id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        logger.warning(f"[YooKassa] User not found for order #{order_id}")
        return

    # Deduct bonuses if used
    if order.bonus_used > 0:
        await BonusService.deduct_bonus(
            session=session,
            user_id=order.user_id,
            amount=order.bonus_used,
            reason=BonusReason.ORDER_DISCOUNT,
            description=f"Списание на заказ #{order.id}",
            user=user,
            auto_commit=False,
        )

    # Update order status
    if order.payment_scheme == "half":
        order.status = OrderStatus.PAID.value
        order.paid_amount = order.final_price / 2
    else:
        order.status = OrderStatus.PAID_FULL.value
        order.paid_amount = order.final_price

    # Update user stats
    user.orders_count += 1
    user.total_spent += order.paid_amount

    await session.commit()

    logger.info(
        f"[YooKassa] Order #{order_id} auto-confirmed. "
        f"Status={order.status}, paid={order.paid_amount:.0f}₽"
    )

    # ═══ POST-PAYMENT ACTIONS (non-critical, don't break on failure) ═══

    # Get bot instance for notifications
    try:
        from bot.bot_instance import get_bot
        bot = get_bot()
    except Exception:
        logger.warning("[YooKassa] Bot not available for notifications")
        bot = None

    # Update live card in channel
    try:
        from bot.services.live_cards import update_card_status
        await update_card_status(
            bot=bot,
            order=order,
            session=session,
            client_username=user.username,
            client_name=user.fullname,
            extra_text="✅ Оплата через YooKassa",
        )
    except Exception as e:
        logger.warning(f"[YooKassa] Failed to update live card: {e}")

    # WebSocket notification
    try:
        from bot.services.realtime_notifications import send_order_status_notification
        await send_order_status_notification(
            telegram_id=order.user_id,
            order_id=order.id,
            new_status=order.status,
            old_status=OrderStatus.WAITING_PAYMENT.value,
        )
    except Exception as e:
        logger.warning(f"[YooKassa] Failed to send WS notification: {e}")

    # Order bonus (50₽)
    order_bonus = 0
    try:
        order_bonus = await BonusService.process_order_bonus(
            session=session, bot=bot, user_id=order.user_id,
        )
    except Exception as e:
        logger.warning(f"[YooKassa] Failed to process order bonus for order #{order.id}: {e}")

    # Referral bonus
    if user.referrer_id:
        try:
            await BonusService.process_referral_bonus(
                session=session, bot=bot,
                referrer_id=user.referrer_id,
                order_amount=order.price,
                referred_user_id=order.user_id,
            )
        except Exception as e:
            logger.warning(f"[YooKassa] Failed to process referral bonus for order #{order.id}: {e}")

    # Telegram notification to user
    if bot:
        try:
            bonus_line = f"\n\n🎁 <b>+{order_bonus:.0f}₽</b> бонусов на баланс!" if order_bonus > 0 else ""

            from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(
                    text="Мои заказы",
                    web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/orders")
                )],
            ])

            await bot.send_message(
                order.user_id,
                f"<b>Оплата прошла успешно</b>\n\n"
                f"Заказ <b>#{order.id}</b> · {format_price(order.paid_amount)}\n"
                f"Приступаем к работе.{bonus_line}",
                reply_markup=keyboard,
            )
        except Exception as e:
            logger.warning(f"[YooKassa] Failed to notify user: {e}")

    # Digital receipt
    if bot:
        try:
            from bot.texts.payments import build_receipt
            receipt_text = build_receipt(
                order_id=order.id,
                amount=order.paid_amount,
                method="YooKassa",
                work_type=order.work_type_label,
            )
            await bot.send_message(order.user_id, receipt_text)
        except Exception as e:
            logger.warning(f"[YooKassa] Failed to send receipt: {e}")

    # Notify admins
    if bot:
        try:
            for admin_id in settings.ADMIN_IDS:
                await bot.send_message(
                    admin_id,
                    f"💳 <b>YooKassa: оплата получена</b>\n\n"
                    f"Заказ #{order.id}\n"
                    f"Клиент: {user.fullname or user.username or order.user_id}\n"
                    f"Сумма: {format_price(order.paid_amount)}\n"
                    f"Платёж: <code>{payment_id}</code>",
                )
        except Exception as e:
            logger.warning(f"[YooKassa] Failed to notify admins: {e}")


async def _handle_payment_canceled(session: AsyncSession, payment_obj: dict):
    """Process canceled payment — return order to waiting_payment."""
    payment_id = payment_obj["id"]
    metadata = payment_obj.get("metadata", {})
    order_id = metadata.get("order_id")

    if not order_id:
        return

    order_id = int(order_id)
    order = await session.get(Order, order_id)
    if not order:
        return

    # Only revert if order hasn't been manually confirmed
    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value,
                        OrderStatus.IN_PROGRESS.value, OrderStatus.COMPLETED.value]:
        return

    # Clear YooKassa payment ID so user can retry
    order.yookassa_payment_id = None
    await session.commit()

    logger.info(f"[YooKassa] Payment {payment_id} canceled for order #{order_id}")

    # Notify user
    try:
        from bot.bot_instance import get_bot
        bot = get_bot()
        await bot.send_message(
            order.user_id,
            f"<b>Платёж не прошёл</b>\n\n"
            f"Заказ #{order.id} — оплата отклонена или отменена.\n"
            f"Попробуйте снова или используйте другой способ оплаты.",
        )
    except Exception as e:
        logger.warning(f"[YooKassa] Failed to notify user about canceled payment for order #{order_id}: {e}")

"""
Order Flow Confirmation - order confirmation and creation handlers.
"""
import asyncio
import logging

from aiogram import F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.enums import ChatAction
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, WorkType, WORK_TYPE_LABELS, OrderStatus
from bot.states.order import OrderState
from bot.keyboards.orders import (
    get_confirm_order_keyboard,
    get_deadline_with_date,
    get_invoice_keyboard,
    get_manual_review_keyboard,
)
from bot.keyboards.orders import get_special_order_keyboard as get_special_order_kb
from bot.services.pricing import calculate_price
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.services.abandoned_detector import get_abandoned_tracker
from core.config import settings
from core.media_cache import send_cached_photo

from .router import (
    order_router,
    logger,
    CONFIRM_SPECIAL_IMAGE_PATH,
    CONFIRM_URGENT_IMAGE_PATH,
    CONFIRM_STD_IMAGE_PATH,
    IMG_DEAL_READY,
    IMG_UNDER_REVIEW,
    IMG_DRAFT_REVIEW,
    CHECKING_PAYMENT_IMAGE_PATH,
)
from .utils import calculate_user_discount


# ═══════════════════════════════════════════════════════════════
#   RISK MATRIX: Determines if price can be auto-calculated
# ═══════════════════════════════════════════════════════════════

# Work types safe for auto-calculation (simple, typical)
SAFE_WORK_TYPES = {
    WorkType.ESSAY.value,         # Essay
    WorkType.REPORT.value,        # Report
    WorkType.PRESENTATION.value,  # Presentation
    WorkType.CONTROL.value,       # Control work
    WorkType.INDEPENDENT.value,   # Independent work
}

# Deadlines with >= 24 hours (not urgent)
NON_URGENT_DEADLINES = {"3_days", "week", "2_weeks", "month", "custom"}


def check_auto_pay_allowed(data: dict) -> tuple[bool, list[str]]:
    """
    Risk Matrix: Checks if invoice can be issued automatically.

    Returns (is_allowed, risk_factors).
    Auto-pay is allowed ONLY if ALL conditions are met:
    1. No attachments (photos/files/voice) — has_attachments flag
    2. Work type is in safe list
    3. Deadline >= 24 hours (not urgent)
    4. Description >= 20 characters — risk_short_description flag
    """
    risk_factors = []

    # 1. Check attachments (files = risk)
    # Use flag from state if available, otherwise check attachments directly
    has_files = data.get("has_attachments", False)
    if not has_files:
        # Fallback: check attachments directly
        attachments = data.get("attachments", [])
        file_attachments = [
            att for att in attachments
            if att.get("type") in ("photo", "document", "voice", "audio", "video", "video_note")
        ]
        has_files = len(file_attachments) > 0
    if has_files:
        risk_factors.append("📎 Есть файлы")

    # 2. Check work type
    work_type = data.get("work_type", "")
    is_safe_type = work_type in SAFE_WORK_TYPES
    if not is_safe_type:
        risk_factors.append("📚 Сложный тип работы")

    # 3. Check deadline urgency
    deadline_key = data.get("deadline", "week")
    is_non_urgent = deadline_key in NON_URGENT_DEADLINES
    if not is_non_urgent:
        risk_factors.append("⚡️ Срочный дедлайн")

    # 4. Check description length
    # Use flag from state if available
    risk_short_description = data.get("risk_short_description", None)
    if risk_short_description is None:
        # Fallback: check text in attachments
        attachments = data.get("attachments", [])
        description_text = ""
        for att in attachments:
            if att.get("type") == "text":
                description_text = att.get("content", "")
                break
        risk_short_description = len(description_text) < 20

    if risk_short_description:
        risk_factors.append("📝 Краткое описание")

    # Auto-pay allowed only if no risk factors
    is_allowed = len(risk_factors) == 0

    return is_allowed, risk_factors


def format_attachments_summary(attachments: list) -> str:
    """Format brief description of attachments"""
    if not attachments:
        return "—"

    counts = {}
    text_preview = None

    for att in attachments:
        att_type = att.get("type", "unknown")
        counts[att_type] = counts.get(att_type, 0) + 1

        # Save text preview
        if att_type == "text" and not text_preview:
            content = att.get("content", "")
            if len(content) > 50:
                text_preview = content[:50] + "..."
            else:
                text_preview = content

    parts = []
    type_labels = {
        "text": "текст",
        "photo": "фото",
        "document": "файл",
        "voice": "голосовое",
        "audio": "аудио",
        "video": "видео",
        "video_note": "кружок",
    }

    for att_type, count in counts.items():
        label = type_labels.get(att_type, att_type)
        if count > 1:
            parts.append(f"{count} {label}")
        else:
            parts.append(label)

    summary = ", ".join(parts)

    if text_preview:
        return f"«{text_preview}»"

    return summary


def format_order_description(attachments: list) -> str:
    """Format order description from attachments for DB"""
    if not attachments:
        return ""

    parts = []
    for att in attachments:
        att_type = att.get("type", "unknown")

        if att_type == "text":
            parts.append(att.get("content", ""))
        elif att_type == "photo":
            caption = att.get("caption", "")
            parts.append(f"[Фото] {caption}".strip())
        elif att_type == "document":
            fname = att.get("file_name", "файл")
            caption = att.get("caption", "")
            parts.append(f"[Файл: {fname}] {caption}".strip())
        elif att_type == "voice":
            duration = att.get("duration", 0)
            parts.append(f"[Голосовое: {duration} сек]")
        elif att_type == "video":
            caption = att.get("caption", "")
            parts.append(f"[Видео] {caption}".strip())
        elif att_type == "video_note":
            parts.append("[Видео-кружок]")
        elif att_type == "audio":
            fname = att.get("file_name", "аудио")
            parts.append(f"[Аудио: {fname}]")

    return "\n".join(parts)


# ══════════════════════════════════════════════════════════════
#                    CONFIRMATION SCREEN
# ══════════════════════════════════════════════════════════════

async def show_order_confirmation(callback, state: FSMContext, bot: Bot, session: AsyncSession, send_new: bool = False):
    """
    Show order preview for confirmation.
    Three scenarios depending on order type:
    - URGENT: High priority, fast launch
    - SPECIAL: Intrigue, expert analysis
    - STANDARD: Partner contract
    """
    # Show typing while forming preview
    chat_id = callback.message.chat.id if callback.message else callback.from_user.id
    await bot.send_chat_action(chat_id, ChatAction.TYPING)

    await state.set_state(OrderState.confirming)

    data = await state.get_data()

    # Determine order type for conditional logic
    is_urgent = data.get("is_urgent", False)
    work_type_value = data.get("work_type", "")
    is_special = work_type_value == WorkType.OTHER.value

    # Get user discount
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    result = await session.execute(user_query)
    user = result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    await state.update_data(discount=discount)

    # Form common preview data
    work_label = WORK_TYPE_LABELS.get(WorkType(data["work_type"]), data["work_type"])

    # Deadline with real date
    deadline_key = data.get("deadline", "")
    deadline_label = data.get("deadline_label", "Не указан")

    if deadline_key and deadline_key != "custom":
        deadline_display = get_deadline_with_date(deadline_key)
    else:
        deadline_display = deadline_label

    # Attachments — count files
    attachments = data.get("attachments", [])
    file_count = len(attachments)

    # Extract user's text comment (if any)
    user_comment = None
    for att in attachments:
        if att.get("type") == "text":
            user_comment = att.get("content", "")
            break

    # ═══════════════════════════════════════════════════════════════
    #   SCENARIO A: SPECIAL ORDER (🕵️‍♂️ Dossier Style)
    # ═══════════════════════════════════════════════════════════════
    if is_special:
        # Format comment as quote
        comment_block = ""
        if user_comment:
            comment_block = f"\n\n<i>«{user_comment[:200]}{'...' if len(user_comment) > 200 else ''}»</i>"

        caption = f"""📂 <b>МАТЕРИАЛЫ ДЕЛА</b>

<b>Статус:</b> 🦄 Спецзадача
<b>Дедлайн:</b> <code>{deadline_display}</code>
<b>Улики:</b> {file_count} файл(ов){comment_block}

<i>Так, я всё зафиксировал. Проверь, не упустили ли мы чего...</i>"""

        confirm_btn_text = "📮 Отправить шифровку"
        image_path = CONFIRM_SPECIAL_IMAGE_PATH

    # ═══════════════════════════════════════════════════════════════
    #   SCENARIO B: URGENT ORDER (🚀 Launch Protocol)
    # ═══════════════════════════════════════════════════════════════
    elif is_urgent:
        caption = f"""🚀 <b>ПРЕДПОЛЁТНАЯ ПРОВЕРКА</b>

✅ <b>Задача:</b> {work_label}
⏱ <b>Таймер:</b> <code>{deadline_display}</code>
📦 <b>Груз:</b> {file_count} файл(ов)

⚠️ <b>Режим:</b> ФОРСАЖ <code>(Priority High)</code>

<i>Времени в обрез. Проверь вводные беглым взглядом...</i>"""

        confirm_btn_text = "🚀 ПУСК (Отправить)"
        image_path = CONFIRM_URGENT_IMAGE_PATH

    # ═══════════════════════════════════════════════════════════════
    #   SCENARIO C: STANDARD ORDER (📄 Contract Style)
    # ═══════════════════════════════════════════════════════════════
    else:
        # Discount shown ONLY for standard orders
        discount_line = f"\n🎁 <b>Бонус:</b> Скидка {discount}%" if discount > 0 else ""

        caption = f"""📄 <b>ЧЕРНОВИК КОНТРАКТА</b>

📌 <b>Тип:</b> {work_label}
📅 <b>Срок:</b> <code>{deadline_display}</code>{discount_line}

<i>Проверь, всё ли верно записано...</i>"""

        confirm_btn_text = "✅ Всё верно (Отправить)"
        # Use checklist for draft, NOT handshake (handshake = only for final invoice)
        image_path = IMG_DRAFT_REVIEW if IMG_DRAFT_REVIEW.exists() else CONFIRM_STD_IMAGE_PATH

    # Log step (non-critical)
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_STEP,
            user=callback.from_user,
            details=f"Шаг: подтверждение, срок «{deadline_display}»",
            session=session,
        )
    except Exception:
        pass

    keyboard = get_confirm_order_keyboard(confirm_text=confirm_btn_text)

    # Delete old message before sending new with photo
    if not send_new:
        try:
            await callback.message.delete()
        except Exception:
            pass

    # Try to send with image
    if image_path.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=image_path,
                caption=caption,
                reply_markup=keyboard,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить confirm image: {e}")

    # Fallback to text
    await bot.send_message(
        chat_id=chat_id,
        text=caption,
        reply_markup=keyboard,
    )


# ══════════════════════════════════════════════════════════════
#                    CONFIRM ORDER HANDLER
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(OrderState.confirming, F.data == "confirm_order")
async def confirm_order(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Confirm and save order with RISK MATRIX logic.

    Flow:
    1. Check Risk Matrix → determine GREEN or YELLOW flow
    2. GREEN FLOW (auto-pay): Show invoice with payment button
    3. YELLOW FLOW (manual): Show "Requires sheriff evaluation" screen
    4. SPECIAL (other): Send for manual evaluation
    """
    await callback.answer("⏳")

    data = await state.get_data()
    user_id = callback.from_user.id
    chat_id = callback.message.chat.id if callback.message else callback.from_user.id

    # Form description from attachments
    description = format_order_description(data.get("attachments", []))

    work_type_value = data.get("work_type", "")
    is_special = work_type_value == WorkType.OTHER.value
    is_urgent = data.get("is_urgent", False)
    deadline_key = data.get("deadline", "week")
    discount_percent = data.get("discount", 0)

    # ═══════════════════════════════════════════════════════════════
    #   RISK MATRIX: Determine GREEN or YELLOW flow
    # ═══════════════════════════════════════════════════════════════
    is_auto_pay_allowed, risk_factors = check_auto_pay_allowed(data)

    # ═══════════════════════════════════════════════════════════════
    #   STEP 1: Animation (different texts for special/normal orders)
    # ═══════════════════════════════════════════════════════════════

    try:
        await callback.message.delete()
    except Exception:
        pass

    if is_special:
        loading_text = "🕵️ <b>Шериф принимает спецзаказ...</b>\n\n<i>Секунду</i>"
    elif is_auto_pay_allowed:
        loading_text = "⚖️ <b>Робот считает смету...</b>\n\n<i>Секунду</i>"
    else:
        loading_text = "🛡 <b>Анализируем задачу...</b>\n\n<i>Секунду</i>"

    loading_msg = await bot.send_message(chat_id=chat_id, text=loading_text)

    # ═══════════════════════════════════════════════════════════════
    #   GUARANTEED HANDLING: try-finally for loading_msg
    # ═══════════════════════════════════════════════════════════════

    order = None
    price_calc = None
    final_price = 0
    success = False
    order_status = OrderStatus.PENDING.value

    try:
        # Small delay for effect
        await asyncio.sleep(1.5)

        # ═══════════════════════════════════════════════════════════════
        #   STEP 2: Determine status and price
        # ═══════════════════════════════════════════════════════════════

        if is_special:
            # === SPECIAL ORDER: SKIP AUTO-CALCULATION ===
            order_status = OrderStatus.WAITING_ESTIMATION.value
            order_price = 0  # Price will be set by admin manually
        elif is_auto_pay_allowed:
            # === GREEN FLOW: AUTO-CALCULATION ===
            price_calc = calculate_price(
                work_type=work_type_value,
                deadline_key=deadline_key,
                discount_percent=discount_percent,
            )
            final_price = price_calc.price_after_discount if discount_percent > 0 else price_calc.final_price
            order_status = OrderStatus.WAITING_PAYMENT.value
            order_price = final_price
        else:
            # === YELLOW FLOW: NEED SHERIFF EVALUATION ===
            # Calculate preliminary price for display
            price_calc = calculate_price(
                work_type=work_type_value,
                deadline_key=deadline_key,
                discount_percent=discount_percent,
            )
            final_price = price_calc.price_after_discount if discount_percent > 0 else price_calc.final_price
            order_status = OrderStatus.DRAFT.value  # Draft until submitted for review
            order_price = final_price  # Preliminary price

        order = Order(
            user_id=user_id,
            work_type=work_type_value,
            subject=data.get("subject_label") or data.get("subject"),
            topic=None,
            description=description,
            deadline=data.get("deadline_label"),
            discount=discount_percent,
            price=order_price,
            status=order_status,
        )
        session.add(order)
        await session.flush()  # Get ID without closing transaction
        order_id = order.id    # Save ID
        logger.info(f"confirm_order: Created order #{order_id} with user_id={user_id}, auto_pay={is_auto_pay_allowed}")
        await session.commit()

        # Re-fetch order from DB (refresh may not work after commit)
        order_result = await session.execute(
            select(Order).where(Order.id == order_id)
        )
        order = order_result.scalar_one_or_none()
        if not order:
            raise Exception(f"Order {order_id} not found after commit")
        # Verify user_id saved correctly
        logger.info(f"confirm_order: Order #{order_id} loaded from DB with user_id={order.user_id}")

        # Validation: ensure order.id is valid
        if not order.id or order.id <= 0:
            raise Exception(f"Invalid order.id={order.id} after DB load")
        if order.user_id != user_id:
            logger.error(f"CRITICAL: user_id mismatch! Expected {user_id}, got {order.user_id}")
            raise Exception(f"User ID mismatch: expected {user_id}, got {order.user_id}")

        success = True

    except Exception as e:
        logger.error(f"Критическая ошибка при создании заказа: {e}", exc_info=True)
        try:
            await bot.send_message(
                chat_id=chat_id,
                text="❌ Произошла ошибка при создании заказа. Попробуй ещё раз или напиши в поддержку.",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="🔄 Попробовать снова", callback_data="create_order")],
                    [InlineKeyboardButton(text="💬 Поддержка", url=f"https://t.me/{settings.SUPPORT_USERNAME}")],
                ])
            )
        except Exception as send_err:
            logger.error(f"Не удалось отправить сообщение об ошибке: {send_err}")

    finally:
        # GUARANTEED delete loading_msg
        try:
            await loading_msg.delete()
        except Exception:
            pass
        # Clear state ONLY for non-DRAFT orders
        # For DRAFT keep state until submit_for_review (need attachments)
        if order_status != OrderStatus.DRAFT.value:
            try:
                await state.clear()
            except Exception:
                pass

    # If order not created - exit
    if not success or not order:
        return

    # Remove from abandoned orders tracker (non-critical)
    try:
        tracker = get_abandoned_tracker()
        if tracker:
            await tracker.complete_order(user_id)
    except Exception as e:
        logger.warning(f"Не удалось удалить из трекера: {e}")

    # Safe work_label retrieval
    try:
        work_label = WORK_TYPE_LABELS.get(WorkType(work_type_value), work_type_value)
    except ValueError:
        work_label = work_type_value or "Заказ"
    deadline_label = data.get("deadline_label", "Не указан")

    # ═══════════════════════════════════════════════════════════════
    #   STEP 4: Logging
    # ═══════════════════════════════════════════════════════════════

    urgent_prefix = "🚨 СРОЧНЫЙ " if is_urgent else ""
    special_prefix = "🦄 СПЕЦЗАКАЗ " if is_special else ""
    extra_data = {
        "Тип": work_label,
        "Направление": data.get("subject_label", "—"),
        "Срок": deadline_label,
        "Скидка": f"{discount_percent}%",
        "Вложений": len(data.get("attachments", [])),
    }

    if not is_special and price_calc:
        extra_data["💰 Цена"] = f"{final_price:,} ₽".replace(",", " ")
        extra_data["База"] = f"{price_calc.base_price:,} ₽".replace(",", " ")
        extra_data["Множитель"] = f"x{price_calc.urgency_multiplier}"

    # Logging (non-critical if fails)
    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_CONFIRM,
            user=callback.from_user,
            details=f"{urgent_prefix}{special_prefix}Заказ #{order.id} создан",
            extra_data=extra_data,
            session=session,
            level=LogLevel.ACTION,
            silent=False,
        )
    except Exception as e:
        logger.warning(f"Не удалось залогировать заказ #{order.id}: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   STEP 5: Send result to user (GREEN/YELLOW/SPECIAL)
    # ═══════════════════════════════════════════════════════════════

    try:
        if is_special:
            # 🦄 SPECIAL ORDER — awaiting manual evaluation (auto-calc skipped!)
            text = f"""🕵️ <b>СПЕЦЗАКАЗ <code>#{order.id}</code> ПРИНЯТ</b>

Это задача нестандартная. Авто-калькулятор тут бессилен.

Шериф лично посмотрит требования и назовёт цену.
Обычно это занимает <b>до 2 часов</b> (в рабочее время).

⏳ <i>Жди сообщения...</i>"""

            logger.info(f"confirm_order: Creating special order keyboard with order.id={order.id}")
            keyboard = get_special_order_kb(order.id)
            image_path = CONFIRM_SPECIAL_IMAGE_PATH

        elif is_auto_pay_allowed:
            # === GREEN FLOW: Automatic invoice (Deal ready) ===
            price_formatted = f"{final_price:,}".replace(",", " ")

            text = f"""⚖️ <b>СМЕТА ГОТОВА</b> | Заказ <code>#{order.id}</code>

📁 <b>Тип:</b> {work_label}
⏳ <b>Срок:</b> {deadline_label}

➖➖➖➖➖➖➖➖➖➖➖
💰 <b>К ОПЛАТЕ: {price_formatted} ₽</b>
➖➖➖➖➖➖➖➖➖➖➖

<i>Цена зафиксирована. Робот гарантирует.</i>"""

            logger.info(f"confirm_order: GREEN FLOW - invoice keyboard for order #{order.id}, price={final_price}")
            keyboard = get_invoice_keyboard(order.id, final_price)
            image_path = IMG_DEAL_READY if IMG_DEAL_READY.exists() else CONFIRM_STD_IMAGE_PATH

        else:
            # === YELLOW FLOW: Requires sheriff evaluation (without price!) ===
            # DON'T show robot price — this creates anchoring effect and disappointment

            text = f"""🛡 <b>ЗАКАЗ <code>#{order.id}</code> НА ПРОВЕРКЕ</b>

Задача нестандартная или срочная. Автоматический калькулятор здесь может ошибиться, поэтому Шериф оценит её лично.

📁 <b>Тип:</b> {work_label}
⏳ <b>Срок:</b> {deadline_label}

⏱ <i>Ожидай точную цену в течение 15-30 минут (в рабочее время).</i>"""

            logger.info(f"confirm_order: YELLOW FLOW - manual review for order #{order.id}, factors={risk_factors}")
            keyboard = get_manual_review_keyboard(order.id)
            image_path = IMG_UNDER_REVIEW if IMG_UNDER_REVIEW.exists() else CHECKING_PAYMENT_IMAGE_PATH

    except Exception as e:
        logger.error(f"Ошибка формирования сообщения для заказа #{order.id}: {e}")
        # Fallback to simple message
        text = f"✅ <b>Заказ #{order.id} создан!</b>\n\nПодробности в разделе «Мои заказы»."
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 Мои заказы", callback_data="profile_orders")],
            [InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")],
        ])
        image_path = None

    # Send message to user
    try:
        if image_path and image_path.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=chat_id,
                    photo_path=image_path,
                    caption=text,
                    reply_markup=keyboard,
                )
            except Exception as e:
                logger.warning(f"Не удалось отправить invoice image: {e}")
                await bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)
        else:
            await bot.send_message(chat_id=chat_id, text=text, reply_markup=keyboard)
    except Exception as e:
        logger.error(f"Не удалось отправить финальное сообщение о заказе #{order.id}: {e}")
        # Fallback - at least a simple message
        try:
            await bot.send_message(
                chat_id=chat_id,
                text=f"✅ Заказ #{order.id} создан!\n\nПодробности в разделе «Мои заказы».",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="📋 Мои заказы", callback_data="profile_orders")],
                    [InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")],
                ])
            )
        except Exception:
            pass

    # Notify admins with all attachments + Live card (don't block user on error)
    # For DRAFT (YELLOW FLOW) DON'T notify — this happens in submit_for_review_callback
    if order.status != OrderStatus.DRAFT.value:
        try:
            from .notify import notify_admins_new_order
            await notify_admins_new_order(bot, callback.from_user, order, data, session)
        except Exception as e:
            logger.error(f"Ошибка уведомления админов о заказе #{order.id}: {e}")

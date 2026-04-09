"""
Order Flow Payment - payment and receipt handlers.
"""

from aiogram import F, Bot
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton, FSInputFile, WebAppInfo
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.orders import (
    LEGACY_WAITING_PAYMENT_STATUSES,
    Order,
    OrderStatus,
    WORK_TYPE_LABELS,
    WorkType,
    is_waiting_payment_status,
)
from bot.states.order import OrderState
from bot.keyboards.orders import get_deadline_keyboard
from core.config import settings
from core.media_cache import send_cached_photo
from bot.services.promo_service import PromoService
from bot.utils.formatting import format_price
from bot.services.order_status_service import (
    OrderStatusDispatchOptions,
    OrderStatusTransitionError,
    apply_order_status_transition,
    finalize_order_status_change,
)

from .router import order_router, logger, DEADLINE_IMAGE_PATH, CHECKING_PAYMENT_IMAGE_PATH


# ══════════════════════════════════════════════════════════════
#               PAYMENT HANDLERS
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data.startswith("pay_order:"))
async def pay_order_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """User clicked 'Pay' — show payment details"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    logger.info(f"pay_order_callback: order_id={order_id}, user_id={callback.from_user.id}")

    # Get order
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        # Log for debugging
        logger.warning(f"pay_order: Order {order_id} not found for user {callback.from_user.id}")
        # Check if order exists at all
        check_query = select(Order).where(Order.id == order_id)
        check_result = await session.execute(check_query)
        check_order = check_result.scalar_one_or_none()
        if check_order:
            logger.warning(f"pay_order: Order {order_id} exists but belongs to user {check_order.user_id}, not {callback.from_user.id}")
        else:
            logger.warning(f"pay_order: Order {order_id} does not exist in database at all")
        await callback.answer("Заказ не найден", show_alert=True)
        return

    if not (is_waiting_payment_status(order.status) or order.status == OrderStatus.WAITING_ESTIMATION.value):
        await callback.answer("Этот заказ уже нельзя оплатить", show_alert=True)
        return

    await callback.answer("💳")

    price = int(order.price or 0)
    if price <= 0:
        await callback.message.answer("❌ Цена заказа не установлена")
        return
    advance = price // 2  # 50% advance

    # Payment details from config — clean design
    text = f"""<b>Оплата заказа #{order.id}</b>

К оплате: <b>{format_price(price)}</b>
<i>(Аванс 50%: {format_price(advance)})</i>

<b>Реквизиты (нажмите, чтобы скопировать):</b>

СБП: <code>{settings.PAYMENT_PHONE}</code>
Карта: <code>{settings.PAYMENT_CARD}</code>
Получатель: {settings.PAYMENT_NAME}

<i>После перевода нажмите кнопку ниже.</i>"""

    buttons = [
        [InlineKeyboardButton(
            text="✅ Я оплатил",
            callback_data=f"confirm_payment:{order_id}"
        )],
        [InlineKeyboardButton(
            text="❓ Вопрос по оплате",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="🔙 Назад",
            callback_data=f"order_detail:{order_id}"
        )],
    ]

    # Add Promocode button if no promo code applied yet
    # (don't check discount == 0, because user may have loyalty discount)
    if not order.promo_code:
        buttons.append([InlineKeyboardButton(
            text="🎟 Ввести промокод",
            callback_data=f"enter_promo:{order_id}"
        )])

    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(text, reply_markup=keyboard)


@order_router.callback_query(F.data.startswith("confirm_payment:"))
async def confirm_payment_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """
    User clicked 'I paid' — change status to verification_pending.

    STRICTLY manual verification by admin! DON'T mark as paid automatically!
    """
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    logger.info(f"confirm_payment_callback: order_id={order_id}, user_id={callback.from_user.id}")

    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        # Diagnostics
        check_result = await session.execute(select(Order).where(Order.id == order_id))
        check_order = check_result.scalar_one_or_none()
        if check_order:
            logger.warning(
                f"confirm_payment: Order {order_id} exists with user_id={check_order.user_id}, "
                f"but request from user_id={callback.from_user.id}"
            )
        else:
            logger.warning(f"confirm_payment: Order {order_id} does not exist at all")
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Check order is in correct status for payment
    if not (is_waiting_payment_status(order.status) or order.status == OrderStatus.WAITING_ESTIMATION.value):
        await callback.answer("Этот заказ уже обрабатывается", show_alert=True)
        return

    await callback.answer("Платёж на проверке")

    # === UPDATE STATUS TO VERIFICATION_PENDING (NOT PAID!) ===
    # Legacy bot flow here always means "manual advance in bot".
    # Persist scheme explicitly so admin verification and live cards
    # do not have to guess whether it is 50% or 100%.
    if not order.payment_scheme:
        order.payment_scheme = "half"
    if not order.payment_method:
        order.payment_method = "transfer"

    try:
        if order.status == OrderStatus.WAITING_ESTIMATION.value:
            apply_order_status_transition(order, OrderStatus.WAITING_PAYMENT.value)
        change = apply_order_status_transition(order, OrderStatus.VERIFICATION_PENDING.value)
    except OrderStatusTransitionError as exc:
        await callback.answer(str(exc), show_alert=True)
        return

    username = callback.from_user.username
    user_link = f"@{username}" if username else f"ID:{callback.from_user.id}"
    await finalize_order_status_change(
        session,
        bot,
        order,
        change,
        dispatch=OrderStatusDispatchOptions(
            update_live_card=True,
            client_username=callback.from_user.username,
            client_name=callback.from_user.full_name,
            card_extra_text=f"🔔 ПРОВЕРЬ ОПЛАТУ!\n{user_link} · {format_price(order.price)}",
            notification_extra_data={
                "payment_method": order.payment_method,
                "payment_scheme": order.payment_scheme,
                "payment_phase": "initial",
            },
        ),
    )

    # === DELETE OLD MESSAGE (so can't click twice) ===
    try:
        await callback.message.delete()
    except Exception:
        pass

    # === MESSAGE TO USER WITH IMAGE ===
    user_text = """🕵️‍♂️ <b>Платеж на проверке</b>

Платёж получен. Проверяем оплату.

💤 <b>Если сейчас ночь</b> — подтвердим утром.
✅ <b>Твой заказ зафиксирован</b>. Не волнуйся.

<i>Как только деньги придут — бот пришлет чек.</i>"""

    # Open order in mini-app
    user_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📱 Открыть заказ",
            web_app=WebAppInfo(url=f"{settings.WEBAPP_URL}/order/{order.id}")
        )],
    ])

    # Send with image (local file)
    if CHECKING_PAYMENT_IMAGE_PATH.exists():
        try:
            photo_file = FSInputFile(CHECKING_PAYMENT_IMAGE_PATH)
            await bot.send_photo(
                chat_id=callback.message.chat.id,
                photo=photo_file,
                caption=user_text,
                reply_markup=user_keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить checking_payment image: {e}")
            await bot.send_message(
                chat_id=callback.message.chat.id,
                text=user_text,
                reply_markup=user_keyboard
            )
    else:
        # Fallback without image
        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=user_text,
            reply_markup=user_keyboard
        )

    # === NOTIFICATION TO TOPIC ABOUT PAYMENT VERIFICATION ===
    user_link = f"@{username}" if username else f"<a href='tg://user?id={callback.from_user.id}'>Пользователь</a>"

    admin_text = f"""<b>Проверка оплаты</b>

Заказ: <code>#{order.id}</code>
Клиент: {user_link}
Сумма: <b>{format_price(order.price)}</b>

<i>Клиент подтвердил оплату. Проверьте поступление.</i>"""

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Подтвердить ($)",
                callback_data=f"admin_verify_paid:{order_id}"
            ),
            InlineKeyboardButton(
                text="❌ Отклонить",
                callback_data=f"admin_reject_payment:{order_id}"
            ),
        ],
    ])

    # Try to send to order topic
    topic_notified = False
    try:
        from database.models.orders import Conversation
        conv_query = select(Conversation).where(Conversation.order_id == order.id)
        conv_result = await session.execute(conv_query)
        conv = conv_result.scalar_one_or_none()

        if conv and conv.topic_id:
            await bot.send_message(
                chat_id=settings.ADMIN_GROUP_ID,
                message_thread_id=conv.topic_id,
                text=admin_text,
                reply_markup=admin_keyboard,
            )
            topic_notified = True
            logger.info(f"Payment verification notification sent to topic for order #{order.id}")
    except Exception as e:
        logger.warning(f"Failed to send payment notification to topic: {e}")

    # Fallback: if topic not found — notify admins personally
    if not topic_notified:
        for admin_id in settings.ADMIN_IDS:
            try:
                await bot.send_message(admin_id, admin_text, reply_markup=admin_keyboard)
            except Exception as e:
                logger.warning(f"Не удалось уведомить админа {admin_id}: {e}")


@order_router.callback_query(F.data.startswith("recalc_order:"))
async def recalc_order_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """User wants to recalculate price — return to deadline selection"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Find order
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id,
        Order.status.in_(LEGACY_WAITING_PAYMENT_STATUSES)
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден или уже оплачен", show_alert=True)
        return

    # Save order data to state
    work_type_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type)

    await state.update_data(
        work_type=order.work_type,
        work_type_label=work_type_label,
        subject=order.subject or "",
        subject_label=order.subject or "",
        topic=order.topic or "",
        description=order.description or "",
        attachments=[],  # Files not transferred
    )

    # Delete order (not paid yet)
    await session.delete(order)
    await session.commit()

    await callback.answer("🔄 Выбери новый срок!")

    # Transition to deadline selection
    await state.set_state(OrderState.choosing_deadline)

    caption = """⏳ <b>Часики тикают...</b>

Скажи честно, сколько у нас времени до расстрела?

Если нужно «вчера» — готовься доплатить за скорость.
Если время терпит — сэкономишь патроны."""

    # Delete old message and send new
    try:
        await callback.message.delete()
    except Exception:
        pass

    if DEADLINE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=callback.bot,
                chat_id=callback.message.chat.id,
                photo_path=DEADLINE_IMAGE_PATH,
                caption=caption,
                reply_markup=get_deadline_keyboard(),
            )
            return
        except Exception:
            pass

    # Fallback to text
    await callback.bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_deadline_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#               P2P PAYMENT: RECEIPT HANDLER
# ══════════════════════════════════════════════════════════════

async def _process_receipt(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Shared logic for processing payment receipts (photo or document).
    Validates order, confirms to client, forwards to admins.
    """
    data = await state.get_data()
    order_id = data.get("receipt_order_id")

    if not order_id:
        await message.answer("Ошибка: заказ не найден. Попробуйте ещё раз.")
        await state.clear()
        return

    order_query = select(Order).where(Order.id == order_id)
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await message.answer("❌ Заказ не найден")
        await state.clear()
        return

    if order.status in [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value]:
        await message.answer("✅ Этот заказ уже оплачен!")
        await state.clear()
        return

    await state.clear()

    # Confirm to client
    client_text = f"""✅ <b>Чек получен!</b>

Заказ #{order.id} · {format_price(order.price)}

⏳ Проверяем оплату, обычно пара минут."""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="💬 Написать в поддержку",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )]
    ])

    await message.answer(client_text, reply_markup=keyboard)

    # Build admin notification
    work_label = WORK_TYPE_LABELS.get(WorkType(order.work_type), order.work_type) if order.work_type else "Работа"
    is_photo = bool(message.photo)
    icon = "📸" if is_photo else "📄"

    admin_caption = f"""{icon} <b>Получен чек об оплате!</b>

📋 Заказ: #{order.id}
📝 {work_label}
💰 Сумма: {format_price(order.price)}

👤 Клиент: @{message.from_user.username or 'без username'}
🆔 ID: <code>{message.from_user.id}</code>"""

    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Подтвердить",
                callback_data=f"admin_confirm_payment:{order.id}"
            ),
            InlineKeyboardButton(
                text="❌ Не пришло",
                callback_data=f"reject_payment:{order.id}:{message.from_user.id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💬 Написать клиенту",
                url=f"tg://user?id={message.from_user.id}"
            )
        ],
    ])

    # Forward to all admins
    for admin_id in settings.ADMIN_IDS:
        try:
            if is_photo:
                await bot.send_photo(
                    chat_id=admin_id,
                    photo=message.photo[-1].file_id,
                    caption=admin_caption,
                    reply_markup=admin_keyboard,
                )
            else:
                await bot.send_document(
                    chat_id=admin_id,
                    document=message.document.file_id,
                    caption=admin_caption,
                    reply_markup=admin_keyboard,
                )
        except Exception as e:
            logger.warning(f"Не удалось отправить чек админу {admin_id}: {e}")


@order_router.message(OrderState.waiting_for_receipt, F.photo)
async def receive_payment_receipt(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Received receipt screenshot"""
    await _process_receipt(message, state, session, bot)


@order_router.message(OrderState.waiting_for_receipt, F.document)
async def receive_payment_receipt_document(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Received document receipt (PDF, etc.)"""
    await _process_receipt(message, state, session, bot)


@order_router.message(OrderState.waiting_for_receipt)
async def waiting_for_receipt_invalid(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """User sent something other than photo/document"""
    # Intercept /start command — reset and redirect to main menu
    if message.text and message.text.strip().lower().startswith("/start"):
        from bot.handlers.start import process_start
        await process_start(message, session, bot, state, deep_link=None)
        return

    await message.answer(
        "📸 <b>Жду скриншот чека!</b>\n\n"
        "Пожалуйста, отправь фото или файл с чеком об оплате."
    )


# ══════════════════════════════════════════════════════════════
#               PROMO CODE HANDLERS
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data.startswith("enter_promo:"))
async def enter_promo_callback(callback: CallbackQuery, state: FSMContext):
    """User wants to enter promo code"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    await state.update_data(promo_order_id=order_id)
    await state.set_state(OrderState.waiting_for_promo)

    await callback.message.answer(
        "🎟 **Введите промокод:**\n\n"
        "Отправьте код в чат, и я пересчитаю стоимость заказа."
    )
    await callback.answer()

@order_router.message(OrderState.waiting_for_promo)
async def process_promo_code(message: Message, state: FSMContext, session: AsyncSession, bot: Bot):
    """Process entered promo code"""
    code = message.text.strip().upper() if message.text else ""
    data = await state.get_data()
    order_id = data.get("promo_order_id")

    if not order_id:
        await message.answer("❌ Ошибка контекста. Попробуйте снова.")
        await state.clear()
        return

    if not code:
        await message.answer("⚠️ Введите текстовый код.")
        return

    # Fetch order first to get base_price
    order_stmt = select(Order).where(Order.id == order_id)
    result = await session.execute(order_stmt)
    order = result.scalar_one_or_none()

    if not order:
        await message.answer("❌ Заказ не найден.")
        await state.clear()
        return

    if order.user_id != message.from_user.id:
        await message.answer("❌ Это не ваш заказ.")
        await state.clear()
        return

    # Get base price (order.price is the original price before discounts)
    base_price = float(order.price) if order.price else 0.0

    # Try apply promo code
    success, result_msg, discount_percent = await PromoService.apply_promo_to_order(
        session=session,
        order_id=order_id,
        code=code,
        user_id=message.from_user.id,
        base_price=base_price,
        bot=bot
    )

    if not success:
        await message.answer(
            f"❌ **Не удалось применить промокод:**\n{result_msg}\n\n"
            "Попробуйте другой или нажмите /cancel для отмены ввода."
        )
        return

    # Success! Recalculate final price combining loyalty and promo discounts
    # Extract loyalty discount (total discount - old promo discount)
    existing_total_discount = float(order.discount) if order.discount else 0.0
    old_promo_discount = float(order.promo_discount) if order.promo_discount else 0.0
    loyalty_discount = existing_total_discount - old_promo_discount

    # Cap loyalty at 50%, allow promo to be uncapped
    capped_loyalty = min(loyalty_discount, 50.0)
    total_discount = min(capped_loyalty + discount_percent, 100.0)

    # Update order fields
    order.promo_code = code
    order.promo_discount = float(discount_percent)
    order.discount = total_discount
    # final_price is computed from price, discount, and bonus_used

    await session.commit()
    await session.refresh(order)

    # Success!
    await state.clear()

    await message.answer(f"✅ **{result_msg}**")

    # Re-show payment info
    price = int(order.price)
    discounted_price = int(order.final_price)
    advance = discounted_price // 2

    text = f'''<b>Оплата заказа #{order.id}</b>

Цена со скидкой: <b><s>{format_price(price, False)}</s> → {format_price(discounted_price)}</b>
<i>(Аванс 50%: {format_price(advance)})</i>

<b>Реквизиты (нажмите, чтобы скопировать):</b>

СБП: <code>{settings.PAYMENT_PHONE}</code>
Карта: <code>{settings.PAYMENT_CARD}</code>
Получатель: {settings.PAYMENT_NAME}

<i>После перевода нажмите кнопку ниже.</i>'''

    buttons = [
        [InlineKeyboardButton(
            text="✅ Я оплатил",
            callback_data=f"confirm_payment:{order_id}"
        )],
        [InlineKeyboardButton(
            text="❓ Вопрос по оплате",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="🔙 Назад",
            callback_data=f"order_detail:{order_id}"
        )],
    ]

    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)

    await message.answer(text, reply_markup=keyboard)

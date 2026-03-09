"""
Order Flow Edit - order editing and navigation handlers.
"""
from aiogram import F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from database.models.orders import Order, WorkType, WORK_TYPE_LABELS, OrderStatus
from bot.states.order import OrderState
from bot.keyboards.inline import get_cancel_complete_keyboard
from bot.keyboards.orders import (
    get_work_category_keyboard,
    get_subject_keyboard,
    get_small_works_keyboard,
    get_medium_works_keyboard,
    get_large_works_keyboard,
    get_deadline_keyboard,
    get_task_continue_keyboard,
    get_edit_order_keyboard,
    WORKS_REQUIRE_SUBJECT,
)
from bot.services.logger import log_action, LogEvent, LogLevel
from bot.services.abandoned_detector import get_abandoned_tracker
from core.config import settings
from core.media_cache import send_cached_photo
from bot.utils.message_helpers import safe_edit_or_send

from .router import (
    order_router,
    logger,
    ZAKAZ_IMAGE_PATH,
    SMALL_TASKS_IMAGE_PATH,
    KURS_IMAGE_PATH,
    DIPLOMA_IMAGE_PATH,
    DIRECTIONS_IMAGE_PATH,
    DEADLINE_IMAGE_PATH,
    MAX_ATTACHMENTS,
)
from .utils import calculate_user_discount, format_attachments_preview, get_progress_bar
from .task import show_task_input_screen


# ══════════════════════════════════════════════════════════════
#                    NAVIGATION - BACK HANDLERS
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data == "order_back_to_type")
async def back_to_type(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Back to work type selection.
    Returns to parent category, not root menu.
    """
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_type)
    await state.update_data(attachments=[], has_attachments=False, risk_short_description=None)

    # Check which category the work type was selected from
    data = await state.get_data()
    work_type_value = data.get("work_type", "")

    # Determine category by work type
    SMALL_WORK_TYPES = {
        WorkType.CONTROL.value,
        WorkType.ESSAY.value,
        WorkType.REPORT.value,
        WorkType.PRESENTATION.value,
        WorkType.INDEPENDENT.value,
    }

    MEDIUM_WORK_TYPES = {
        WorkType.COURSEWORK.value,
        WorkType.PRACTICE.value,
    }

    LARGE_WORK_TYPES = {
        WorkType.DIPLOMA.value,
        WorkType.MASTERS.value,
    }

    # Delete old message
    try:
        await callback.message.delete()
    except Exception:
        pass

    # For small works — show small works list
    if work_type_value in SMALL_WORK_TYPES:
        caption = """<b>Быстрые задачи</b>

Стандартный срок выполнения — 1–3 дня.
Выберите тип работы."""

        if SMALL_TASKS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=SMALL_TASKS_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_small_works_keyboard(),
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_small_works_keyboard(),
        )
        return

    # For coursework/practice — show coursework list
    if work_type_value in MEDIUM_WORK_TYPES:
        caption = """📚 <b>Курсовые и Практика</b>

Серьёзная работа для серьёзных людей.
Теория или практика — нам без разницы.

<i>Что пишем?</i> 👇"""

        if KURS_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=KURS_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_medium_works_keyboard(),
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_medium_works_keyboard(),
        )
        return

    # For diplomas — show diploma list
    if work_type_value in LARGE_WORK_TYPES:
        caption = """<b>Крупные работы</b>

Выберите тип работы."""

        if DIPLOMA_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=DIPLOMA_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_large_works_keyboard(),
                )
                return
            except Exception:
                pass

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_large_works_keyboard(),
        )
        return

    # For others (other, urgent) — root category menu
    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    discount_line = f"\n\nВаша скидка <b>−{discount}%</b> будет применена автоматически." if discount > 0 else ""

    text = f"""<b>Оформление заказа</b>

Выберите тип работы.{discount_line}"""

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=ZAKAZ_IMAGE_PATH,
        caption=text,
        reply_markup=get_work_category_keyboard()
    )


@order_router.callback_query(F.data == "order_back_to_subject")
async def back_to_subject(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    Back to direction selection.
    For small works — straight to type selection.
    """
    await callback.answer("⏳")

    data = await state.get_data()
    work_type_value = data.get("work_type", "")
    await state.update_data(attachments=[], has_attachments=False, risk_short_description=None)

    try:
        work_type = WorkType(work_type_value)
    except ValueError:
        work_type = None

    # For small works (not requiring direction) — return to type
    if work_type and work_type not in WORKS_REQUIRE_SUBJECT:
        await back_to_type(callback, state, session, bot)
        return

    # For large works — show direction selection
    await state.set_state(OrderState.choosing_subject)

    caption = """<b>Выберите направление</b>

Укажите направление — мы подберём специалиста."""

    # Delete old (might be photo)
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Send with photo if exists
    if DIRECTIONS_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=DIRECTIONS_IMAGE_PATH,
                caption=caption,
                reply_markup=get_subject_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_subject_keyboard()
    )


@order_router.callback_query(F.data == "order_back_to_task")
async def back_to_task(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Back to task input"""
    await callback.answer("⏳")
    await state.set_state(OrderState.entering_task)

    data = await state.get_data()
    attachments = data.get("attachments", [])

    # Get work_type for context
    try:
        work_type = WorkType(data.get("work_type", ""))
    except ValueError:
        work_type = None

    if attachments:
        # Already has attachments — show preview
        preview = format_attachments_preview(attachments)
        count = len(attachments)
        progress = get_progress_bar(count, MAX_ATTACHMENTS)
        text = f"""📎 <b>Материалы</b>

{preview}

{progress}

<i>Ещё файлы или нажмите «Готово».</i>"""
        await safe_edit_or_send(callback, text, reply_markup=get_task_continue_keyboard(files_count=count), bot=bot)
    else:
        await show_task_input_screen(callback.message, work_type=work_type)


# ══════════════════════════════════════════════════════════════
#                    ORDER EDITING
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(OrderState.confirming, F.data == "order_edit")
async def edit_order(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Edit order — choose what to change"""
    await callback.answer("⏳")

    # Determine if direction button is needed
    data = await state.get_data()
    work_type_value = data.get("work_type", "")
    show_subject = True

    try:
        work_type = WorkType(work_type_value)
        show_subject = work_type in WORKS_REQUIRE_SUBJECT
    except ValueError:
        pass

    text = """✏️  <b>Что изменить?</b>"""

    await safe_edit_or_send(callback, text, reply_markup=get_edit_order_keyboard(show_subject=show_subject), bot=bot)


@order_router.callback_query(F.data == "back_to_confirm")
async def back_to_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Back to confirmation"""
    await callback.answer("⏳")
    from .confirmation import show_order_confirmation
    await show_order_confirmation(callback, state, bot, session)


@order_router.callback_query(F.data == "edit_type")
async def edit_type(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Edit work type"""
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_type)
    await back_to_type(callback, state, session, bot)


@order_router.callback_query(F.data == "edit_subject")
async def edit_subject(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Edit direction"""
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_subject)
    await back_to_subject(callback, state, session, bot)


@order_router.callback_query(F.data == "edit_task")
async def edit_task(callback: CallbackQuery, state: FSMContext):
    """Edit task — clear attachments"""
    await callback.answer("⏳")

    data = await state.get_data()

    # Get work_type for context
    try:
        work_type = WorkType(data.get("work_type", ""))
    except ValueError:
        work_type = None

    await state.update_data(attachments=[])
    await state.set_state(OrderState.entering_task)
    await show_task_input_screen(callback.message, work_type=work_type)


@order_router.callback_query(F.data == "edit_deadline")
async def edit_deadline(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Edit deadline"""
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_deadline)

    caption = """⏳ <b>Часики тикают...</b>

Скажи честно, сколько у нас времени до расстрела?

Если нужно «вчера» — готовься доплатить за скорость.
Если время терпит — сэкономишь патроны."""

    # Delete old and send with photo
    try:
        await callback.message.delete()
    except Exception:
        pass

    if DEADLINE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=DEADLINE_IMAGE_PATH,
                caption=caption,
                reply_markup=get_deadline_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_deadline_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    ORDER DATA EDITING (EXISTING ORDERS)
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data.startswith("edit_order_data:"))
async def edit_order_data_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    """User wants to change order data — delete and start over"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Find order with valid status for editing
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id,
        Order.status.in_([
            OrderStatus.DRAFT.value,           # YELLOW FLOW (before submitting for review)
            OrderStatus.WAITING_PAYMENT.value,
            OrderStatus.CONFIRMED.value,  # legacy
        ])
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден или уже оплачен", show_alert=True)
        return

    # Delete order (not paid yet)
    await session.delete(order)
    await session.commit()

    await callback.answer("✏️ Давай заполним заново!")

    # Reset state and start over
    await state.clear()

    # Redirect to create new order
    from .entry import start_order
    await start_order(callback, state, callback.bot, session)


@order_router.callback_query(F.data.startswith("cancel_confirmed_order:"))
async def cancel_confirmed_order_callback(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Cancel confirmed order (before payment)"""
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден", show_alert=True)
        return

    # Can only cancel unpaid orders
    cancelable = [
        OrderStatus.DRAFT.value,              # YELLOW FLOW (before submitting for review)
        OrderStatus.PENDING.value,
        OrderStatus.WAITING_PAYMENT.value,
        OrderStatus.CONFIRMED.value,  # legacy
        OrderStatus.WAITING_ESTIMATION.value
    ]
    if order.status not in cancelable:
        await callback.answer("Этот заказ уже нельзя отменить", show_alert=True)
        return

    # Cancel
    order.status = OrderStatus.CANCELLED.value
    await session.commit()

    await callback.answer("❌ Заказ отменён")

    text = f"""❌ <b>Заказ #{order.id} отменён</b>

Если понадобится помощь — мы на связи."""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📝 Новый заказ",
            callback_data="create_order"
        )],
        [InlineKeyboardButton(
            text="В меню",
            callback_data="back_to_menu"
        )],
    ])

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        await callback.message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                    CANCEL ORDER CREATION
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data == "cancel_order")
async def cancel_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Cancel order creation"""
    await callback.answer("Заявка отменена")

    # Remove from abandoned orders tracker
    tracker = get_abandoned_tracker()
    if tracker:
        await tracker.cancel_order(callback.from_user.id)

    # Log cancellation
    await log_action(
        bot=bot,
        event=LogEvent.ORDER_CANCEL,
        user=callback.from_user,
        details="Отменил создание заказа",
        session=session,
        level=LogLevel.ACTION,
    )

    await state.clear()

    # Delete old message and send with image (with file_id caching)
    try:
        await callback.message.delete()
    except Exception:
        pass

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=settings.CANCEL_IMAGE,
        caption="🌵  <b>Отбой тревоги</b>\n\n"
                "Понял-принял.\n"
                "Не сегодня — значит не сегодня.\n\n"
                "Заходи, когда созреешь — я тут всегда.",
        reply_markup=get_cancel_complete_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    SUBMIT FOR REVIEW (YELLOW FLOW)
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data.startswith("submit_for_review:"))
async def submit_for_review_callback(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """
    YELLOW FLOW: User submits order for sheriff review.
    Changes status from DRAFT to WAITING_ESTIMATION and notifies admins.

    Includes Yandex Disk upload and file sending to admins.
    """
    try:
        order_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Ошибка данных", show_alert=True)
        return

    # Find order in DRAFT status
    order_query = select(Order).where(
        Order.id == order_id,
        Order.user_id == callback.from_user.id,
        Order.status == OrderStatus.DRAFT.value
    )
    order_result = await session.execute(order_query)
    order = order_result.scalar_one_or_none()

    if not order:
        await callback.answer("Заказ не найден или уже отправлен", show_alert=True)
        return

    # Get data from state (saved when creating DRAFT)
    data = await state.get_data()
    attachments = data.get("attachments", [])

    # Change status to WAITING_ESTIMATION
    order.status = OrderStatus.WAITING_ESTIMATION.value
    await session.commit()

    await callback.answer("Заказ отправлен на оценку")

    # Delete old message
    try:
        await callback.message.delete()
    except Exception:
        pass

    # Show confirmation to user
    from bot.keyboards.orders import get_special_order_keyboard as get_special_order_kb
    text = f"""🛡 <b>ЗАКАЗ <code>#{order.id}</code> НА ПРОВЕРКЕ</b>

Менеджер оценит задачу и назовёт стоимость.
Обычно это занимает <b>до 2 часов</b> (в рабочее время).

⏳ <i>Жди сообщения с ценой...</i>"""

    keyboard = get_special_order_kb(order.id)

    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=text,
        reply_markup=keyboard,
    )

    # Notify admins about new order for review
    try:
        from .notify import notify_admins_new_order
        await notify_admins_new_order(bot, callback.from_user, order, data, session)
    except Exception as e:
        logger.error(f"Error notifying admins about order #{order.id}: {e}")

    # ═══════════════════════════════════════════════════════════════
    #   CLEAR STATE (now we can, order is submitted)
    # ═══════════════════════════════════════════════════════════════
    try:
        await state.clear()
    except Exception:
        pass

"""
Order Flow Entry Points - start order, category/type selection.
"""
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
    get_work_type_keyboard,
    get_work_category_keyboard,
    get_category_works_keyboard,
    get_small_works_keyboard,
    get_medium_works_keyboard,
    get_large_works_keyboard,
    get_subject_keyboard,
    get_special_type_keyboard,
    get_urgent_order_keyboard,
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
    SECRET_IMAGE_PATH,
    URGENT_IMAGE_PATH,
)
from .utils import (
    parse_callback_data,
    calculate_user_discount,
    check_rate_limit,
)


# ══════════════════════════════════════════════════════════════
#                    QUICK ORDER FROM PRICE LIST
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data.startswith("quick_order:"))
async def quick_order_from_price(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Quick order from price list - directly to direction/task input.
    Buttons: quick_order:diploma, quick_order:coursework, quick_order:photo_task, quick_order:other
    """
    await callback.answer("⏳ Начинаем оформление...")

    work_type_value = callback.data.split(":")[1]

    try:
        work_type = WorkType(work_type_value)
    except ValueError:
        await callback.message.answer("❌ Неизвестный тип работы")
        return

    await state.clear()
    await state.update_data(
        work_type=work_type_value,
        attachments=[],
    )

    work_label = WORK_TYPE_LABELS.get(work_type, work_type_value)

    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_START,
            user=callback.from_user,
            details=f"Быстрый заказ из прайса: {work_label}",
            session=session,
        )
    except Exception:
        pass

    try:
        await callback.message.delete()
    except Exception:
        pass

    # photo_task - directly to task input
    if work_type == WorkType.PHOTO_TASK:
        await state.update_data(subject="photo_task", subject_label="📸 Фото задания")
        await state.set_state(OrderState.entering_task)
        from .task import show_task_input_screen
        await show_task_input_screen(callback.message, is_photo_task=True, send_new=True)
        return

    # "other" goes to Panic Flow
    if work_type == WorkType.OTHER:
        from .panic import start_panic_flow
        await start_panic_flow(callback, state, bot)
        return

    # For works requiring subject - go to subject selection
    if work_type in WORKS_REQUIRE_SUBJECT:
        await state.set_state(OrderState.choosing_subject)

        text = f"""📚 <b>{work_label}</b> — отличный выбор!

Теперь выбери направление, чтобы мы подобрали нужного специалиста:"""

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=text,
            reply_markup=get_subject_keyboard(),
        )
        return

    # For others - directly to task input
    await state.update_data(subject="skip", subject_label="—")
    await state.set_state(OrderState.entering_task)
    from .task import show_task_input_screen
    await show_task_input_screen(callback.message, send_new=True)


# ══════════════════════════════════════════════════════════════
#                    START ORDER CREATION
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data == "create_order")
async def start_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Start creating order - work type selection"""
    await callback.answer("⏳")

    # Admins without restrictions
    if callback.from_user.id in settings.ADMIN_IDS:
        await _proceed_to_order_creation(callback, state, bot, session)
        return

    # Rate limiting
    if not await check_rate_limit(callback.from_user.id):
        await callback.message.answer(
            "<b>Подождите</b>\n\n"
            "Слишком много запросов. Попробуйте через минуту."
        )
        return

    # Check pending orders count
    from .router import MAX_PENDING_ORDERS
    pending_query = select(Order).where(
        Order.user_id == callback.from_user.id,
        Order.status == OrderStatus.PENDING.value,
    )
    result = await session.execute(pending_query)
    pending_orders = result.scalars().all()

    if len(pending_orders) >= MAX_PENDING_ORDERS:
        limit_text = (
            f"<b>У вас уже {len(pending_orders)} заявок в очереди</b>\n\n"
            f"Они ещё в обработке. Можете подождать или создать ещё одну."
        )
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="Создать ещё", callback_data="force_create_order")],
            [InlineKeyboardButton(text="Подожду", callback_data="back_to_menu")],
        ])

        await safe_edit_or_send(callback, limit_text, reply_markup=keyboard, bot=bot)
        return

    await _proceed_to_order_creation(callback, state, bot, session)


@order_router.callback_query(F.data == "force_create_order")
async def force_create_order(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Create order despite limit"""
    await callback.answer("⏳")
    await _proceed_to_order_creation(callback, state, bot, session)


async def _proceed_to_order_creation(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Common logic for starting order creation"""
    await bot.send_chat_action(callback.message.chat.id, ChatAction.TYPING)

    await state.clear()
    await state.set_state(OrderState.choosing_type)
    await state.update_data(attachments=[])

    try:
        tracker = get_abandoned_tracker()
        if tracker:
            await tracker.start_tracking(
                user_id=callback.from_user.id,
                username=callback.from_user.username,
                fullname=callback.from_user.full_name,
                step="Выбор типа работы",
            )
    except Exception as e:
        logger.warning(f"Ошибка трекера заказов: {e}")

    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_START,
            user=callback.from_user,
            details="Начал создание заказа",
            session=session,
            level=LogLevel.ACTION,
        )
    except Exception as e:
        logger.warning(f"Ошибка логирования ORDER_START: {e}")

    discount = 0
    try:
        user_query = select(User).where(User.telegram_id == callback.from_user.id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        discount = calculate_user_discount(user)
    except Exception as e:
        logger.warning(f"Ошибка получения скидки: {e}")

    discount_line = f"\n\nВаша скидка <b>−{discount}%</b> будет применена автоматически." if discount > 0 else ""

    text = f"""🎯 <b>Оформление заказа</b>

Выберите тип работы.{discount_line}"""

    try:
        await callback.message.delete()
    except Exception:
        pass

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=ZAKAZ_IMAGE_PATH,
        caption=text,
        reply_markup=get_work_category_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    WORK CATEGORY SELECTION
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(OrderState.choosing_type, F.data.startswith("work_category:"))
async def process_work_category(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Process work category selection.
    Shows specific types in selected category.
    """
    await callback.answer("⏳")

    from bot.keyboards.orders import WORK_CATEGORIES
    category_key = parse_callback_data(callback.data, 1)
    category = WORK_CATEGORIES.get(category_key)

    if not category:
        await callback.message.edit_caption(
            caption="🎯 <b>Оформление заказа</b>\n\nВыбери тип работы:",
            reply_markup=get_work_type_keyboard()
        )
        return

    # Urgent orders - Panic Flow
    if category_key == "urgent":
        try:
            tracker = get_abandoned_tracker()
            if tracker:
                await tracker.update_step(callback.from_user.id, "Panic Flow (срочно)")
        except Exception:
            pass

        from .panic import start_panic_flow
        await start_panic_flow(callback, state, bot)
        return

    # Small works - special layout
    if category_key == "small":
        caption = """<b>Быстрые задачи</b>

Стандартный срок выполнения — 1–3 дня.
Выберите тип работы."""

        try:
            await callback.message.delete()
        except Exception:
            pass

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
            except Exception as e:
                logger.warning(f"Не удалось отправить фото small_tasks: {e}")

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_small_works_keyboard(),
        )
        return

    # Medium works
    if category_key == "medium":
        caption = """📚 <b>Курсовые и Практика</b>

Серьёзная работа для серьёзных людей.
Теория или практика — нам без разницы.

<i>Что пишем?</i> 👇"""

        try:
            await callback.message.delete()
        except Exception:
            pass

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
            except Exception as e:
                logger.warning(f"Не удалось отправить фото kurs: {e}")

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_medium_works_keyboard(),
        )
        return

    # Large works
    if category_key == "large":
        caption = """<b>Крупные работы</b>

Выберите тип работы."""

        try:
            await callback.message.delete()
        except Exception:
            pass

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
            except Exception as e:
                logger.warning(f"Не удалось отправить фото diploma: {e}")

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_large_works_keyboard(),
        )
        return

    # Special order / non-standard
    if category_key == "other":
        caption = """<b>Нестандартная задача</b>

Не нашли подходящий тип? Не проблема.

Если задачу можно описать — мы её решим.

<i>Оформите заявку или напишите менеджеру напрямую.</i>"""

        try:
            await callback.message.delete()
        except Exception:
            pass

        if SECRET_IMAGE_PATH.exists():
            try:
                await send_cached_photo(
                    bot=bot,
                    chat_id=callback.message.chat.id,
                    photo_path=SECRET_IMAGE_PATH,
                    caption=caption,
                    reply_markup=get_special_type_keyboard(),
                )
                return
            except Exception as e:
                logger.warning(f"Не удалось отправить фото secret: {e}")

        await bot.send_message(
            chat_id=callback.message.chat.id,
            text=caption,
            reply_markup=get_special_type_keyboard(),
        )
        return

    # Show work types in category
    text = f"""🎯  <b>{category['label']}</b>

<i>{category['description']}</i>

Выбери тип работы:"""

    await callback.message.edit_caption(
        caption=text,
        reply_markup=get_category_works_keyboard(category_key)
    )


@order_router.callback_query(OrderState.choosing_type, F.data == "back_to_categories")
async def back_to_categories(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Back to category selection"""
    await callback.answer("⏳")

    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()

    discount = calculate_user_discount(user)
    discount_line = f"\n\nВаша скидка <b>−{discount}%</b> будет применена автоматически." if discount > 0 else ""

    text = f"""🎯 <b>Оформление заказа</b>

Выберите тип работы.{discount_line}"""

    try:
        await callback.message.delete()
    except Exception:
        pass

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=ZAKAZ_IMAGE_PATH,
        caption=text,
        reply_markup=get_work_category_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    WORK TYPE SELECTION (NORMAL FLOW)
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(OrderState.choosing_type, F.data.startswith("order_type:"))
async def process_work_type(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Process work type selection.
    Smart flow:
    - Large works (diploma, coursework, practice, masters) -> ask for direction
    - Small works (essay, report, control...) -> directly to task
    """
    await callback.answer("⏳")

    work_type_value = parse_callback_data(callback.data, 1)
    work_type = WorkType(work_type_value)
    await state.update_data(work_type=work_type_value)

    work_label = WORK_TYPE_LABELS.get(work_type, work_type_value)

    try:
        tracker = get_abandoned_tracker()
        if tracker:
            await tracker.update_step(callback.from_user.id, f"Тип: {work_label}")
    except Exception:
        pass

    try:
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_STEP,
            user=callback.from_user,
            details=f"Шаг 1: выбрал тип «{work_label}»",
            session=session,
        )
    except Exception:
        pass

    # Photo task - directly to task input
    if work_type == WorkType.PHOTO_TASK:
        await state.update_data(subject="photo_task", subject_label="📸 Фото задания")
        await state.set_state(OrderState.entering_task)

        try:
            await callback.message.delete()
        except Exception:
            pass

        from .task import show_task_input_screen
        await show_task_input_screen(callback.message, is_photo_task=True, send_new=True)
        return

    # SMART FLOW: skip direction for small works
    if work_type not in WORKS_REQUIRE_SUBJECT:
        await state.update_data(subject="skip", subject_label="—")
        await state.set_state(OrderState.entering_task)

        try:
            await callback.message.delete()
        except Exception:
            pass

        from .task import show_task_input_screen
        await show_task_input_screen(callback.message, send_new=True, work_type=work_type)
        return

    # Large works - ask for direction
    await state.set_state(OrderState.choosing_subject)

    caption = f"""<b>Выберите направление</b>

Укажите направление — мы подберём специалиста."""

    chat_id = callback.message.chat.id
    try:
        await callback.message.delete()
    except Exception:
        pass

    if DIRECTIONS_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=DIRECTIONS_IMAGE_PATH,
                caption=caption,
                reply_markup=get_subject_keyboard(),
            )
            return
        except Exception:
            pass

    await bot.send_message(chat_id, caption, reply_markup=get_subject_keyboard())


# ══════════════════════════════════════════════════════════════
#                    NAVIGATION - BACK HANDLERS
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(F.data == "order_back_to_type")
async def order_back_to_type(callback: CallbackQuery, state: FSMContext, session: AsyncSession, bot: Bot):
    """Back to work type selection"""
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_type)
    await state.update_data(attachments=[], has_attachments=False, risk_short_description=None)

    user_query = select(User).where(User.telegram_id == callback.from_user.id)
    user_result = await session.execute(user_query)
    user = user_result.scalar_one_or_none()
    discount = calculate_user_discount(user)
    discount_line = f"\n\nВаша скидка <b>−{discount}%</b> будет применена автоматически." if discount > 0 else ""

    text = f"""🎯 <b>Оформление заказа</b>

Выберите тип работы.{discount_line}"""

    try:
        await callback.message.delete()
    except Exception:
        pass

    await send_cached_photo(
        bot=bot,
        chat_id=callback.message.chat.id,
        photo_path=ZAKAZ_IMAGE_PATH,
        caption=text,
        reply_markup=get_work_category_keyboard(),
    )


@order_router.callback_query(F.data == "order_back_to_subject")
async def order_back_to_subject(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Back to subject/direction selection"""
    await callback.answer("⏳")
    await state.set_state(OrderState.choosing_subject)
    await state.update_data(attachments=[], has_attachments=False, risk_short_description=None)

    caption = """<b>Выберите направление</b>

Укажите направление — мы подберём специалиста."""

    try:
        await callback.message.delete()
    except Exception:
        pass

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
        callback.message.chat.id,
        caption,
        reply_markup=get_subject_keyboard(),
    )

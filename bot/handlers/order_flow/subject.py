"""
Order Flow Subject Selection - direction/subject choice handlers.
"""
from aiogram import F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.orders import WorkType, WORK_TYPE_LABELS
from bot.states.order import OrderState
from bot.keyboards.orders import SUBJECTS
from bot.services.logger import log_action, LogEvent
from bot.services.abandoned_detector import get_abandoned_tracker

from .router import order_router, logger
from .utils import parse_callback_data


# ══════════════════════════════════════════════════════════════
#                    SUBJECT/DIRECTION SELECTION
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(OrderState.choosing_subject, F.data.startswith("subject:"))
async def process_subject(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Process direction selection → transition to task input.
    Supports subject:skip to skip this step.
    """
    await callback.answer("⏳")

    subject_key = parse_callback_data(callback.data, 1)

    # Skip direction selection
    if subject_key == "skip":
        subject_label = "—"
    else:
        subject_label = SUBJECTS.get(subject_key, subject_key)

    await state.update_data(subject=subject_key, subject_label=subject_label)
    await state.set_state(OrderState.entering_task)

    data = await state.get_data()

    # Protect against lost state
    work_type_value = data.get("work_type")
    if not work_type_value:
        # State lost — return to start
        await callback.message.answer(
            "⚠️ Что-то пошло не так. Давай начнём заново.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="📝 Оформить заказ", callback_data="create_order")]
            ])
        )
        await state.clear()
        return

    work_label = WORK_TYPE_LABELS.get(WorkType(work_type_value), work_type_value)

    # Non-critical operations
    try:
        tracker = get_abandoned_tracker()
        if tracker:
            step_info = f"Ввод задания ({work_label})"
            if subject_key != "skip":
                step_info += f", {subject_label}"
            await tracker.update_step(callback.from_user.id, step_info)
    except Exception:
        pass

    try:
        log_details = f"Шаг 2: направление «{subject_label}»" if subject_key != "skip" else "Шаг 2: направление пропущено"
        await log_action(
            bot=bot,
            event=LogEvent.ORDER_STEP,
            user=callback.from_user,
            details=log_details,
            session=session,
        )
    except Exception:
        pass

    # Pass work_type for contextual text
    try:
        work_type = WorkType(work_type_value)
    except ValueError:
        work_type = None

    from .task import show_task_input_screen
    await show_task_input_screen(callback.message, work_type=work_type)

"""
Order Flow Deadline Selection - deadline/timing handlers.
"""
from aiogram import F, Bot
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession

from bot.states.order import OrderState
from bot.keyboards.orders import (
    get_deadline_keyboard,
    get_custom_deadline_keyboard,
    DEADLINES,
)
from core.media_cache import send_cached_photo
from bot.utils.message_helpers import safe_edit_or_send

from .router import order_router, DEADLINE_IMAGE_PATH
from .utils import parse_callback_data, parse_custom_deadline


# ══════════════════════════════════════════════════════════════
#                    DEADLINE SCREEN HELPER
# ══════════════════════════════════════════════════════════════

async def show_deadline_screen(callback: CallbackQuery, bot: Bot):
    """Show deadline selection screen with image."""
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

    # Fallback to text
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=get_deadline_keyboard()
    )


# ══════════════════════════════════════════════════════════════
#                    DEADLINE SELECTION HANDLERS
# ══════════════════════════════════════════════════════════════

@order_router.callback_query(OrderState.choosing_deadline, F.data.startswith("deadline:"))
async def process_deadline_choice(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """Process deadline selection from buttons"""
    await callback.answer("⏳")

    deadline_key = parse_callback_data(callback.data, 1)

    # If selected "Specify date" — ask to enter text
    if deadline_key == "custom":
        text = """📅  <b>Укажи дату</b>

Напиши когда нужно получить работу.

<i>Например: до 15 декабря, к понедельнику</i>"""
        await safe_edit_or_send(callback, text, reply_markup=get_custom_deadline_keyboard(), bot=bot)
        return

    deadline_label = DEADLINES.get(deadline_key, deadline_key)
    await state.update_data(deadline=deadline_key, deadline_label=deadline_label)

    # Transition to confirmation
    from .confirmation import show_order_confirmation
    await show_order_confirmation(callback, state, bot, session)


@order_router.callback_query(OrderState.choosing_deadline, F.data == "order_back_to_deadline_buttons")
async def back_to_deadline_buttons(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """Back to deadline selection buttons"""
    await callback.answer("⏳")
    await show_deadline_screen(callback, bot)


@order_router.message(OrderState.choosing_deadline)
async def process_deadline_text(message: Message, state: FSMContext, bot: Bot, session: AsyncSession):
    """Process deadline input as text"""
    # Intercept /start command — reset and redirect to main menu
    if message.text and message.text.strip().lower().startswith("/start"):
        from bot.handlers.start import process_start
        await process_start(message, session, bot, state, deep_link=None)
        return

    # Parse text date and determine urgency for correct price calculation
    deadline_key, deadline_label = parse_custom_deadline(message.text)
    await state.update_data(deadline=deadline_key, deadline_label=deadline_label)

    # Create fake callback for unification
    class FakeCallback:
        def __init__(self, msg, user):
            self.message = msg
            self.from_user = user

        async def answer(self, *args, **kwargs):
            pass

    fake_callback = FakeCallback(message, message.from_user)

    # Send new message instead of editing
    from .confirmation import show_order_confirmation
    await show_order_confirmation(fake_callback, state, bot, session, send_new=True)

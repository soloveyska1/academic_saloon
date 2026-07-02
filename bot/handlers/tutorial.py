"""
Тутор «Как это работает» — 4 карточки с пагинацией.

Одно сообщение редактируется по кнопкам tutorial_1..tutorial_4.
Команда /tutorial открывает первый шаг новым сообщением.
"""

import logging

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton

logger = logging.getLogger(__name__)

router = Router()

TUTORIAL_STEPS = {
    1: """<b>Как это работает</b>

1. Оставляете заявку — это 2 минуты, без звонков и анкет.
2. Мы смотрим задачу и фиксируем смету — цена не меняется по ходу.
3. Работаем этапами: вы видите прогресс, а не ждёте вслепую.
4. Остаток платите после проверки готовой работы.

<i>Дальше — про оплату.</i>""",
    2: """<b>Оплата</b>

Не обязательно платить всё сразу — можно в два этапа:
• 50% аванс — берём работу в оборот
• 50% остаток — после проверки готовой работы

Реквизиты приходят прямо в боте, когда придёт время платить.
После оплаты мы проверяем поступление и сразу подтверждаем.

<i>Дальше — про бонусы.</i>""",
    3: """<b>Бонусы</b>

• Новичкам — 300 бонусов в подарок (не откладывайте: со временем начинают сгорать)
• Кэшбэк с каждого оплаченного заказа
• 1 бонус = 1 ₽ скидки
• Приглашайте друзей — вам 5% с их заказов, другу +200 бонусов

<i>Остался последний шаг.</i>""",
    4: """<b>Готовы?</b>

Заявка ни к чему не обязывает: сначала расчёт и смета,
платить нужно только после согласования.

Если остались вопросы — просто напишите, мы на связи.""",
}

TOTAL_STEPS = len(TUTORIAL_STEPS)


def _get_tutorial_keyboard(step: int) -> InlineKeyboardMarkup:
    """Пагинация [←] [n/4] [Далее →]; на последнем шаге — кнопки действий."""
    nav_row = []
    if step > 1:
        nav_row.append(InlineKeyboardButton(text="←", callback_data=f"tutorial_{step - 1}"))
    nav_row.append(InlineKeyboardButton(text=f"{step}/{TOTAL_STEPS}", callback_data="noop"))
    if step < TOTAL_STEPS:
        nav_row.append(InlineKeyboardButton(text="Далее →", callback_data=f"tutorial_{step + 1}"))

    rows = [nav_row]
    if step == TOTAL_STEPS:
        rows.append([InlineKeyboardButton(text="📝 Оформить заказ", callback_data="create_order")])
        rows.append([InlineKeyboardButton(text="💬 Задать вопрос", callback_data="guide_support")])
    rows.append([InlineKeyboardButton(text="← Меню", callback_data="guide_menu")])

    return InlineKeyboardMarkup(inline_keyboard=rows)


@router.message(Command("tutorial"))
async def cmd_tutorial(message: Message):
    """Команда /tutorial — открыть первый шаг."""
    try:
        await message.answer(TUTORIAL_STEPS[1], reply_markup=_get_tutorial_keyboard(1))
    except Exception as e:
        logger.warning(f"[Tutorial] Failed to send tutorial: {e}")


@router.callback_query(F.data.in_({f"tutorial_{i}" for i in range(1, TOTAL_STEPS + 1)}))
async def show_tutorial_step(callback: CallbackQuery):
    """Показ шага тутора: редактируем сообщение, при неудаче шлём новое."""
    try:
        await callback.answer()
    except Exception:
        pass

    try:
        step = int(callback.data.rsplit("_", 1)[1])
    except (ValueError, IndexError):
        step = 1
    if step not in TUTORIAL_STEPS:
        step = 1

    text = TUTORIAL_STEPS[step]
    keyboard = _get_tutorial_keyboard(step)

    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except Exception:
        # Сообщение могло быть фото/анимацией или уже с таким текстом
        try:
            await callback.message.answer(text, reply_markup=keyboard)
        except Exception as e:
            logger.warning(f"[Tutorial] Failed to show step {step}: {e}")

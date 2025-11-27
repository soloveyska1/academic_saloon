from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import WorkType, WORK_TYPE_LABELS


def get_work_type_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура выбора типа работы"""
    buttons = []

    # Первый ряд: Курсовая, Дипломная
    buttons.append([
        InlineKeyboardButton(
            text=WORK_TYPE_LABELS[WorkType.COURSEWORK],
            callback_data=f"order_type:{WorkType.COURSEWORK.value}"
        ),
        InlineKeyboardButton(
            text=WORK_TYPE_LABELS[WorkType.DIPLOMA],
            callback_data=f"order_type:{WorkType.DIPLOMA.value}"
        ),
    ])

    # Второй ряд: Эссе, Реферат
    buttons.append([
        InlineKeyboardButton(
            text=WORK_TYPE_LABELS[WorkType.ESSAY],
            callback_data=f"order_type:{WorkType.ESSAY.value}"
        ),
        InlineKeyboardButton(
            text=WORK_TYPE_LABELS[WorkType.REPORT],
            callback_data=f"order_type:{WorkType.REPORT.value}"
        ),
    ])

    # Третий ряд: Контрольная, Презентация
    buttons.append([
        InlineKeyboardButton(
            text=WORK_TYPE_LABELS[WorkType.CONTROL],
            callback_data=f"order_type:{WorkType.CONTROL.value}"
        ),
        InlineKeyboardButton(
            text=WORK_TYPE_LABELS[WorkType.PRESENTATION],
            callback_data=f"order_type:{WorkType.PRESENTATION.value}"
        ),
    ])

    # Четвёртый ряд: Отчёт по практике, Другое
    buttons.append([
        InlineKeyboardButton(
            text=WORK_TYPE_LABELS[WorkType.PRACTICE],
            callback_data=f"order_type:{WorkType.PRACTICE.value}"
        ),
        InlineKeyboardButton(
            text=WORK_TYPE_LABELS[WorkType.OTHER],
            callback_data=f"order_type:{WorkType.OTHER.value}"
        ),
    ])

    # Кнопка отмены
    buttons.append([
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_skip_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура с кнопками Пропустить и Отмена"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="⏭ Пропустить", callback_data="skip")
        ],
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
        ]
    ])


def get_cancel_order_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура с кнопкой отмены"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
        ]
    ])


def get_confirm_order_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура подтверждения заказа"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Отправить заявку", callback_data="confirm_order")
        ],
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
        ]
    ])

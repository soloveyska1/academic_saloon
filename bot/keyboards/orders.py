from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import WorkType, WORK_TYPE_LABELS, WORK_TYPE_PRICES


# ══════════════════════════════════════════════════════════════
#                    ШАГ 1: ВЫБОР ТИПА РАБОТЫ
# ══════════════════════════════════════════════════════════════

def get_work_type_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура выбора типа работы с ценами.
    Флоу 'Ленивый Ковбой' — показываем цены сразу.
    """
    buttons = []

    # Крупные работы (дорогие) — по одной в ряд
    buttons.append([
        InlineKeyboardButton(
            text=f"🎩 Магистерская • {WORK_TYPE_PRICES[WorkType.MASTERS]}",
            callback_data=f"order_type:{WorkType.MASTERS.value}"
        ),
    ])
    buttons.append([
        InlineKeyboardButton(
            text=f"🎓 Диплом (ВКР) • {WORK_TYPE_PRICES[WorkType.DIPLOMA]}",
            callback_data=f"order_type:{WorkType.DIPLOMA.value}"
        ),
    ])
    buttons.append([
        InlineKeyboardButton(
            text=f"📚 Курсовая • {WORK_TYPE_PRICES[WorkType.COURSEWORK]}",
            callback_data=f"order_type:{WorkType.COURSEWORK.value}"
        ),
    ])

    # Средние работы — по две в ряд
    buttons.append([
        InlineKeyboardButton(
            text=f"📖 Самостоятельная",
            callback_data=f"order_type:{WorkType.INDEPENDENT.value}"
        ),
        InlineKeyboardButton(
            text=f"🏢 Практика",
            callback_data=f"order_type:{WorkType.PRACTICE.value}"
        ),
    ])

    # Мелкие работы — по две в ряд
    buttons.append([
        InlineKeyboardButton(
            text="📝 Эссе",
            callback_data=f"order_type:{WorkType.ESSAY.value}"
        ),
        InlineKeyboardButton(
            text="📄 Реферат",
            callback_data=f"order_type:{WorkType.REPORT.value}"
        ),
    ])
    buttons.append([
        InlineKeyboardButton(
            text="✏️ Контрольная",
            callback_data=f"order_type:{WorkType.CONTROL.value}"
        ),
        InlineKeyboardButton(
            text="📊 Презентация",
            callback_data=f"order_type:{WorkType.PRESENTATION.value}"
        ),
    ])

    # Киллер-кнопка для ленивых + Другое
    buttons.append([
        InlineKeyboardButton(
            text="📸 Просто скинуть фото задания",
            callback_data=f"order_type:{WorkType.PHOTO_TASK.value}"
        ),
    ])

    buttons.append([
        InlineKeyboardButton(
            text="📎 Другое",
            callback_data=f"order_type:{WorkType.OTHER.value}"
        ),
    ])

    # Кнопка отмены
    buttons.append([
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


# ══════════════════════════════════════════════════════════════
#                    ШАГ 2: ВЫБОР НАПРАВЛЕНИЯ
# ══════════════════════════════════════════════════════════════

# Направления/предметы для быстрого выбора
SUBJECTS = {
    "economics": "📊 Экономика / Менеджмент",
    "law": "⚖️ Право",
    "it": "💻 IT / Программирование",
    "technical": "🔧 Технические",
    "humanities": "📖 Гуманитарные",
    "natural": "🧪 Естественные науки",
    "other": "❓ Другое / Не знаю",
}


def get_subject_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура выбора направления/предмета"""
    buttons = []

    # По две кнопки в ряд
    row = []
    for key, label in SUBJECTS.items():
        row.append(
            InlineKeyboardButton(
                text=label,
                callback_data=f"subject:{key}"
            )
        )
        if len(row) == 2:
            buttons.append(row)
            row = []

    # Остаток
    if row:
        buttons.append(row)

    # Назад и отмена
    buttons.append([
        InlineKeyboardButton(text="◀️ Назад", callback_data="order_back_to_type"),
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


# ══════════════════════════════════════════════════════════════
#                    ШАГ 3: ВВОД ЗАДАНИЯ
# ══════════════════════════════════════════════════════════════

def get_task_input_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для шага ввода задания"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="order_back_to_subject"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ]
    ])


def get_task_continue_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура после получения задания — добавить ещё или продолжить"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="➕ Добавить ещё файл", callback_data="task_add_more"),
        ],
        [
            InlineKeyboardButton(text="✅ Готово, продолжить", callback_data="task_done"),
        ],
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ]
    ])


# ══════════════════════════════════════════════════════════════
#                    ШАГ 4: ВЫБОР СРОКОВ
# ══════════════════════════════════════════════════════════════

# Варианты сроков (эмоциональные)
DEADLINES = {
    "urgent": "🔥 Вчера (SOS!!!)",
    "3_5_days": "🗓 3-5 дней",
    "week": "📅 Неделя",
    "month": "🐢 Пока терпит (месяц)",
    "custom": "🔢 Ввести дату",
}


def get_deadline_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура выбора сроков — эмоциональные кнопки"""
    buttons = []

    for key, label in DEADLINES.items():
        buttons.append([
            InlineKeyboardButton(
                text=label,
                callback_data=f"deadline:{key}"
            )
        ])

    # Назад и отмена
    buttons.append([
        InlineKeyboardButton(text="◀️ Назад", callback_data="order_back_to_task"),
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_custom_deadline_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для ручного ввода даты"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="◀️ Назад к выбору", callback_data="order_back_to_deadline_buttons"),
        ],
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ]
    ])


# ══════════════════════════════════════════════════════════════
#                    ШАГ 5: ПОДТВЕРЖДЕНИЕ
# ══════════════════════════════════════════════════════════════

def get_confirm_order_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура подтверждения заказа"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Всё верно, отправить", callback_data="confirm_order")
        ],
        [
            InlineKeyboardButton(text="✏️ Изменить", callback_data="order_edit"),
        ],
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
        ]
    ])


def get_edit_order_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура редактирования заказа — что изменить"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📋 Тип работы", callback_data="edit_type"),
            InlineKeyboardButton(text="📚 Направление", callback_data="edit_subject"),
        ],
        [
            InlineKeyboardButton(text="📝 Задание", callback_data="edit_task"),
            InlineKeyboardButton(text="⏰ Сроки", callback_data="edit_deadline"),
        ],
        [
            InlineKeyboardButton(text="◀️ Назад к заявке", callback_data="back_to_confirm"),
        ]
    ])


# ══════════════════════════════════════════════════════════════
#                    УТИЛИТЫ
# ══════════════════════════════════════════════════════════════

def get_cancel_order_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура только с кнопкой отмены"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
        ]
    ])


def get_skip_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура с кнопками Пропустить и Отмена (legacy)"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="⏭ Пропустить", callback_data="skip")
        ],
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
        ]
    ])

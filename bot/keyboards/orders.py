from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import WorkType, WORK_TYPE_LABELS, WORK_TYPE_PRICES, WORK_TYPE_DEADLINES
from core.config import settings


# ══════════════════════════════════════════════════════════════
#                    ШАГ 1: ВЫБОР ТИПА РАБОТЫ
# ══════════════════════════════════════════════════════════════

def get_work_type_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура выбора типа работы с ценами и сроками.
    Оптимизирована для конверсии.
    """
    buttons = []

    # 🆘 ГОРИТ! — для паникующих, сразу сверху
    buttons.append([
        InlineKeyboardButton(
            text="🆘 Горит! Нужно срочно!",
            callback_data=f"order_type:{WorkType.PHOTO_TASK.value}"
        ),
    ])

    # 📸 Просто скинь фото — киллер-фича для ленивых
    buttons.append([
        InlineKeyboardButton(
            text="📸 Просто скинь фото — разберёмся",
            callback_data=f"order_type:{WorkType.PHOTO_TASK.value}"
        ),
    ])

    # Популярные работы (курсовая, контрольная) — вверху
    buttons.append([
        InlineKeyboardButton(
            text=f"📚 Курсовая • {WORK_TYPE_PRICES[WorkType.COURSEWORK]} • {WORK_TYPE_DEADLINES[WorkType.COURSEWORK]}",
            callback_data=f"order_type:{WorkType.COURSEWORK.value}"
        ),
    ])

    # Мелкие работы — по две в ряд (самые частые)
    buttons.append([
        InlineKeyboardButton(
            text=f"✏️ Контрольная • {WORK_TYPE_DEADLINES[WorkType.CONTROL]}",
            callback_data=f"order_type:{WorkType.CONTROL.value}"
        ),
        InlineKeyboardButton(
            text=f"📝 Эссе • {WORK_TYPE_DEADLINES[WorkType.ESSAY]}",
            callback_data=f"order_type:{WorkType.ESSAY.value}"
        ),
    ])
    buttons.append([
        InlineKeyboardButton(
            text=f"📄 Реферат • {WORK_TYPE_DEADLINES[WorkType.REPORT]}",
            callback_data=f"order_type:{WorkType.REPORT.value}"
        ),
        InlineKeyboardButton(
            text=f"📊 Презентация • {WORK_TYPE_DEADLINES[WorkType.PRESENTATION]}",
            callback_data=f"order_type:{WorkType.PRESENTATION.value}"
        ),
    ])

    # Средние работы
    buttons.append([
        InlineKeyboardButton(
            text=f"📖 Самостоятельная • {WORK_TYPE_DEADLINES[WorkType.INDEPENDENT]}",
            callback_data=f"order_type:{WorkType.INDEPENDENT.value}"
        ),
        InlineKeyboardButton(
            text=f"🏢 Практика • {WORK_TYPE_DEADLINES[WorkType.PRACTICE]}",
            callback_data=f"order_type:{WorkType.PRACTICE.value}"
        ),
    ])

    # Крупные работы (дорогие) — внизу
    buttons.append([
        InlineKeyboardButton(
            text=f"🎓 Диплом (ВКР) • {WORK_TYPE_PRICES[WorkType.DIPLOMA]}",
            callback_data=f"order_type:{WorkType.DIPLOMA.value}"
        ),
    ])
    buttons.append([
        InlineKeyboardButton(
            text=f"🎩 Магистерская • {WORK_TYPE_PRICES[WorkType.MASTERS]}",
            callback_data=f"order_type:{WorkType.MASTERS.value}"
        ),
    ])

    # Другое
    buttons.append([
        InlineKeyboardButton(
            text="📎 Другое",
            callback_data=f"order_type:{WorkType.OTHER.value}"
        ),
    ])

    # 💬 Спросить — для тех, кто не знает что выбрать
    buttons.append([
        InlineKeyboardButton(
            text="💬 Не знаю что выбрать — спросить",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
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

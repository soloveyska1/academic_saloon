from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import WorkType, WORK_TYPE_LABELS, WORK_TYPE_PRICES, WORK_TYPE_DEADLINES
from core.config import settings


# ══════════════════════════════════════════════════════════════
#                    ШАГ 1: ВЫБОР ТИПА РАБОТЫ (ДВУХУРОВНЕВОЕ МЕНЮ)
# ══════════════════════════════════════════════════════════════

# Категории работ для первого уровня меню
WORK_CATEGORIES = {
    "urgent": {
        "label": "🔥 Срочно! Горит!",
        "description": "Сдать сегодня-завтра",
        "types": [WorkType.PHOTO_TASK],
    },
    "small": {
        "label": "📝 Мелкие работы",
        "description": "Эссе, реферат, контрольная...",
        "types": [
            WorkType.CONTROL,
            WorkType.ESSAY,
            WorkType.REPORT,
            WorkType.PRESENTATION,
            WorkType.INDEPENDENT,
        ],
    },
    "medium": {
        "label": "📚 Курсовая / Практика",
        "description": "Курсовые, отчёты по практике",
        "types": [WorkType.COURSEWORK, WorkType.PRACTICE],
    },
    "large": {
        "label": "🎓 Дипломы",
        "description": "ВКР, магистерские",
        "types": [WorkType.DIPLOMA, WorkType.MASTERS],
    },
    "other": {
        "label": "📎 Другое / Не знаю",
        "description": "Нестандартные задачи",
        "types": [WorkType.OTHER],
    },
}


def get_work_category_keyboard() -> InlineKeyboardMarkup:
    """
    Первый уровень: выбор категории работ.
    Компактное меню из 5 кнопок + отмена.
    """
    buttons = []

    for key, category in WORK_CATEGORIES.items():
        buttons.append([
            InlineKeyboardButton(
                text=category["label"],
                callback_data=f"work_category:{key}"
            ),
        ])

    # Кнопка "Спросить" для тех, кто не определился
    buttons.append([
        InlineKeyboardButton(
            text="💬 Спросить — помогу выбрать",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        ),
    ])

    # Кнопка отмены
    buttons.append([
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order")
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_category_works_keyboard(category_key: str) -> InlineKeyboardMarkup:
    """
    Второй уровень: типы работ в выбранной категории.
    Показывает цены и сроки для каждого типа.
    """
    category = WORK_CATEGORIES.get(category_key)
    if not category:
        # Fallback — полный список
        return get_work_type_keyboard()

    buttons = []

    for work_type in category["types"]:
        # Формируем текст кнопки с ценой и сроком
        label = WORK_TYPE_LABELS.get(work_type, work_type.value)
        price = WORK_TYPE_PRICES.get(work_type, "")
        deadline = WORK_TYPE_DEADLINES.get(work_type, "")

        # Компактный формат: "📝 Эссе • от 1400₽ • 1-2 дня"
        parts = [label]
        if price:
            parts.append(price)
        if deadline:
            parts.append(deadline)

        text = " • ".join(parts)

        buttons.append([
            InlineKeyboardButton(
                text=text,
                callback_data=f"order_type:{work_type.value}"
            ),
        ])

    # Для категории "other" добавляем кнопку спросить
    if category_key == "other":
        buttons.append([
            InlineKeyboardButton(
                text="💬 Описать задачу менеджеру",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            ),
        ])

    # Назад и отмена
    buttons.append([
        InlineKeyboardButton(text="◀️ Назад", callback_data="back_to_categories"),
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


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

# Типы работ, для которых спрашиваем направление (крупные)
WORKS_REQUIRE_SUBJECT = {
    WorkType.COURSEWORK,
    WorkType.DIPLOMA,
    WorkType.MASTERS,
    WorkType.PRACTICE,
}

# Направления/предметы
SUBJECTS = {
    "economics": "📊 Экономика / Менеджмент / Финансы",
    "law": "⚖️ Юриспруденция",
    "it": "💻 IT / Программирование",
    "technical": "🔧 Инженерное / Техническое",
    "pedagogy": "👨‍🏫 Педагогика / Психология",
    "humanities": "📖 История / Философия / Социология",
    "natural": "🧪 Физика / Химия / Биология",
    "medicine": "🏥 Медицина / Фармация",
    "other": "❓ Другое",
}


def get_subject_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура выбора направления.
    С кнопкой "Пропустить" для тех, кто не хочет выбирать.
    """
    buttons = []

    # Кнопка "Пропустить" сверху — быстрый путь
    buttons.append([
        InlineKeyboardButton(
            text="⏭ Пропустить — укажу в задании",
            callback_data="subject:skip"
        ),
    ])

    # Направления по одному в ряд (лучше читается на мобильных)
    for key, label in SUBJECTS.items():
        buttons.append([
            InlineKeyboardButton(
                text=label,
                callback_data=f"subject:{key}"
            )
        ])

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


def get_edit_order_keyboard(show_subject: bool = True) -> InlineKeyboardMarkup:
    """
    Клавиатура редактирования заказа.
    show_subject=False скрывает кнопку направления для мелких работ.
    """
    buttons = []

    # Первый ряд — адаптивный
    if show_subject:
        buttons.append([
            InlineKeyboardButton(text="📋 Тип работы", callback_data="edit_type"),
            InlineKeyboardButton(text="📚 Направление", callback_data="edit_subject"),
        ])
    else:
        buttons.append([
            InlineKeyboardButton(text="📋 Тип работы", callback_data="edit_type"),
        ])

    # Второй ряд — задание и сроки
    buttons.append([
        InlineKeyboardButton(text="📝 Задание", callback_data="edit_task"),
        InlineKeyboardButton(text="⏰ Сроки", callback_data="edit_deadline"),
    ])

    # Назад
    buttons.append([
        InlineKeyboardButton(text="◀️ Назад к заявке", callback_data="back_to_confirm"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


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

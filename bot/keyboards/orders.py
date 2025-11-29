from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import WorkType, WORK_TYPE_LABELS, WORK_TYPE_PRICES, WORK_TYPE_DEADLINES
from core.config import settings

MSK_TZ = ZoneInfo("Europe/Moscow")


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
    Компактная 2-колоночная сетка для экономии места.
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        # Row 1: Популярные
        [
            InlineKeyboardButton(text="📝 Мелкие работы", callback_data="work_category:small"),
            InlineKeyboardButton(text="📚 Курсовая / Практика", callback_data="work_category:medium"),
        ],
        # Row 2: Крупные и срочные
        [
            InlineKeyboardButton(text="🎓 Дипломы", callback_data="work_category:large"),
            InlineKeyboardButton(text="🔥 Срочно! Горит!", callback_data="work_category:urgent"),
        ],
        # Row 3: Прочее и помощь
        [
            InlineKeyboardButton(text="📎 Другое / Не знаю", callback_data="work_category:other"),
            InlineKeyboardButton(
                text="💬 Помощь с выбором",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            ),
        ],
        # Row 4: Отмена (полная ширина)
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ],
    ])
    return kb


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


def get_small_works_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура для мелких работ — чистая 2-колоночная сетка.
    Без цен и сроков в кнопках (информация в caption).
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        # Row 1
        [
            InlineKeyboardButton(text="📝 Контрольная", callback_data=f"order_type:{WorkType.CONTROL.value}"),
            InlineKeyboardButton(text="📄 Реферат", callback_data=f"order_type:{WorkType.REPORT.value}"),
        ],
        # Row 2
        [
            InlineKeyboardButton(text="✍️ Эссе", callback_data=f"order_type:{WorkType.ESSAY.value}"),
            InlineKeyboardButton(text="📊 Презентация", callback_data=f"order_type:{WorkType.PRESENTATION.value}"),
        ],
        # Row 3
        [
            InlineKeyboardButton(text="📖 Самостоятельная", callback_data=f"order_type:{WorkType.INDEPENDENT.value}"),
        ],
        # Row 4: Навигация
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_categories"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ],
    ])
    return kb


def get_medium_works_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура для Курсовых/Практики — крупный калибр.
    Чистые кнопки с ценами.
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="📜 Курсовая работа | от 11 900 ₽",
                callback_data=f"order_type:{WorkType.COURSEWORK.value}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💼 Отчет по практике | от 4 900 ₽",
                callback_data=f"order_type:{WorkType.PRACTICE.value}"
            ),
        ],
        # Навигация
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_categories"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ],
    ])
    return kb


def get_large_works_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура для Дипломов — Premium-стиль "Большой куш".
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="🎓 Диплом (ВКР) | от 34 900 ₽",
                callback_data=f"order_type:{WorkType.DIPLOMA.value}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="🎩 Магистерская | от 44 900 ₽",
                callback_data=f"order_type:{WorkType.MASTERS.value}"
            ),
        ],
        # Навигация
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_categories"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ],
    ])
    return kb


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

# Направления/предметы — короткие и понятные названия
SUBJECTS = {
    "economics": "💰 Экономика",
    "law": "⚖️ Право",
    "it": "💻 IT и Код",
    "technical": "⚙️ Технарь",
    "psychology": "🧠 Психология",
    "humanities": "📚 Гуманитарные",
    "natural": "🧪 Естеств. науки",
    "medicine": "🏥 Медицина",
    "other": "🤠 Другое / Не нашел",
}


def get_subject_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура выбора направления — компактная 2-колоночная сетка.
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        # Row 1: Пропустить (full width)
        [
            InlineKeyboardButton(
                text="⏩ Пропустить (Сам опишу)",
                callback_data="subject:skip"
            ),
        ],
        # Row 2: Экономика | Право
        [
            InlineKeyboardButton(text="💰 Экономика", callback_data="subject:economics"),
            InlineKeyboardButton(text="⚖️ Право", callback_data="subject:law"),
        ],
        # Row 3: IT | Технарь
        [
            InlineKeyboardButton(text="💻 IT и Код", callback_data="subject:it"),
            InlineKeyboardButton(text="⚙️ Технарь", callback_data="subject:technical"),
        ],
        # Row 4: Психология | Гуманитарные
        [
            InlineKeyboardButton(text="🧠 Психология", callback_data="subject:psychology"),
            InlineKeyboardButton(text="📚 Гуманитарные", callback_data="subject:humanities"),
        ],
        # Row 5: Естеств. науки | Медицина
        [
            InlineKeyboardButton(text="🧪 Естеств. науки", callback_data="subject:natural"),
            InlineKeyboardButton(text="🏥 Медицина", callback_data="subject:medicine"),
        ],
        # Row 6: Другое (full width)
        [
            InlineKeyboardButton(text="🤠 Другое / Не нашел", callback_data="subject:other"),
        ],
        # Row 7: Навигация
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="order_back_to_type"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ],
    ])
    return kb


# ══════════════════════════════════════════════════════════════
#                    СРОЧНЫЙ ЗАКАЗ
# ══════════════════════════════════════════════════════════════

def get_urgent_order_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура для срочного заказа.
    Быстрый выбор дедлайна + возможность сразу скинуть задание.
    """
    now = datetime.now(MSK_TZ)

    buttons = []

    # Кнопка "Сегодня" только если ещё не поздно (до 20:00)
    if now.hour < 20:
        buttons.append([
            InlineKeyboardButton(
                text="⚡ Сдать сегодня (+50%)",
                callback_data="urgent_deadline:today"
            )
        ])

    # Завтра
    buttons.append([
        InlineKeyboardButton(
            text="🔥 Сдать завтра (+30%)",
            callback_data="urgent_deadline:tomorrow"
        )
    ])

    # 2-3 дня
    buttons.append([
        InlineKeyboardButton(
            text="📅 2-3 дня (+15%)",
            callback_data="urgent_deadline:3_days"
        )
    ])

    # Просто скинуть — для тех кто в панике
    buttons.append([
        InlineKeyboardButton(
            text="📸 Просто скинуть — разберёмся",
            callback_data="urgent_deadline:asap"
        )
    ])

    # Назад и отмена
    buttons.append([
        InlineKeyboardButton(text="◀️ Назад", callback_data="back_to_categories"),
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_urgent_task_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура после выбора дедлайна в срочном заказе"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="back_to_urgent"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ]
    ])


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
            InlineKeyboardButton(text="➕ Докинуть ещё", callback_data="task_add_more"),
            InlineKeyboardButton(text="🗑 Сжечь всё", callback_data="task_clear"),
        ],
        [
            InlineKeyboardButton(text="✅ Всё, считай цену!", callback_data="task_done"),
        ],
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ]
    ])


# ══════════════════════════════════════════════════════════════
#                    ШАГ 4: ВЫБОР СРОКОВ
# ══════════════════════════════════════════════════════════════

# Названия дней недели и месяцев на русском
WEEKDAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]
MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


def format_date_short(dt: datetime) -> str:
    """Форматирует дату: 'пт, 6 дек'"""
    weekday = WEEKDAYS_SHORT[dt.weekday()]
    month = MONTHS_SHORT[dt.month - 1]
    return f"{weekday}, {dt.day} {month}"


def get_deadline_options() -> list[tuple[str, str, str]]:
    """
    Генерирует варианты сроков с реальными датами.
    Returns: [(key, label, callback_data), ...]
    """
    now = datetime.now(MSK_TZ)
    today = now.date()

    options = []

    # Сегодня (если ещё не поздно — до 20:00)
    if now.hour < 20:
        options.append(("today", "🔥 ГОРИТ! (Сегодня)", "deadline:today"))

    # Завтра
    tomorrow = today + timedelta(days=1)
    tomorrow_dt = datetime.combine(tomorrow, datetime.min.time())
    options.append(("tomorrow", f"⚡️ Срочно (Завтра, {format_date_short(tomorrow_dt)})", "deadline:tomorrow"))

    # 2-3 дня
    in_3_days = today + timedelta(days=3)
    in_3_days_dt = datetime.combine(in_3_days, datetime.min.time())
    options.append(("3_days", f"🐎 В темпе (2-3 дня, до {format_date_short(in_3_days_dt)})", "deadline:3_days"))

    # Неделя
    in_week = today + timedelta(days=7)
    in_week_dt = datetime.combine(in_week, datetime.min.time())
    options.append(("week", f"📅 Стандарт (Неделя, до {format_date_short(in_week_dt)})", "deadline:week"))

    # 2 недели
    options.append(("2_weeks", "🐢 На расслабоне (2 недели)", "deadline:2_weeks"))

    # Месяц
    options.append(("month", "🐌 Вообще не к спеху (Месяц)", "deadline:month"))

    # Указать свою дату
    options.append(("custom", "✏️ Своя дата", "deadline:custom"))

    return options


def get_deadline_with_date(deadline_key: str) -> str:
    """
    Возвращает срок с реальной датой для отображения в подтверждении.
    Например: "Неделя" → "до чт, 5 дек"
    """
    now = datetime.now(MSK_TZ)
    today = now.date()

    days_map = {
        "today": 0,
        "tomorrow": 1,
        "3_days": 3,
        "week": 7,
        "2_weeks": 14,
        "month": 30,
    }

    if deadline_key not in days_map:
        # Для custom или неизвестных — возвращаем как есть
        return DEADLINES.get(deadline_key, deadline_key)

    days = days_map[deadline_key]
    target_date = today + timedelta(days=days)
    target_dt = datetime.combine(target_date, datetime.min.time())

    if deadline_key == "today":
        return "сегодня"
    elif deadline_key == "tomorrow":
        return f"завтра, {format_date_short(target_dt)}"
    else:
        return f"до {format_date_short(target_dt)}"


# Статический словарь для обратной совместимости (используется в handlers)
DEADLINES = {
    "today": "Сегодня",
    "tomorrow": "Завтра",
    "3_days": "2-3 дня",
    "week": "Неделя",
    "2_weeks": "2 недели",
    "month": "Месяц",
    "custom": "Своя дата",
}


def get_deadline_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура выбора сроков с реальными датами"""
    buttons = []

    for key, label, callback_data in get_deadline_options():
        buttons.append([
            InlineKeyboardButton(text=label, callback_data=callback_data)
        ])

    # Назад и отмена
    buttons.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="order_back_to_task"),
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
            InlineKeyboardButton(text="✅ Отправить заявку", callback_data="confirm_order")
        ],
        [
            InlineKeyboardButton(text="✏️ Изменить", callback_data="order_edit"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ],
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

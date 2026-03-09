from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import WorkType, WORK_TYPE_LABELS, WORK_TYPE_PRICES, WORK_TYPE_DEADLINES
from core.config import settings
from bot.utils.formatting import format_price

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
        "label": "Нестандартная задача",
        "description": "Нестандартные и уникальные задачи",
        "types": [WorkType.OTHER],
    },
}


def get_work_category_keyboard() -> InlineKeyboardMarkup:
    """
    Выбор типа работы — строгая иерархия по спецификации.

    Layout:
    Row 1: [ 📝 Рефераты и ДЗ ] [ 📚 Курсовая / Отчет ]
    Row 2: [ 🎓 Диплом / ВКР ]
    Row 3: [ 🔥 СРОЧНО! ГОРИТ! ] — Full width, акцентная
    Row 4: [ 💀 Спецзаказ / Другое ]
    Row 5: [ ❌ Отмена ]
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        # Row 1: Мелкие и средние
        [
            InlineKeyboardButton(text="📝 Рефераты и ДЗ", callback_data="work_category:small"),
            InlineKeyboardButton(text="📚 Курсовая / Отчет", callback_data="work_category:medium"),
        ],
        # Row 2: Дипломы
        [
            InlineKeyboardButton(text="🎓 Диплом / ВКР", callback_data="work_category:large"),
        ],
        # Row 3: PANIC — акцентная кнопка во всю ширину
        [
            InlineKeyboardButton(text="🔥 СРОЧНО! ГОРИТ!", callback_data="panic_mode"),
        ],
        # Row 4: Спецзаказ
        [
            InlineKeyboardButton(text="Нестандартная задача", callback_data="work_category:other"),
        ],
        # Row 5: Отмена
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ],
    ])
    return kb


def get_category_works_keyboard(category_key: str) -> InlineKeyboardMarkup:
    """
    Второй уровень: типы работ в выбранной категории.
    Чистые кнопки без цен — цена показывается в caption.
    """
    category = WORK_CATEGORIES.get(category_key)
    if not category:
        # Fallback — полный список
        return get_work_type_keyboard()

    buttons = []

    for work_type in category["types"]:
        # Только label без цен
        label = WORK_TYPE_LABELS.get(work_type, work_type.value)

        buttons.append([
            InlineKeyboardButton(
                text=label,
                callback_data=f"order_type:{work_type.value}"
            ),
        ])

    # Назад и отмена
    buttons.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_categories"),
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
    Клавиатура для Курсовых/Практики — крупные работы.
    Чистые кнопки без цен.
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="📚 Курсовая работа",
                callback_data=f"order_type:{WorkType.COURSEWORK.value}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="💼 Отчет по практике",
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
    Клавиатура для Дипломов — Premium-стиль.
    Чистые кнопки без цен.
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="🎓 Диплом (ВКР)",
                callback_data=f"order_type:{WorkType.DIPLOMA.value}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="🎩 Магистерская",
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


def get_special_type_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура выбора типа для нестандартных задач.
    Две опции: стандартный flow или связь с менеджером.
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="Нестандартная задача",
                callback_data=f"order_type:{WorkType.OTHER.value}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="Написать менеджеру",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
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
    Клавиатура выбора типа работы — чистые кнопки без цен.
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
            text="📚 Курсовая работа",
            callback_data=f"order_type:{WorkType.COURSEWORK.value}"
        ),
    ])

    # Мелкие работы — по две в ряд (самые частые)
    buttons.append([
        InlineKeyboardButton(
            text="✏️ Контрольная",
            callback_data=f"order_type:{WorkType.CONTROL.value}"
        ),
        InlineKeyboardButton(
            text="✍️ Эссе",
            callback_data=f"order_type:{WorkType.ESSAY.value}"
        ),
    ])
    buttons.append([
        InlineKeyboardButton(
            text="📄 Реферат",
            callback_data=f"order_type:{WorkType.REPORT.value}"
        ),
        InlineKeyboardButton(
            text="📊 Презентация",
            callback_data=f"order_type:{WorkType.PRESENTATION.value}"
        ),
    ])

    # Средние работы
    buttons.append([
        InlineKeyboardButton(
            text="📖 Самостоятельная",
            callback_data=f"order_type:{WorkType.INDEPENDENT.value}"
        ),
        InlineKeyboardButton(
            text="💼 Практика",
            callback_data=f"order_type:{WorkType.PRACTICE.value}"
        ),
    ])

    # Крупные работы — внизу
    buttons.append([
        InlineKeyboardButton(
            text="🎓 Диплом (ВКР)",
            callback_data=f"order_type:{WorkType.DIPLOMA.value}"
        ),
    ])
    buttons.append([
        InlineKeyboardButton(
            text="🎩 Магистерская",
            callback_data=f"order_type:{WorkType.MASTERS.value}"
        ),
    ])

    # Другое
    buttons.append([
        InlineKeyboardButton(
            text="Другое",
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
    "other": "Другое",
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
            InlineKeyboardButton(text="Другое", callback_data="subject:other"),
        ],
        # Row 7: Навигация
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="order_back_to_type"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ],
    ])
    return kb


# ══════════════════════════════════════════════════════════════
#                    PANIC FLOW — СРОЧНЫЙ ЗАКАЗ
# ══════════════════════════════════════════════════════════════

def get_panic_urgency_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура Panic Flow — Шаг 1: Выбор срочности (наценки).
    Убрана кнопка "Не знаю" — если не знает, считаем Турбо.
    """
    now = datetime.now(MSK_TZ)

    buttons = []

    # Кнопка "Вчера" только если ещё не поздно (до 20:00)
    if now.hour < 20:
        buttons.append([
            InlineKeyboardButton(
                text="🚀 Нужно вчера (+50%)",
                callback_data="panic_urgency:critical"
            )
        ])

    # Завтра
    buttons.append([
        InlineKeyboardButton(
            text="🔥 Сдать завтра (+30%)",
            callback_data="panic_urgency:high"
        )
    ])

    # 2-3 дня (Турбо) — дефолт
    buttons.append([
        InlineKeyboardButton(
            text="🏎 Турбо (2-3 дня, +15%)",
            callback_data="panic_urgency:medium"
        )
    ])

    # Назад и отмена
    buttons.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_categories"),
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_panic_upload_keyboard(has_files: bool = False) -> InlineKeyboardMarkup:
    """
    Клавиатура Panic Flow — Шаг 2: Загрузка файлов.
    Кнопка ПУСК появляется только после загрузки хотя бы одного файла.
    """
    buttons = []

    if has_files:
        # Кнопка отправки появляется только когда есть файлы
        buttons.append([
            InlineKeyboardButton(
                text="🚀 ПУСК (Отправить заказ)",
                callback_data="panic_submit"
            )
        ])
        buttons.append([
            InlineKeyboardButton(
                text="🗑 Очистить",
                callback_data="panic_clear"
            )
        ])

    # Навигация
    buttons.append([
        InlineKeyboardButton(text="🔙 Назад", callback_data="panic_back_to_urgency"),
        InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_panic_final_keyboard(user_id: int) -> InlineKeyboardMarkup:
    """
    Клавиатура срочного заказа — финал.
    Дослать материалы + связаться с менеджером.
    """
    from core.config import settings

    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="📎 Дослать материалы",
                callback_data="panic_append_files"
            )
        ],
        [
            InlineKeyboardButton(
                text="Написать менеджеру",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            )
        ],
        [
            InlineKeyboardButton(
                text="В меню",
                callback_data="back_to_menu"
            )
        ],
    ])


# Legacy — для обратной совместимости
def get_urgent_order_keyboard() -> InlineKeyboardMarkup:
    """Редирект на новую клавиатуру Panic Flow"""
    return get_panic_urgency_keyboard()


def get_urgent_task_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура после выбора дедлайна в срочном заказе"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="panic_back_to_urgency"),
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


def get_task_continue_keyboard(files_count: int = 0) -> InlineKeyboardMarkup:
    """
    Клавиатура после получения задания (материалов).

    Layout (если есть материалы):
    Row 1: [ ✅ Готово (Далее) ]
    Row 2: [ 🗑 Очистить список ]
    Row 3: [ 🔙 Назад ] [ ❌ Отмена ]

    Layout (если пусто):
    Row 1: [ 🔙 Назад ] [ ❌ Отмена ]
    """
    buttons = []

    if files_count > 0:
        # Row 1: Primary CTA
        buttons.append([
            InlineKeyboardButton(text="✅ Готово (Далее)", callback_data="task_done"),
        ])
        # Row 2: Clear
        buttons.append([
            InlineKeyboardButton(text="🗑 Очистить список", callback_data="task_clear"),
        ])
        # Row 3: Navigation
        buttons.append([
            InlineKeyboardButton(text="🔙 Назад", callback_data="back_from_task"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ])
    else:
        # Only navigation if empty
        buttons.append([
            InlineKeyboardButton(text="🔙 Назад", callback_data="back_from_task"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_order"),
        ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_append_files_keyboard(order_id: int, files_count: int = 0) -> InlineKeyboardMarkup:
    """
    Клавиатура для дослать файлы к заказу.
    Единый стиль с основным flow.
    """
    buttons = []

    # Готово — только если есть файлы
    if files_count > 0:
        buttons.append([
            InlineKeyboardButton(
                text="✅ Отправить",
                callback_data=f"finish_append:{order_id}"
            ),
        ])

    # Отмена
    buttons.append([
        InlineKeyboardButton(
            text="❌ Отмена",
            callback_data=f"cancel_append:{order_id}"
        ),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


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
    options.append(("3_days", f"2-3 дня (до {format_date_short(in_3_days_dt)})", "deadline:3_days"))

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

def get_confirm_order_keyboard(
    confirm_text: str = "✅ Отправить заявку",
) -> InlineKeyboardMarkup:
    """
    Клавиатура подтверждения заказа.
    confirm_text позволяет кастомизировать главную кнопку по типу заказа.
    """
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text=confirm_text, callback_data="confirm_order")
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


# ══════════════════════════════════════════════════════════════
#                    ОПЛАТА / ИНВОЙС
# ══════════════════════════════════════════════════════════════

def get_invoice_keyboard(order_id: int, price: int) -> InlineKeyboardMarkup:
    """
    GREEN FLOW: Клавиатура для авто-расчёта (auto-pay allowed).
    Показывается когда заказ простой и безопасный.
    """
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text=f"💳 Оплатить {format_price(price)}",
                callback_data=f"pay_order:{order_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="✏️ Изменить параметры",
                callback_data=f"edit_order_data:{order_id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="❌ Отменить заказ",
                callback_data=f"cancel_confirmed_order:{order_id}"
            )
        ],
    ])


def get_manual_review_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """
    Клавиатура для ручной оценки менеджером.
    Показывается когда заказ сложный (файлы, срочность, сложный тип).
    """
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="Отправить на оценку",
                callback_data=f"submit_for_review:{order_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="✏️ Изменить параметры",
                callback_data=f"edit_order_data:{order_id}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="❌ Отменить заказ",
                callback_data=f"cancel_confirmed_order:{order_id}"
            )
        ],
    ])


def get_special_order_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """
    Клавиатура для спецзаказа (ждёт ручной оценки).
    """
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="📎 Дослать материалы",
                callback_data=f"add_files_to_order:{order_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="👀 Статус заказа",
                callback_data=f"order_detail:{order_id}"
            ),
            InlineKeyboardButton(
                text="Написать менеджеру",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="В меню",
                callback_data="back_to_menu"
            )
        ],
    ])


def get_waiting_payment_keyboard(order_id: int, price: int) -> InlineKeyboardMarkup:
    """
    Клавиатура после установки цены админом (для спецзаказов).
    """
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text=f"✅ Оплатить {format_price(price)}",
                callback_data=f"pay_order:{order_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="💬 Обсудить цену",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            )
        ],
        [
            InlineKeyboardButton(
                text="❌ Отменить заказ",
                callback_data=f"cancel_confirmed_order:{order_id}"
            )
        ],
    ])


def get_order_success_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """
    Клавиатура после успешного создания заказа.
    """
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="📎 Дослать материалы",
                callback_data=f"add_files_to_order:{order_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="👀 Статус заказа",
                callback_data=f"order_detail:{order_id}"
            ),
            InlineKeyboardButton(
                text="❓ Задать вопрос",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            ),
        ],
        [
            InlineKeyboardButton(
                text="В меню",
                callback_data="back_to_menu"
            )
        ],
    ])

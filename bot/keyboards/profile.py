"""
Клавиатуры для Личного кабинета.
Стиль салуна — тёплый и дружелюбный.
Gamified Retention Hub layout.
"""

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import Order, get_status_meta
from core.config import settings


# Короткие названия типов работ
WORK_TYPE_SHORT = {
    "masters": "Магистерская",
    "diploma": "Диплом",
    "coursework": "Курсовая",
    "independent": "Самостоятельная",
    "essay": "Эссе",
    "report": "Реферат",
    "control": "Контрольная",
    "presentation": "Презентация",
    "practice": "Практика",
    "other": "Другое",
    "photo_task": "Срочное",
}


def get_gamified_profile_keyboard(
    active_orders: int = 0,
    daily_luck_available: bool = True,
    cooldown_text: str | None = None,
) -> InlineKeyboardMarkup:
    """
    Gamified User Profile Keyboard

    Layout:
    Row 1 (The Fun): Daily Luck button (show cooldown if not available)
    Row 2 (The Gang): My Gang (Referral)
    Row 3 (Finance): Operations history | Activate coupon
    Row 4 (Nav): My orders | Main menu
    """
    buttons = []

    # Row 1: Daily Luck (The Fun)
    if daily_luck_available:
        buttons.append([
            InlineKeyboardButton(text="🎰 Испытать удачу (+Бонус)", callback_data="daily_luck")
        ])
    else:
        # Show cooldown timer instead
        cooldown_display = cooldown_text or "24ч"
        buttons.append([
            InlineKeyboardButton(
                text=f"⏳ След. попытка через {cooldown_display}",
                callback_data="daily_luck_cooldown"
            )
        ])

    # Row 2: My Gang (Referral)
    buttons.append([
        InlineKeyboardButton(text="🔫 Моя Банда (Рефералка)", callback_data="profile_gang")
    ])

    # Row 3: Finance actions
    buttons.append([
        InlineKeyboardButton(text="📜 История операций", callback_data="profile_history"),
        InlineKeyboardButton(text="🎟 Активировать купон", callback_data="activate_coupon"),
    ])

    # Row 4: Navigation
    orders_text = "📦 Мои заказы"
    if active_orders > 0:
        orders_text += f" ({active_orders})"
    buttons.append([
        InlineKeyboardButton(text=orders_text, callback_data="profile_orders"),
        InlineKeyboardButton(text="🔙 Главное меню", callback_data="back_to_menu"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_profile_dashboard_keyboard(active_orders: int = 0) -> InlineKeyboardMarkup:
    """Legacy: Главная клавиатура ЛК — премиальная раскладка"""
    buttons = []

    # Row 1: Главное действие — заказы (на всю ширину)
    orders_text = "📦 Мои заказы"
    if active_orders > 0:
        orders_text += f" ({active_orders})"
    buttons.append([InlineKeyboardButton(text=orders_text, callback_data="profile_orders")])

    # Row 2: Вторичные действия (два столбца)
    buttons.append([
        InlineKeyboardButton(text="💳 Пополнить счёт", callback_data="profile_balance"),
        InlineKeyboardButton(text="🤝 Позвать друга", callback_data="profile_referral"),
    ])

    # Row 3: Навигация (на всю ширину)
    buttons.append([InlineKeyboardButton(text="🔙 В главное меню", callback_data="back_to_menu")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_order_status_emoji(order: Order) -> str:
    """Emoji по статусу заказа для кнопки"""
    status = order.status

    # Приоритет: срочный -> статус
    if order.work_type == "photo_task":
        return "🔥"

    # По статусу
    if status in ("completed", "done"):
        return "✅"
    elif status in ("waiting_payment", "waiting_for_payment"):
        return "💰"
    elif status in ("in_progress", "confirmed", "pending"):
        return "⏳"
    elif status in ("cancelled", "rejected"):
        return "❌"

    return "📋"


def format_order_button_text(order: Order, max_length: int = 18) -> str:
    """
    Форматирует текст кнопки заказа:
    - Если есть subject: "{emoji} {type} | {subject_short}"
    - Если нет subject: "{emoji} {type}"
    """
    emoji = get_order_status_emoji(order)
    work_type = WORK_TYPE_SHORT.get(order.work_type, "Заказ")

    subject = order.subject.strip() if order.subject else ""

    # Если subject пустой — только emoji + type
    if not subject:
        return f"{emoji} {work_type}"

    # Если есть subject — добавляем с разделителем
    prefix = f"{emoji} {work_type} | "
    available = max_length - len(prefix)

    if available > 3 and len(subject) > available:
        subject = subject[:available - 1] + "…"
    elif available <= 3:
        # Слишком мало места — не показываем subject
        return f"{emoji} {work_type}"

    return f"{prefix}{subject}"


def get_orders_list_keyboard(
    orders: list[Order],
    page: int,
    total_pages: int,
    filter_type: str = "all",
    counts: dict = None
) -> InlineKeyboardMarkup:
    """Список заказов — улучшенный UX"""
    buttons = []
    counts = counts or {"all": 0, "active": 0, "history": 0}

    # Row 1: Фильтры
    filters = []

    all_label = f"📋 Все ({counts['all']})" if counts['all'] > 0 else "📋 Все"
    if filter_type == "all":
        all_label = f"• {all_label}"
    filters.append(InlineKeyboardButton(text=all_label, callback_data="orders_filter:all:0"))

    active_label = f"⏳ ({counts['active']})" if counts['active'] > 0 else "⏳"
    if filter_type == "active":
        active_label = f"• {active_label}"
    filters.append(InlineKeyboardButton(text=active_label, callback_data="orders_filter:active:0"))

    done_label = f"✅ ({counts['history']})" if counts['history'] > 0 else "✅"
    if filter_type == "history":
        done_label = f"• {done_label}"
    filters.append(InlineKeyboardButton(text=done_label, callback_data="orders_filter:history:0"))

    buttons.append(filters)

    # Rows: Заказы в 2-колоночной сетке
    order_buttons = []
    for order in orders:
        btn_text = format_order_button_text(order)
        order_buttons.append(InlineKeyboardButton(text=btn_text, callback_data=f"order_detail:{order.id}"))

    # Разбиваем по 2 кнопки в ряд
    for i in range(0, len(order_buttons), 2):
        row = order_buttons[i:i + 2]
        buttons.append(row)

    # Row: Пагинация (если > 1 страницы)
    if total_pages > 1:
        pagination = []
        if page > 0:
            pagination.append(InlineKeyboardButton(text="⬅️", callback_data=f"orders_page:{filter_type}:{page - 1}"))
        else:
            pagination.append(InlineKeyboardButton(text=" ", callback_data="noop"))

        pagination.append(InlineKeyboardButton(text=f"Стр. {page + 1}/{total_pages}", callback_data="noop"))

        if page < total_pages - 1:
            pagination.append(InlineKeyboardButton(text="➡️", callback_data=f"orders_page:{filter_type}:{page + 1}"))
        else:
            pagination.append(InlineKeyboardButton(text=" ", callback_data="noop"))

        buttons.append(pagination)

    # Row: Назад
    buttons.append([InlineKeyboardButton(text="🔙 Назад", callback_data="my_profile")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_order_detail_keyboard(order: Order) -> InlineKeyboardMarkup:
    """Детали заказа — упрощённая клавиатура"""
    buttons = []

    # Row 1: Написать по заказу (контекстная ссылка)
    buttons.append([InlineKeyboardButton(
        text="💬 Написать по заказу",
        url=f"https://t.me/{settings.SUPPORT_USERNAME}?text=Дело%20%23{order.id}"
    )])

    # Row 2 (опционально): Действия по статусу
    meta = get_status_meta(order.status)

    # Повторить — для завершённых/отменённых
    if meta.get("is_final"):
        buttons.append([InlineKeyboardButton(text="🔄 Заказать снова", callback_data=f"reorder:{order.id}")])

    # Отмена — только для отменяемых
    if order.can_be_cancelled:
        buttons.append([InlineKeyboardButton(text="❌ Отменить", callback_data=f"cancel_user_order:{order.id}")])

    # Row: Назад к списку
    buttons.append([InlineKeyboardButton(text="🔙 К списку заказов", callback_data="profile_orders")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_cancel_order_confirm_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """Подтверждение отмены"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="Да, отменить", callback_data=f"confirm_cancel_order:{order_id}"),
            InlineKeyboardButton(text="Нет", callback_data=f"order_detail:{order_id}"),
        ]
    ])


def get_empty_orders_keyboard() -> InlineKeyboardMarkup:
    """Пустой список"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Сделать заказ", callback_data="create_order")],
        [InlineKeyboardButton(text="← Назад", callback_data="my_profile")]
    ])


def get_balance_keyboard() -> InlineKeyboardMarkup:
    """Баланс — акцент на заработке"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🤝 Позвать друга (Заработать)", callback_data="profile_referral")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="my_profile")],
    ])


def get_referral_keyboard(ref_link: str) -> InlineKeyboardMarkup:
    """Реферальная программа — кнопки для шаринга"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📨 Переслать приглашение",
            switch_inline_query=f"🤠 Заходи в Академический Салун!\n\n💎 Скидка 5% на первый заказ по моей ссылке:\n{ref_link}"
        )],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="my_profile")],
    ])


def get_back_to_profile_keyboard() -> InlineKeyboardMarkup:
    """Назад в кабинет"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="← Назад", callback_data="my_profile")]
    ])


# ══════════════════════════════════════════════════════════════
#              GAMIFIED PROFILE KEYBOARDS
# ══════════════════════════════════════════════════════════════

def get_gang_keyboard(ref_link: str) -> InlineKeyboardMarkup:
    """Клавиатура для экрана 'Моя Банда' (рефералка)"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📨 Завербовать бандита",
            switch_inline_query=f"🤠 Заходи в Академический Салун!\n\n💎 Скидка 5% на первый заказ по моей ссылке:\n{ref_link}"
        )],
        [InlineKeyboardButton(text="📋 Скопировать ссылку", callback_data="copy_ref_link")],
        [InlineKeyboardButton(text="🔙 Назад в кабинет", callback_data="my_profile")],
    ])


def get_daily_luck_result_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура после получения ежедневного бонуса"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔫 Завербовать друга (+бонус)", callback_data="profile_gang")],
        [InlineKeyboardButton(text="🔙 Назад в кабинет", callback_data="my_profile")],
    ])


def get_muse_luck_result_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура после получения бонуса для VIP Muse (NeuroNatali)
    Включает кнопку "🌹 Сюрприз" (dummy) и "Крутить ещё"
    """
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎰 Крутить ещё!", callback_data="daily_luck")],
        [InlineKeyboardButton(text="🌹 Сюрприз", callback_data="muse_surprise")],
        [InlineKeyboardButton(text="🔙 Назад в покои", callback_data="my_profile")],
    ])


def get_history_keyboard(page: int = 0, total_pages: int = 1) -> InlineKeyboardMarkup:
    """Клавиатура для истории операций с пагинацией"""
    buttons = []

    # Пагинация если нужна
    if total_pages > 1:
        pagination = []
        if page > 0:
            pagination.append(InlineKeyboardButton(text="⬅️", callback_data=f"history_page:{page - 1}"))
        else:
            pagination.append(InlineKeyboardButton(text=" ", callback_data="noop"))

        pagination.append(InlineKeyboardButton(text=f"{page + 1}/{total_pages}", callback_data="noop"))

        if page < total_pages - 1:
            pagination.append(InlineKeyboardButton(text="➡️", callback_data=f"history_page:{page + 1}"))
        else:
            pagination.append(InlineKeyboardButton(text=" ", callback_data="noop"))

        buttons.append(pagination)

    buttons.append([InlineKeyboardButton(text="🔙 Назад в кабинет", callback_data="my_profile")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_coupon_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для ввода купона"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data="my_profile")],
    ])


def get_coupon_result_keyboard(success: bool) -> InlineKeyboardMarkup:
    """Клавиатура после активации купона"""
    if success:
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📦 Сделать заказ", callback_data="create_order")],
            [InlineKeyboardButton(text="🔙 Назад в кабинет", callback_data="my_profile")],
        ])
    else:
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔄 Попробовать другой", callback_data="activate_coupon")],
            [InlineKeyboardButton(text="🔙 Назад в кабинет", callback_data="my_profile")],
        ])

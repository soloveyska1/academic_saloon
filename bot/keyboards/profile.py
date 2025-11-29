"""
Клавиатуры для Личного кабинета.
Стиль салуна — тёплый и дружелюбный.
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


def get_profile_dashboard_keyboard(active_orders: int = 0) -> InlineKeyboardMarkup:
    """Главная клавиатура ЛК — премиальная раскладка"""
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


def get_orders_list_keyboard(
    orders: list[Order],
    page: int,
    total_pages: int,
    filter_type: str = "all",
    counts: dict = None
) -> InlineKeyboardMarkup:
    """Список заказов"""
    buttons = []
    counts = counts or {"all": 0, "active": 0, "history": 0}

    # Фильтры
    filters = []

    all_label = f"Все {counts['all']}" if counts['all'] > 0 else "Все"
    if filter_type == "all":
        all_label = f"• {all_label}"
    filters.append(InlineKeyboardButton(text=all_label, callback_data="orders_filter:all:0"))

    active_label = f"⏳ {counts['active']}" if counts['active'] > 0 else "⏳"
    if filter_type == "active":
        active_label = f"• {active_label}"
    filters.append(InlineKeyboardButton(text=active_label, callback_data="orders_filter:active:0"))

    history_label = f"✓ {counts['history']}" if counts['history'] > 0 else "✓"
    if filter_type == "history":
        history_label = f"• {history_label}"
    filters.append(InlineKeyboardButton(text=history_label, callback_data="orders_filter:history:0"))

    buttons.append(filters)

    # Заказы
    for order in orders:
        meta = get_status_meta(order.status)
        emoji = meta.get("emoji", "")
        if emoji == "—":
            emoji = ""

        work_short = WORK_TYPE_SHORT.get(order.work_type, order.work_type)

        if order.subject:
            subj = order.subject[:10] + "…" if len(order.subject) > 10 else order.subject
            btn_text = f"{work_short} · {subj}"
        else:
            btn_text = work_short

        if emoji:
            btn_text = f"{emoji} {btn_text}"

        buttons.append([InlineKeyboardButton(text=btn_text, callback_data=f"order_detail:{order.id}")])

    # Пагинация
    if total_pages > 1:
        pagination = []
        if page > 0:
            pagination.append(InlineKeyboardButton(text="←", callback_data=f"orders_page:{filter_type}:{page - 1}"))
        pagination.append(InlineKeyboardButton(text=f"{page + 1}/{total_pages}", callback_data="noop"))
        if page < total_pages - 1:
            pagination.append(InlineKeyboardButton(text="→", callback_data=f"orders_page:{filter_type}:{page + 1}"))
        buttons.append(pagination)

    # Назад
    buttons.append([InlineKeyboardButton(text="← Назад", callback_data="my_profile")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_order_detail_keyboard(order: Order) -> InlineKeyboardMarkup:
    """Детали заказа"""
    buttons = []

    # Написать — главное действие
    buttons.append([InlineKeyboardButton(
        text="Написать нам",
        url=f"https://t.me/{settings.SUPPORT_USERNAME}?text=Заказ%20{order.id}"
    )])

    # Повторить — для завершённых
    meta = get_status_meta(order.status)
    if meta.get("is_final"):
        buttons.append([InlineKeyboardButton(text="Заказать снова", callback_data=f"reorder:{order.id}")])

    # Отмена — только для отменяемых (менее заметно)
    if order.can_be_cancelled:
        buttons.append([InlineKeyboardButton(text="Отменить заказ", callback_data=f"cancel_user_order:{order.id}")])

    # Назад
    buttons.append([InlineKeyboardButton(text="← К заказам", callback_data="profile_orders")])

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
    """Баланс"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Позвать друга", callback_data="profile_referral")],
        [InlineKeyboardButton(text="← Назад", callback_data="my_profile")],
    ])


def get_referral_keyboard(ref_link: str) -> InlineKeyboardMarkup:
    """Реферальная программа"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Поделиться", switch_inline_query=f"Помощь с учёбой — {ref_link}")],
        [InlineKeyboardButton(text="← Назад", callback_data="my_profile")],
    ])


def get_back_to_profile_keyboard() -> InlineKeyboardMarkup:
    """Назад в кабинет"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="← Назад", callback_data="my_profile")]
    ])

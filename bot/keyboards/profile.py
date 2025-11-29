"""
Клавиатуры для Личного кабинета.
Централизованное место для всех клавиатур ЛК.
"""

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from database.models.orders import Order, get_status_meta
from core.config import settings


# ══════════════════════════════════════════════════════════════
#                    ДАШБОРД (ГЛАВНЫЙ ЭКРАН ЛК)
# ══════════════════════════════════════════════════════════════

def get_profile_dashboard_keyboard(
    active_orders: int = 0,
    balance: float = 0,
) -> InlineKeyboardMarkup:
    """
    Главная клавиатура личного кабинета.
    Показывает счётчики для быстрой навигации.
    """
    buttons = []

    # Мои заказы — с счётчиком активных
    orders_text = f"📋 Мои заказы"
    if active_orders > 0:
        orders_text += f" · {active_orders}"
    buttons.append([
        InlineKeyboardButton(text=orders_text, callback_data="profile_orders")
    ])

    # Баланс — с суммой
    balance_text = f"💰 Баланс · {balance:.0f}₽" if balance > 0 else "💰 Баланс"
    buttons.append([
        InlineKeyboardButton(text=balance_text, callback_data="profile_balance"),
        InlineKeyboardButton(text="🤝 Друзья", callback_data="profile_referral"),
    ])

    # Быстрое действие — новый заказ
    buttons.append([
        InlineKeyboardButton(text="📝 Новый заказ", callback_data="create_order")
    ])

    # Назад в меню
    buttons.append([
        InlineKeyboardButton(text="◀️ В меню", callback_data="back_to_menu")
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


# ══════════════════════════════════════════════════════════════
#                    СПИСОК ЗАКАЗОВ
# ══════════════════════════════════════════════════════════════

# Короткие названия типов работ для кнопок
WORK_TYPE_SHORT = {
    "masters": "Магистерская",
    "diploma": "Диплом",
    "coursework": "Курсовая",
    "independent": "Самостоят.",
    "essay": "Эссе",
    "report": "Реферат",
    "control": "Контрольная",
    "presentation": "Презентация",
    "practice": "Практика",
    "other": "Другое",
    "photo_task": "Срочное",
}


def get_orders_list_keyboard(
    orders: list[Order],
    page: int,
    total_pages: int,
    filter_type: str = "all",
    counts: dict = None
) -> InlineKeyboardMarkup:
    """
    Клавиатура списка заказов — чистый универсальный дизайн.

    Args:
        orders: Список заказов для отображения
        page: Текущая страница (0-based)
        total_pages: Всего страниц
        filter_type: Тип фильтра (all, active, history)
        counts: Счётчики {all, active, history}
    """
    buttons = []
    counts = counts or {"all": 0, "active": 0, "history": 0}

    # Фильтры со счётчиками
    filter_buttons = []

    # Все
    all_label = f"Все · {counts['all']}" if counts['all'] > 0 else "Все"
    if filter_type == "all":
        all_label = f"• {all_label}"
    filter_buttons.append(InlineKeyboardButton(
        text=all_label, callback_data="orders_filter:all:0"
    ))

    # Активные
    active_label = f"⏳ {counts['active']}" if counts['active'] > 0 else "⏳"
    if filter_type == "active":
        active_label = f"• {active_label}"
    filter_buttons.append(InlineKeyboardButton(
        text=active_label, callback_data="orders_filter:active:0"
    ))

    # История (завершённые + отменённые)
    history_label = f"✨ {counts['history']}" if counts['history'] > 0 else "✨"
    if filter_type == "history":
        history_label = f"• {history_label}"
    filter_buttons.append(InlineKeyboardButton(
        text=history_label, callback_data="orders_filter:history:0"
    ))

    buttons.append(filter_buttons)

    # Кнопки заказов
    for order in orders:
        meta = get_status_meta(order.status)
        emoji = meta.get("emoji", "📋")
        work_short = WORK_TYPE_SHORT.get(order.work_type, order.work_type)

        # Добавляем предмет если есть
        if order.subject:
            subj = order.subject[:12] + "…" if len(order.subject) > 12 else order.subject
            btn_text = f"{work_short} · {subj} {emoji}"
        else:
            btn_text = f"{work_short} {emoji}"

        buttons.append([InlineKeyboardButton(
            text=btn_text,
            callback_data=f"order_detail:{order.id}"
        )])

    # Пагинация
    if total_pages > 1:
        pagination = []
        if page > 0:
            pagination.append(InlineKeyboardButton(
                text="◀️", callback_data=f"orders_page:{filter_type}:{page - 1}"
            ))
        pagination.append(InlineKeyboardButton(
            text=f"{page + 1}/{total_pages}", callback_data="noop"
        ))
        if page < total_pages - 1:
            pagination.append(InlineKeyboardButton(
                text="▶️", callback_data=f"orders_page:{filter_type}:{page + 1}"
            ))
        buttons.append(pagination)

    # Назад к ЛК
    buttons.append([InlineKeyboardButton(text="◀️ Кабинет", callback_data="my_profile")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_order_detail_keyboard(order: Order) -> InlineKeyboardMarkup:
    """
    Клавиатура деталей заказа.
    Показывает доступные действия в зависимости от статуса.
    """
    buttons = []

    # Кнопка отмены — только для отменяемых статусов
    if order.can_be_cancelled:
        buttons.append([InlineKeyboardButton(
            text="❌ Отменить заказ",
            callback_data=f"cancel_user_order:{order.id}"
        )])

    # Спросить о заказе — всегда
    buttons.append([InlineKeyboardButton(
        text="💬 Спросить об этом заказе",
        url=f"https://t.me/{settings.SUPPORT_USERNAME}?text=Заказ%20%23{order.id}"
    )])

    # Повторить заказ — для завершённых/отменённых
    meta = get_status_meta(order.status)
    if meta.get("is_final"):
        buttons.append([InlineKeyboardButton(
            text="🔄 Заказать похожее",
            callback_data=f"reorder:{order.id}"
        )])

    # Назад к списку
    buttons.append([InlineKeyboardButton(
        text="◀️ К списку заказов",
        callback_data="profile_orders"
    )])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_cancel_order_confirm_keyboard(order_id: int) -> InlineKeyboardMarkup:
    """Подтверждение отмены заказа"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Да, отменить",
                callback_data=f"confirm_cancel_order:{order_id}"
            ),
            InlineKeyboardButton(
                text="◀️ Нет, назад",
                callback_data=f"order_detail:{order_id}"
            ),
        ]
    ])


def get_empty_orders_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для пустого списка"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎯 Создать первый заказ", callback_data="create_order")],
        [InlineKeyboardButton(text="◀️ Кабинет", callback_data="my_profile")]
    ])


# ══════════════════════════════════════════════════════════════
#                    БАЛАНС
# ══════════════════════════════════════════════════════════════

def get_balance_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура раздела баланса"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📜 История операций", callback_data="balance_history")],
        [InlineKeyboardButton(text="◀️ Кабинет", callback_data="my_profile")],
    ])


def get_balance_history_keyboard(page: int = 0, total_pages: int = 1) -> InlineKeyboardMarkup:
    """Клавиатура истории баланса с пагинацией"""
    buttons = []

    # Пагинация
    if total_pages > 1:
        pagination = []
        if page > 0:
            pagination.append(InlineKeyboardButton(
                text="◀️", callback_data=f"balance_history_page:{page - 1}"
            ))
        pagination.append(InlineKeyboardButton(
            text=f"{page + 1}/{total_pages}", callback_data="noop"
        ))
        if page < total_pages - 1:
            pagination.append(InlineKeyboardButton(
                text="▶️", callback_data=f"balance_history_page:{page + 1}"
            ))
        buttons.append(pagination)

    buttons.append([InlineKeyboardButton(text="◀️ Назад", callback_data="profile_balance")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


# ══════════════════════════════════════════════════════════════
#                    РЕФЕРАЛЬНАЯ ПРОГРАММА
# ══════════════════════════════════════════════════════════════

def get_referral_keyboard(ref_link: str) -> InlineKeyboardMarkup:
    """Клавиатура реферальной программы"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="📤 Отправить другу",
                switch_inline_query=f"Помощь с учёбой — {ref_link}"
            )
        ],
        [InlineKeyboardButton(text="◀️ Кабинет", callback_data="my_profile")],
    ])


# ══════════════════════════════════════════════════════════════
#                    ОБЩИЕ
# ══════════════════════════════════════════════════════════════

def get_back_to_profile_keyboard() -> InlineKeyboardMarkup:
    """Простая кнопка "Назад в кабинет" """
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="◀️ Кабинет", callback_data="my_profile")]
    ])

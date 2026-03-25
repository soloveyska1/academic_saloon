from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo, KeyboardButtonRequestUsers

from core.config import settings


def get_persistent_menu() -> ReplyKeyboardMarkup:
    """
    Persistent Reply keyboard — one button leading to Mini App.
    Always visible under message input. Minimal, no confusion.
    """
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="Открыть приложение", web_app=WebAppInfo(url=settings.WEBAPP_URL)),
            ],
        ],
        resize_keyboard=True,
        is_persistent=True,
    )


def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура главного меню — одна кнопка в Mini App.
    Минимум кнопок = максимум конверсии.
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="Открыть приложение",
                web_app=WebAppInfo(url=settings.WEBAPP_URL)
            )
        ],
    ])
    return kb


def get_app_portal_keyboard() -> InlineKeyboardMarkup:
    """
    Минималистичная клавиатура-портал в Mini App.
    Одна кнопка — максимальная конверсия.
    """
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="Личный кабинет",
                web_app=WebAppInfo(url=settings.WEBAPP_URL)
            )
        ],
    ])


def get_start_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🎯 Новый заказ", callback_data="create_order")
        ],
        [
            InlineKeyboardButton(text="Профиль", callback_data="my_profile"),
            InlineKeyboardButton(text="Баланс", callback_data="finance")
        ],
        [
            InlineKeyboardButton(text="Пригласить друга", callback_data="referral"),
            InlineKeyboardButton(text="📜 Условия", callback_data="codex")
        ],
        [
            InlineKeyboardButton(text="💬 Поддержка", callback_data="support")
        ]
    ])
    return kb


def get_support_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура центра помощи с основным входом в чат поддержки"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="💬 Открыть чат поддержки",
                callback_data="enter_chat_support"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"✈️ Telegram @{settings.SUPPORT_USERNAME}",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            )
        ],
        [
            InlineKeyboardButton(
                text="⭐ Отзывы и кейсы",
                url=settings.REVIEWS_CHANNEL
            )
        ],
        [
            InlineKeyboardButton(text="Назад", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_codex_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для условий — URL на Telegraph + навигация"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="Подробные условия",
                url=settings.OFFER_URL
            )
        ],
        [
            InlineKeyboardButton(text="В главное меню", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_referral_keyboard(ref_text: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📤 Отправить другу", switch_inline_query=ref_text)
        ],
        [
            InlineKeyboardButton(text="В главное меню", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_back_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="В главное меню", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_cancel_complete_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура после отмены заказа — два варианта действий"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="В главное меню", callback_data="back_to_menu")
        ],
        [
            InlineKeyboardButton(text="📜 Посмотреть примеры", url=settings.REVIEWS_CHANNEL)
        ]
    ])
    return kb


def get_price_list_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для прайс-листа — быстрые кнопки заказа по типам"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        # Row 1: Крупные работы (специальные callback для быстрого заказа)
        [
            InlineKeyboardButton(text="🎓 Заказать Диплом", callback_data="quick_order:diploma"),
            InlineKeyboardButton(text="📚 Заказать Курсовую", callback_data="quick_order:coursework"),
        ],
        # Row 2: Быстрые варианты
        [
            InlineKeyboardButton(text="📸 Оценить задачу", callback_data="quick_order:photo_task"),
            InlineKeyboardButton(text="🔥 Срочно/Другое", callback_data="quick_order:other"),
        ],
        # Row 3: Оферта
        [
            InlineKeyboardButton(text="📜 Читать Оферту", callback_data="codex"),
        ],
        # Row 4: Назад
        [
            InlineKeyboardButton(text="В главное меню", callback_data="back_to_menu"),
        ],
    ])
    return kb


def get_pinned_message_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для закреплённого сообщения"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📝 РАССЧИТАТЬ СТОИМОСТЬ", callback_data="create_order")
        ]
    ])
    return kb

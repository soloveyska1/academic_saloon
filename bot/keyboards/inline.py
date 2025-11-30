from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton

from core.config import settings


def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура главного меню — Streamlined for conversion.

    Layout:
    [📝 РАССЧИТАТЬ СТОИМОСТЬ]     <- full width, Primary CTA
    [👤 Мои заказы]               <- full width, navigation
    [⭐️ Отзывы / Гарантии][🆘 Позвать Шерифа] <- trust & support
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📝 РАССЧИТАТЬ СТОИМОСТЬ", callback_data="create_order")
        ],
        [
            InlineKeyboardButton(text="👤 Мои заказы", callback_data="my_profile")
        ],
        [
            InlineKeyboardButton(text="⭐️ Отзывы / Гарантии", url=settings.REVIEWS_CHANNEL),
            InlineKeyboardButton(
                text="🆘 Позвать Шерифа",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            )
        ],
    ])
    return kb


def get_start_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🎯 Новый заказ", callback_data="create_order")
        ],
        [
            InlineKeyboardButton(text="🤠 Досье", callback_data="profile"),
            InlineKeyboardButton(text="💰 Казна", callback_data="finance")
        ],
        [
            InlineKeyboardButton(text="🐎 Позвать друга", callback_data="referral"),
            InlineKeyboardButton(text="📜 Кодекс", callback_data="codex")
        ],
        [
            InlineKeyboardButton(text="⭐ Шериф", callback_data="support")
        ]
    ])
    return kb


def get_codex_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для Кодекса — URL на Telegraph + навигация"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="📜 Полный свод законов (Telegraph)",
                url="https://telegra.ph/Kodeks-Saluna-Polnaya-versiya-11-29"
            )
        ],
        [
            InlineKeyboardButton(text="🔙 В главное меню", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_referral_keyboard(ref_text: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📤 Отправить другу", switch_inline_query=ref_text)
        ],
        [
            InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_back_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_cancel_complete_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура после отмены заказа — два варианта действий"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🍺 К барной стойке", callback_data="back_to_menu")
        ],
        [
            InlineKeyboardButton(text="📜 Посмотреть примеры", url=settings.REVIEWS_CHANNEL)
        ]
    ])
    return kb


def get_price_list_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для прайс-листа — CTA, правила, навигация"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📝 Заказать точный расчет", callback_data="create_order")
        ],
        [
            InlineKeyboardButton(text="⚖️ Читать правила", callback_data="codex")
        ],
        [
            InlineKeyboardButton(text="🔙 В главное меню", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_saloon_status_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для закреплённого сообщения — simplified, no refresh"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📝 РАССЧИТАТЬ СТОИМОСТЬ", callback_data="create_order")
        ]
    ])
    return kb
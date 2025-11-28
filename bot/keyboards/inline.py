from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton

from core.config import settings


def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """Компактная Inline клавиатура главного меню"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📝 Заказать работу", callback_data="create_order")
        ],
        [
            InlineKeyboardButton(text="👤 Мои заказы", callback_data="my_orders"),
            InlineKeyboardButton(text="💰 Мой баланс", callback_data="my_balance")
        ],
        [
            InlineKeyboardButton(text="💬 Написать Хозяину", callback_data="contact_owner"),
            InlineKeyboardButton(text="🤝 Привести друга", callback_data="referral")
        ],
        [
            InlineKeyboardButton(text="📜 Прайс-лист", callback_data="price_list"),
            InlineKeyboardButton(text="⚖️ Правила", callback_data="codex")
        ],
        [
            InlineKeyboardButton(text="⭐ Отзывы", url=settings.REVIEWS_CHANNEL)
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
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📖 Полная версия", callback_data="codex_full")
        ],
        [
            InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")
        ]
    ])
    return kb


def get_codex_full_keyboard() -> InlineKeyboardMarkup:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📋 Коротко", callback_data="codex")
        ],
        [
            InlineKeyboardButton(text="🌵 В салун", callback_data="back_to_menu")
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


def get_saloon_status_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для закреплённого сообщения со статусом салуна"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🔄 Обновить", callback_data="refresh_saloon_status"),
            InlineKeyboardButton(text="📝 Заказать", callback_data="create_order")
        ]
    ])
    return kb


def get_voice_teaser_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура с кнопкой для прослушивания голосового приветствия"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🎧 Послушать", callback_data="play_welcome_voice")
        ]
    ])
    return kb
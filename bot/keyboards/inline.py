from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton


def get_main_reply_keyboard() -> ReplyKeyboardMarkup:
    """Reply клавиатура главного меню"""
    kb = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📝 Заказать работу")],
            [
                KeyboardButton(text="👤 Мои заказы"),
                KeyboardButton(text="💰 Мой баланс")
            ],
            [
                KeyboardButton(text="💬 Написать Хозяину"),
                KeyboardButton(text="🤝 Привести друга")
            ],
            [
                KeyboardButton(text="📜 Прайс-лист"),
                KeyboardButton(text="⚖️ Правила")
            ],
        ],
        resize_keyboard=True
    )
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
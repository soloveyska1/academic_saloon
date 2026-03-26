from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from bot.texts.terms import TERMS_SECTIONS
from core.config import settings


def get_terms_short_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для экрана условий — только 2 кнопки"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="Принять условия",
                callback_data="accept_rules"
            )
        ],
        [
            InlineKeyboardButton(
                text="📚 Оферта, ПД и сведения",
                url=settings.public_legal_hub_url
            )
        ]
    ])


def get_terms_full_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура с разделами полной оферты"""
    buttons = []

    # Разделы по 2 в ряд
    row = []
    for key, (label, _) in TERMS_SECTIONS.items():
        row.append(InlineKeyboardButton(text=label, callback_data=f"terms_section:{key}"))
        if len(row) == 2:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    # Кнопки навигации
    buttons.append([
        InlineKeyboardButton(text="✅ Принимаю условия", callback_data="terms_accept")
    ])
    buttons.append([
        InlineKeyboardButton(text="◀️ Краткая версия", callback_data="terms_short")
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_terms_section_keyboard(current_section: str) -> InlineKeyboardMarkup:
    """Клавиатура навигации по разделу"""
    sections = list(TERMS_SECTIONS.keys())
    current_idx = sections.index(current_section)

    buttons = []

    # Навигация вперёд-назад
    nav_row = []
    if current_idx > 0:
        nav_row.append(InlineKeyboardButton(text="◀️", callback_data=f"terms_section:{sections[current_idx - 1]}"))

    nav_row.append(InlineKeyboardButton(text=f"{current_idx + 1}/{len(sections)}", callback_data="noop"))

    if current_idx < len(sections) - 1:
        nav_row.append(InlineKeyboardButton(text="▶️", callback_data=f"terms_section:{sections[current_idx + 1]}"))

    buttons.append(nav_row)

    # Основные кнопки
    buttons.append([
        InlineKeyboardButton(text="📋 Все разделы", callback_data="terms_full")
    ])
    buttons.append([
        InlineKeyboardButton(text="✅ Принимаю условия", callback_data="terms_accept")
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)

"""
Меню-проводник — главное чат-меню бота.

Собирает существующие сценарии (wizard заказа, мои заказы, прайс,
поддержка) и новые обучающие разделы (клуб, тутор) в один понятный экран.
"""

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

GUIDE_MENU_TEXT = """<b>С чего начнём?</b>

<i>Выберите нужное — проведём за руку до результата.</i>"""


def get_guide_menu() -> InlineKeyboardMarkup:
    """Главное чат-меню: по одной кнопке в ряд, понятные маршруты."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📝 Рассчитать и оформить заказ", callback_data="create_order")],
        [InlineKeyboardButton(text="📁 Мои заказы", callback_data="profile_orders")],
        [InlineKeyboardButton(text="💰 Цены и услуги", callback_data="price_list")],
        [InlineKeyboardButton(text="🎁 Бонусы и клуб", callback_data="guide_club")],
        [InlineKeyboardButton(text="❓ Как это работает", callback_data="tutorial_1")],
        [InlineKeyboardButton(text="💬 Задать вопрос", callback_data="guide_support")],
    ])

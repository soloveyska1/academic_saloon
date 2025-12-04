from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

from core.config import settings


def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """
    Клавиатура главного меню — App-First подход.
    Одна главная кнопка открывает Mini App.

    Layout:
    Row 1: [ 🚀 ОТКРЫТЬ ПРИЛОЖЕНИЕ ] — Primary CTA, WebApp
    Row 2: [ ⭐️ Отзывы ] [ 📜 Гарантии ]
    Row 3: [ 💬 Поддержка ]
    """
    kb = InlineKeyboardMarkup(inline_keyboard=[
        # Row 1: Primary CTA — Mini App главная страница
        [
            InlineKeyboardButton(
                text="🚀 ОТКРЫТЬ ПРИЛОЖЕНИЕ",
                web_app=WebAppInfo(url=settings.WEBAPP_URL)
            )
        ],
        # Row 2: Отзывы и Гарантии
        [
            InlineKeyboardButton(
                text="⭐ Отзывы (1000+)",
                url=settings.REVIEWS_CHANNEL
            ),
            InlineKeyboardButton(
                text="📜 Гарантии",
                callback_data="codex"
            ),
        ],
        # Row 3: Поддержка
        [
            InlineKeyboardButton(
                text="💬 Поддержка",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
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
                text="🚀 ОТКРЫТЬ ПРИЛОЖЕНИЕ",
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
            InlineKeyboardButton(text="🤠 Досье", callback_data="my_profile"),
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


def get_sheriff_choice_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура выбора способа связи с шерифом"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="💬 Написать в Телеграм",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}"
            )
        ],
        [
            InlineKeyboardButton(
                text="🤖 Чат прямо здесь",
                callback_data="support_bot_chat"
            )
        ],
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_menu")
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
            InlineKeyboardButton(text="🔙 В главное меню", callback_data="back_to_menu"),
        ],
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
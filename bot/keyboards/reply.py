from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def get_main_menu() -> ReplyKeyboardMarkup:
    """
    Главное меню Салуна.
    """
    kb = ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text="📝 Заказать работу"),
                KeyboardButton(text="👤 Профиль")
            ],
            [
                KeyboardButton(text="🆘 Поддержка"),
                KeyboardButton(text="📚 О сервисе")
            ]
        ],
        resize_keyboard=True, # Кнопки будут компактными
        input_field_placeholder="Чего изволите, сэр?"
    )
    return kb
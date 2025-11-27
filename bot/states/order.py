from aiogram.fsm.state import State, StatesGroup


class OrderState(StatesGroup):
    """Состояния для создания заказа"""

    choosing_type = State()      # Выбор типа работы
    entering_subject = State()   # Ввод предмета
    entering_topic = State()     # Ввод темы
    entering_details = State()   # Описание / требования
    entering_deadline = State()  # Сроки
    confirming = State()         # Подтверждение заявки

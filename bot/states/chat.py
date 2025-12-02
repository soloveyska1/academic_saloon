"""FSM состояния для приватного чата по заказу"""
from aiogram.fsm.state import State, StatesGroup


class OrderChatStates(StatesGroup):
    """Состояния приватного чата между админом и клиентом"""

    # Админ пишет клиенту
    admin_writing = State()  # Админ вводит сообщение для клиента

    # Клиент отвечает админу
    client_replying = State()  # Клиент вводит ответ

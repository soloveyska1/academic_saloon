"""FSM состояния для админ-панели"""
from aiogram.fsm.state import State, StatesGroup


class AdminStates(StatesGroup):
    """Состояния админ-панели"""
    waiting_clients_count = State()    # Ожидание ввода кол-ва клиентов
    waiting_orders_count = State()     # Ожидание ввода кол-ва заказов
    waiting_pin_chat_id = State()      # Ожидание ввода ID чата для закрепа

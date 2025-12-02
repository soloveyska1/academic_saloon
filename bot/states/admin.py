"""FSM состояния для админ-панели"""
from aiogram.fsm.state import State, StatesGroup


class AdminStates(StatesGroup):
    """Состояния админ-панели"""
    waiting_clients_count = State()    # Ожидание ввода кол-ва клиентов
    waiting_orders_count = State()     # Ожидание ввода кол-ва заказов
    waiting_pin_chat_id = State()      # Ожидание ввода ID чата для закрепа
    waiting_order_price = State()      # Ожидание ввода цены заказа
    confirm_delete_order = State()     # Подтверждение удаления заказа
    waiting_bonus_amount = State()     # Ожидание ввода суммы бонусов

    # Новые состояния для расширенной админки
    broadcast_text = State()           # Ожидание текста рассылки
    setting_price = State()            # Ожидание ввода новой цены
    messaging_user = State()           # Отправка сообщения клиенту
    sending_file = State()             # Отправка файла клиенту
    dialog_file = State()              # Отправка файла в диалоге
    dialog_voice = State()             # Отправка голосового в диалоге

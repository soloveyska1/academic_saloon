"""FSM состояния для чата через Forum Topics"""
from aiogram.fsm.state import State, StatesGroup


class ChatStates(StatesGroup):
    """
    Состояния чата клиента.

    Sticky State: пока клиент в состоянии in_chat,
    все его сообщения автоматически пересылаются в топик админской группы.
    """

    # Клиент находится в активном чате
    # Все сообщения (текст, файлы, голос) летят в топик
    in_chat = State()


# Legacy alias для обратной совместимости (если где-то используется)
OrderChatStates = ChatStates

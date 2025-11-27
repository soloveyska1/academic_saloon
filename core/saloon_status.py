"""
Модуль для управления статусом Салуна.
Хранит данные в Redis: загруженность, клиенты онлайн, заказы в работе.
"""
import json
from enum import Enum
from dataclasses import dataclass, asdict
from redis.asyncio import Redis

from core.config import settings


class LoadStatus(str, Enum):
    """Уровни загруженности салуна"""
    LOW = "low"           # Свободно
    MEDIUM = "medium"     # Средняя загрузка
    HIGH = "high"         # Очень плотно


# Визуальное отображение статусов
LOAD_STATUS_DISPLAY = {
    LoadStatus.LOW: ("🟢", "Свободно", "Принимаю заказы без очереди"),
    LoadStatus.MEDIUM: ("🟡", "Средняя загрузка", "Есть несколько заказов в работе"),
    LoadStatus.HIGH: ("🔴", "Очень плотно", "Большая загрузка, сроки могут увеличиться"),
}


@dataclass
class SaloonStatus:
    """Структура статуса салуна"""
    load_status: str = LoadStatus.MEDIUM.value
    clients_online: int = 12
    orders_in_progress: int = 5
    pinned_message_id: int | None = None
    pinned_chat_id: int | None = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SaloonStatus":
        return cls(**data)


class SaloonStatusManager:
    """Менеджер статуса салуна с хранением в Redis"""

    REDIS_KEY = "saloon:status"

    def __init__(self):
        self._redis: Redis | None = None

    async def _get_redis(self) -> Redis:
        """Ленивая инициализация Redis соединения"""
        if self._redis is None:
            # Используем REDIS_DB_CACHE для кеша статуса
            redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB_CACHE}"
            self._redis = Redis.from_url(redis_url, decode_responses=True)
        return self._redis

    async def get_status(self) -> SaloonStatus:
        """Получить текущий статус салуна"""
        redis = await self._get_redis()
        data = await redis.get(self.REDIS_KEY)

        if data:
            return SaloonStatus.from_dict(json.loads(data))

        # Возвращаем дефолтный статус
        return SaloonStatus()

    async def save_status(self, status: SaloonStatus) -> None:
        """Сохранить статус салуна"""
        redis = await self._get_redis()
        await redis.set(self.REDIS_KEY, json.dumps(status.to_dict()))

    async def set_load_status(self, load_status: LoadStatus) -> SaloonStatus:
        """Установить уровень загруженности"""
        status = await self.get_status()
        status.load_status = load_status.value
        await self.save_status(status)
        return status

    async def set_clients_online(self, count: int) -> SaloonStatus:
        """Установить количество клиентов онлайн"""
        status = await self.get_status()
        status.clients_online = max(0, count)
        await self.save_status(status)
        return status

    async def set_orders_in_progress(self, count: int) -> SaloonStatus:
        """Установить количество заказов в работе"""
        status = await self.get_status()
        status.orders_in_progress = max(0, count)
        await self.save_status(status)
        return status

    async def set_pinned_message(self, chat_id: int, message_id: int) -> SaloonStatus:
        """Сохранить ID закрепленного сообщения"""
        status = await self.get_status()
        status.pinned_chat_id = chat_id
        status.pinned_message_id = message_id
        await self.save_status(status)
        return status

    async def close(self):
        """Закрыть соединение с Redis"""
        if self._redis:
            await self._redis.close()


def generate_status_message(status: SaloonStatus) -> str:
    """
    Генерация красивого сообщения для закрепа.
    Убедительно, стильно, в духе Салуна.
    """
    load = LoadStatus(status.load_status)
    emoji, title, description = LOAD_STATUS_DISPLAY[load]

    # Иконки для динамики
    clients_icon = "👥"
    orders_icon = "📋"

    message = f"""🏚  <b>АКАДЕМИЧЕСКИЙ САЛУН</b>
━━━━━━━━━━━━━━━━━━━━━

{emoji}  <b>Статус:</b> {title}
<i>{description}</i>

━━━━━━━━━━━━━━━━━━━━━

{clients_icon}  <b>Клиентов сейчас:</b> {status.clients_online}
{orders_icon}  <b>Заказов в работе:</b> {status.orders_in_progress}

━━━━━━━━━━━━━━━━━━━━━

📊  <b>6 лет</b> на рынке
⭐  <b>1000+</b> довольных клиентов
✅  <b>3</b> бесплатные правки

━━━━━━━━━━━━━━━━━━━━━

<i>Выдыхай, партнёр. Ты в надёжных руках.</i>"""

    return message


# Глобальный экземпляр менеджера
saloon_manager = SaloonStatusManager()

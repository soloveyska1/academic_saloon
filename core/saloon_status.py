"""
Модуль для управления статусом Салуна.
Хранит данные в Redis: загруженность, клиенты, заказы в работе.
Динамически генерирует правдоподобное "людей в боте сейчас".
"""
import json
import random
import hashlib
from enum import Enum
from dataclasses import dataclass, asdict, field
from datetime import datetime
from zoneinfo import ZoneInfo
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
    clients_count: int = 3           # Клиентов сейчас (админ выставляет)
    orders_in_progress: int = 5      # Заказов в работе (админ выставляет)
    pinned_message_id: int | None = None
    pinned_chat_id: int | None = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SaloonStatus":
        # Миграция старого поля clients_online → clients_count
        if "clients_online" in data and "clients_count" not in data:
            data["clients_count"] = data.pop("clients_online")
        elif "clients_online" in data:
            data.pop("clients_online")
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

    async def set_clients_count(self, count: int) -> SaloonStatus:
        """Установить количество клиентов сейчас (админ выставляет вручную)"""
        status = await self.get_status()
        status.clients_count = max(0, count)
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


def generate_people_online() -> int:
    """
    Генерирует правдоподобное число "людей в боте сейчас".

    Алгоритм:
    - Зависит от времени суток (МСК)
    - Меняется каждые 3-5 минут (на основе хэша времени)
    - Плавные переходы, правдоподобный разброс
    """
    msk = ZoneInfo("Europe/Moscow")
    now = datetime.now(msk)
    hour = now.hour

    # Базовые значения по времени суток (МСК)
    # Ночь (0-6): мало людей
    # Утро (7-11): нарастает
    # День (12-17): пик
    # Вечер (18-23): спад

    base_by_hour = {
        0: 3, 1: 2, 2: 1, 3: 1, 4: 1, 5: 2,
        6: 4, 7: 7, 8: 12, 9: 18, 10: 22, 11: 25,
        12: 28, 13: 30, 14: 32, 15: 30, 16: 27, 17: 24,
        18: 21, 19: 18, 20: 15, 21: 12, 22: 8, 23: 5,
    }

    base = base_by_hour.get(hour, 15)

    # Создаём "окно" времени (меняется каждые 3-5 минут)
    # Хэш от текущего 4-минутного окна + даты
    time_window = now.minute // 4
    seed_str = f"{now.year}-{now.month}-{now.day}-{hour}-{time_window}-saloon"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)

    # Используем seed для стабильного, но "случайного" числа в пределах окна
    random.seed(seed)

    # Разброс ±30% от базы, но минимум ±2
    variance = max(2, int(base * 0.3))
    result = base + random.randint(-variance, variance)

    # Минимум 1, максимум 50
    return max(1, min(50, result))


def generate_status_message(status: SaloonStatus) -> str:
    """
    Генерация красивого сообщения для закрепа в боте.
    Минималистично, аккуратно, в духе Салуна.
    """
    load = LoadStatus(status.load_status)
    emoji, title, description = LOAD_STATUS_DISPLAY[load]

    # Динамическое число "людей в боте"
    people_online = generate_people_online()

    message = f"""<b>🏚 АКАДЕМИЧЕСКИЙ САЛУН</b>

{emoji}  {title}
<i>{description}</i>

·  ·  ·

👀  В боте сейчас  <b>{people_online}</b>
🧑‍💼  Клиентов  <b>{status.clients_count}</b>
📋  В работе  <b>{status.orders_in_progress}</b>

·  ·  ·

📊  <code>6 лет</code>  на рынке
⭐  <code>1000+</code>  довольных клиентов
✅  <code>3</code>  бесплатные правки

<i>Выдыхай, партнёр.
Ты в надёжных руках.</i>"""

    return message


# Глобальный экземпляр менеджера
saloon_manager = SaloonStatusManager()

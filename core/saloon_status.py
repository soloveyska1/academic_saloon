"""
Модуль для управления статусом Салуна.
Хранит данные в Redis: загруженность, клиенты, заказы в работе.
Динамически генерирует правдоподобное "людей в боте сейчас".
"""
import hashlib
import json
import random
from enum import Enum
from dataclasses import dataclass, asdict
from datetime import datetime
from zoneinfo import ZoneInfo

from core.config import settings
from core.redis_pool import get_redis


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


class OwnerStatusOverride(str, Enum):
    """Ручное переопределение статуса Хозяина"""
    AUTO = "auto"           # Автоматика (по времени + активности)
    ONLINE = "online"       # Принудительно на связи
    OFFLINE = "offline"     # Принудительно отдыхает (выходной)


@dataclass
class SaloonStatus:
    """Структура статуса салуна"""
    load_status: str = LoadStatus.MEDIUM.value
    clients_count: int = 3           # Клиентов сейчас (админ выставляет)
    orders_in_progress: int = 5      # Заказов в работе (админ выставляет)
    pinned_message_id: int | None = None
    pinned_chat_id: int | None = None
    # Статус Хозяина
    owner_status_override: str = OwnerStatusOverride.AUTO.value
    owner_last_activity: str | None = None  # ISO timestamp последней активности

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

    async def get_status(self) -> SaloonStatus:
        """Получить текущий статус салуна"""
        redis = await get_redis()
        data = await redis.get(self.REDIS_KEY)

        if data:
            return SaloonStatus.from_dict(json.loads(data))

        # Возвращаем дефолтный статус
        return SaloonStatus()

    async def save_status(self, status: SaloonStatus) -> None:
        """Сохранить статус салуна"""
        redis = await get_redis()
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

    async def set_owner_status(self, override: OwnerStatusOverride) -> SaloonStatus:
        """Установить ручной статус Хозяина (auto/online/offline)"""
        status = await self.get_status()
        status.owner_status_override = override.value
        await self.save_status(status)
        return status

    async def update_owner_activity(self) -> SaloonStatus:
        """Обновить время последней активности Хозяина"""
        status = await self.get_status()
        status.owner_last_activity = datetime.now(ZoneInfo("Europe/Moscow")).isoformat()
        await self.save_status(status)
        return status


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


# Ковбойские цитаты для закрепа
SALOON_QUOTES = [
    "«Хороший ковбой всегда держит слово»",
    "«В этих краях дела делаются быстро»",
    "«Один выстрел — одна пятёрка»",
    "«Шериф следит за порядком»",
    "«Закат красив, но дедлайн важнее»",
    "«Быстрее ветра, точнее пули»",
    "«С нами ты всегда в выигрыше»",
    "«Доверься профессионалам»",
]


def generate_load_bar(load_status: LoadStatus) -> str:
    """Генерирует визуальный прогресс-бар загрузки"""
    bars = {
        LoadStatus.LOW: ("▓▓░░░░░░░░", "20%"),
        LoadStatus.MEDIUM: ("▓▓▓▓▓▓░░░░", "60%"),
        LoadStatus.HIGH: ("▓▓▓▓▓▓▓▓▓░", "90%"),
    }
    return bars.get(load_status, ("▓▓▓▓▓░░░░░", "50%"))


def get_owner_status(status: SaloonStatus) -> tuple[str, str]:
    """
    Определяет статус Хозяина.
    Приоритет: ручной override > активность за 30 мин > время МСК.
    Возвращает (emoji, текст).
    """
    msk = ZoneInfo("Europe/Moscow")
    now = datetime.now(msk)

    # 1. Ручное переопределение
    override = OwnerStatusOverride(status.owner_status_override)
    if override == OwnerStatusOverride.ONLINE:
        return ("🟢", "Хозяин на связи")
    elif override == OwnerStatusOverride.OFFLINE:
        return ("🌙", "Хозяин отдыхает")

    # 2. Проверяем активность за последние 30 минут
    if status.owner_last_activity:
        try:
            last_activity = datetime.fromisoformat(status.owner_last_activity)
            if last_activity.tzinfo is None:
                last_activity = last_activity.replace(tzinfo=msk)
            minutes_ago = (now - last_activity).total_seconds() / 60
            if minutes_ago <= 30:
                return ("🟢", "Хозяин на связи")
        except (ValueError, TypeError):
            pass

    # 3. По времени МСК (9:00 - 22:00)
    if 9 <= now.hour < 22:
        return ("🟡", "Хозяин скорее всего на связи")
    else:
        return ("🌙", "Хозяин отдыхает")


def get_random_saloon_quote() -> str:
    """Возвращает случайную цитату для закрепа (стабильную в течение 10 минут)"""
    msk = ZoneInfo("Europe/Moscow")
    now = datetime.now(msk)

    # Меняем цитату каждые 10 минут
    time_window = now.minute // 10
    seed_str = f"{now.year}-{now.month}-{now.day}-{now.hour}-{time_window}-quote"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)

    random.seed(seed)
    return random.choice(SALOON_QUOTES)


def generate_status_message(status: SaloonStatus) -> str:
    """
    Генерация красивого сообщения для закрепа в боте.
    Минималистичный дизайн с интерактивными элементами.
    """
    load = LoadStatus(status.load_status)
    emoji, title, description = LOAD_STATUS_DISPLAY[load]

    # Прогресс-бар загрузки
    bar, percent = generate_load_bar(load)

    # Статус Хозяина (учитывает override, активность и время)
    owner_emoji, owner_status = get_owner_status(status)

    # Случайная цитата
    quote = get_random_saloon_quote()

    # Время обновления (МСК)
    msk = ZoneInfo("Europe/Moscow")
    now = datetime.now(msk)
    time_str = now.strftime("%H:%M")

    message = f"""{emoji} <b>АКАДЕМИЧЕСКИЙ САЛУН</b>

⚡️ <b>{title}</b>
<i>{description}</i>

Загрузка: {bar} {percent}

┌ 👥 Клиентов: <b>{status.clients_count}</b>
└ 📋 В работе: <b>{status.orders_in_progress}</b>

───────────

📊 6 лет в деле
⭐ 1000+ довольных клиентов
✅ Доводим до идеала

───────────

{owner_emoji} <b>{owner_status}</b>

💬 <i>{quote}</i>

<i>Обновлено: {time_str} МСК</i>"""

    return message


# Глобальный экземпляр менеджера
saloon_manager = SaloonStatusManager()

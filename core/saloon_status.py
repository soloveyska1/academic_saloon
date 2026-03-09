"""
Модуль для управления статусом сервиса.
Хранит данные в Redis для pinned message tracking.
Bot is ALWAYS shown as available 24/7.
"""
import json
from dataclasses import dataclass, asdict

from core.redis_pool import get_redis


@dataclass
class SaloonStatus:
    """Структура статуса сервиса — always available 24/7"""
    pinned_message_id: int | None = None
    pinned_chat_id: int | None = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SaloonStatus":
        # Only keep pinned message fields, ignore legacy fields
        return cls(
            pinned_message_id=data.get("pinned_message_id"),
            pinned_chat_id=data.get("pinned_chat_id"),
        )


class SaloonStatusManager:
    """Менеджер статуса сервиса с хранением в Redis"""

    REDIS_KEY = "saloon:status"

    async def get_status(self) -> SaloonStatus:
        """Получить текущий статус"""
        redis = await get_redis()
        data = await redis.get(self.REDIS_KEY)

        if data:
            return SaloonStatus.from_dict(json.loads(data))

        # Возвращаем дефолтный статус
        return SaloonStatus()

    async def save_status(self, status: SaloonStatus) -> None:
        """Сохранить статус"""
        redis = await get_redis()
        await redis.set(self.REDIS_KEY, json.dumps(status.to_dict()))

    async def set_pinned_message(self, chat_id: int, message_id: int) -> SaloonStatus:
        """Сохранить ID закрепленного сообщения"""
        status = await self.get_status()
        status.pinned_chat_id = chat_id
        status.pinned_message_id = message_id
        await self.save_status(status)
        return status


def generate_status_message(status: SaloonStatus = None) -> str:
    """
    Генерация статичного сообщения для закрепа в боте.
    Always shows bot as available 24/7 with strong CTA.
    No dynamic load stats, no offline status.
    """
    message = """<b>Academic Saloon</b>

Помощь студентам 24/7. Более 1 000 выполненных заказов.

Нажмите кнопку ниже, чтобы рассчитать стоимость."""

    return message


# Глобальный экземпляр менеджера
saloon_manager = SaloonStatusManager()

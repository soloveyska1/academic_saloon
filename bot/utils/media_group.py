"""
Утилита для объединения ответов на media_group (альбомы).

Когда пользователь отправляет несколько файлов одновременно (альбом),
Telegram присылает их как отдельные сообщения с одинаковым media_group_id.
Этот модуль позволяет собрать их в одно и ответить одним сообщением.
"""

import asyncio
import logging
from typing import Callable, Any
from collections import defaultdict

logger = logging.getLogger(__name__)


class MediaGroupCollector:
    """
    Коллектор для медиа-групп (альбомов).

    Собирает файлы из одной группы и вызывает callback один раз
    после получения всех файлов (с небольшой задержкой).
    """

    # Время ожидания всех файлов группы (секунды)
    COLLECT_DELAY = 1.0

    def __init__(self):
        # {media_group_id: [file_info, ...]}
        self._groups: dict[str, list[dict]] = defaultdict(list)
        # {media_group_id: asyncio.Task}
        self._tasks: dict[str, asyncio.Task] = {}
        # {media_group_id: (callback, args)}
        self._callbacks: dict[str, tuple[Callable, dict]] = {}

    async def add_file(
        self,
        media_group_id: str | None,
        file_info: dict,
        on_complete: Callable[..., Any],
        callback_kwargs: dict | None = None,
    ) -> bool:
        """
        Добавить файл в коллектор.

        Args:
            media_group_id: ID медиа-группы (None если одиночный файл)
            file_info: Информация о файле (type, file_id, etc.)
            on_complete: Callback для вызова после сбора всех файлов.
                         Принимает files: list[dict] как первый аргумент.
            callback_kwargs: Дополнительные kwargs для callback

        Returns:
            True если это часть группы (ответ будет позже),
            False если одиночный файл (ответить нужно сейчас)
        """
        if not media_group_id:
            # Одиночный файл — не собираем, сразу вызываем callback
            return False

        # Добавляем файл в группу
        self._groups[media_group_id].append(file_info)
        self._callbacks[media_group_id] = (on_complete, callback_kwargs or {})

        # Отменяем предыдущий таск если есть
        if media_group_id in self._tasks:
            self._tasks[media_group_id].cancel()

        # Запускаем новый таск с задержкой
        self._tasks[media_group_id] = asyncio.create_task(
            self._delayed_callback(media_group_id)
        )

        return True

    async def _delayed_callback(self, media_group_id: str):
        """Вызывает callback после задержки"""
        try:
            await asyncio.sleep(self.COLLECT_DELAY)

            # Забираем данные
            files = self._groups.pop(media_group_id, [])
            callback_data = self._callbacks.pop(media_group_id, None)
            self._tasks.pop(media_group_id, None)

            if callback_data and files:
                callback, kwargs = callback_data
                try:
                    await callback(files=files, **kwargs)
                except Exception as e:
                    logger.error(f"Error in media_group callback: {e}")

        except asyncio.CancelledError:
            # Нормально — новый файл прибыл
            pass


# Глобальный экземпляр коллектора
_collector = MediaGroupCollector()


async def handle_media_group_file(
    media_group_id: str | None,
    file_info: dict,
    on_complete: Callable[..., Any],
    **callback_kwargs,
) -> bool:
    """
    Удобная функция для обработки файла.

    Args:
        media_group_id: ID группы из message.media_group_id
        file_info: Словарь с инфой о файле
        on_complete: Async callback(files: list[dict], **kwargs)
        **callback_kwargs: Дополнительные аргументы для callback

    Returns:
        True если файл добавлен в группу (НЕ отвечать сейчас),
        False если одиночный файл (отвечать сразу)
    """
    return await _collector.add_file(
        media_group_id,
        file_info,
        on_complete,
        callback_kwargs,
    )


def get_files_summary(files: list[dict]) -> str:
    """
    Генерирует краткую сводку о файлах.

    Returns:
        Строка вида "3 фото, 2 документа"
    """
    photos = sum(1 for f in files if f.get("type") == "photo")
    docs = sum(1 for f in files if f.get("type") == "document")
    voices = sum(1 for f in files if f.get("type") == "voice")
    videos = sum(1 for f in files if f.get("type") == "video")
    texts = sum(1 for f in files if f.get("type") == "text")

    parts = []
    if photos:
        parts.append(f"{photos} фото")
    if docs:
        parts.append(f"{docs} {'файл' if docs == 1 else 'файла' if docs < 5 else 'файлов'}")
    if voices:
        parts.append(f"{voices} голосовых")
    if videos:
        parts.append(f"{videos} видео")
    if texts:
        parts.append(f"{texts} текст")

    return ", ".join(parts) if parts else "файлы"

"""
Сервис для работы с Яндекс Диском.
Автоматическая загрузка файлов заказов в организованные папки.
"""
import asyncio
import logging
import httpx
from datetime import datetime
from functools import wraps
from typing import Optional, TypeVar, Callable, Any
from dataclasses import dataclass
from pathlib import Path
import re

from core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar('T')


def async_retry(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """
    Retry decorator for async functions with exponential backoff.
    Retries on httpx.HTTPError and httpx.TimeoutException.
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None
            current_delay = delay

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except (httpx.HTTPError, httpx.TimeoutException) as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        logger.warning(
                            f"[YaDisk] {func.__name__} attempt {attempt + 1} failed: {e}. "
                            f"Retrying in {current_delay:.1f}s..."
                        )
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(f"[YaDisk] {func.__name__} failed after {max_attempts} attempts: {e}")

            raise last_exception
        return wrapper
    return decorator

# Yandex Disk API endpoints
YADISK_API_BASE = "https://cloud-api.yandex.net/v1/disk"


@dataclass
class UploadResult:
    """Результат загрузки файла"""
    success: bool
    public_url: Optional[str] = None
    folder_url: Optional[str] = None
    error: Optional[str] = None


def sanitize_filename(name: str) -> str:
    """Убирает недопустимые символы из имени файла/папки"""
    # Заменяем недопустимые символы на _
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', name)
    # Убираем лишние пробелы
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    return sanitized[:100]  # Ограничиваем длину


class YandexDiskService:
    """Сервис для загрузки файлов на Яндекс Диск"""

    def __init__(self):
        self._token = settings.YANDEX_DISK_TOKEN
        self._root_folder = settings.YANDEX_DISK_FOLDER
        self._configured = bool(self._token)

        if self._configured:
            logger.info("Yandex Disk service configured")
        else:
            logger.warning("Yandex Disk not configured: missing YANDEX_DISK_TOKEN")

    @property
    def is_available(self) -> bool:
        """Доступен ли Яндекс Диск"""
        return self._configured

    def _get_headers(self) -> dict:
        """Заголовки для API запросов"""
        return {
            "Authorization": f"OAuth {self._token}",
            "Content-Type": "application/json",
        }

    def _get_client_folder_path(
        self,
        client_name: str,
        telegram_id: int,
    ) -> str:
        """
        Генерирует путь к персональной папке клиента.

        Структура: /Academic_Saloon_Orders/Клиенты/Имя_12345678/
        """
        safe_name = sanitize_filename(client_name) if client_name else "Клиент"
        folder_name = f"{safe_name}_{telegram_id}"

        return f"/{self._root_folder}/Клиенты/{folder_name}"

    def _get_order_folder_path(
        self,
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: int = None,
    ) -> str:
        """
        Генерирует путь к папке заказа внутри папки клиента.

        Структура: /Academic_Saloon_Orders/Клиенты/Имя_12345678/Заказ_123/

        Только order_id в названии - путь 100% стабильный для дослата.
        """
        # Только ID! work_type может отличаться между созданием и дослатом
        folder_name = f"Заказ_{order_id}"

        if telegram_id:
            client_folder = self._get_client_folder_path(client_name, telegram_id)
            return f"{client_folder}/{folder_name}"
        else:
            # Fallback для совместимости (без telegram_id)
            safe_name = sanitize_filename(client_name) if client_name else "Клиент"
            month_folder = datetime.now().strftime("%Y-%m")
            return f"/{self._root_folder}/{month_folder}/#{order_id}_{safe_name}"

    async def _ensure_folder_exists(self, client: httpx.AsyncClient, path: str) -> bool:
        """Создаёт папку если не существует (рекурсивно)"""
        try:
            # Проверяем существование
            response = await client.get(
                f"{YADISK_API_BASE}/resources",
                params={"path": path},
                headers=self._get_headers(),
            )

            if response.status_code == 200:
                return True

            if response.status_code == 404:
                # Папка не существует — создаём родительскую, потом текущую
                parent = str(Path(path).parent)
                if parent != "/":
                    if not await self._ensure_folder_exists(client, parent):
                        return False

                # Создаём текущую папку
                create_resp = await client.put(
                    f"{YADISK_API_BASE}/resources",
                    params={"path": path},
                    headers=self._get_headers(),
                )
                if create_resp.status_code in (201, 409):  # 409 = уже существует
                    logger.debug(f"Folder created: {path}")
                    return True
                else:
                    logger.error(f"Failed to create folder {path}: {create_resp.text}")
                    return False

            return False

        except Exception as e:
            logger.error(f"Error ensuring folder exists {path}: {e}")
            return False

    async def _get_upload_url(
        self,
        client: httpx.AsyncClient,
        disk_path: str,
        overwrite: bool = True,
    ) -> Optional[str]:
        """Получает URL для загрузки файла"""
        try:
            response = await client.get(
                f"{YADISK_API_BASE}/resources/upload",
                params={"path": disk_path, "overwrite": str(overwrite).lower()},
                headers=self._get_headers(),
            )

            if response.status_code == 200:
                return response.json().get("href")

            logger.error(f"Failed to get upload URL: {response.text}")
            return None

        except Exception as e:
            logger.error(f"Error getting upload URL: {e}")
            return None

    async def _publish_folder(
        self,
        client: httpx.AsyncClient,
        path: str,
    ) -> Optional[str]:
        """Публикует папку и возвращает публичную ссылку"""
        try:
            # Публикуем
            response = await client.put(
                f"{YADISK_API_BASE}/resources/publish",
                params={"path": path},
                headers=self._get_headers(),
            )

            if response.status_code not in (200, 201):
                logger.warning(f"Failed to publish folder: {response.text}")
                return None

            # Получаем публичный URL
            meta_resp = await client.get(
                f"{YADISK_API_BASE}/resources",
                params={"path": path},
                headers=self._get_headers(),
            )

            if meta_resp.status_code == 200:
                return meta_resp.json().get("public_url")

            return None

        except Exception as e:
            logger.error(f"Error publishing folder: {e}")
            return None

    async def upload_file_from_telegram(
        self,
        file_bytes: bytes,
        filename: str,
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: int = None,
    ) -> UploadResult:
        """
        Загружает файл из Telegram на Яндекс Диск.

        Args:
            file_bytes: Содержимое файла
            filename: Имя файла
            order_id: ID заказа
            client_name: Имя клиента (для папки)
            work_type: Тип работы (для папки)
            telegram_id: Telegram ID клиента (для персональной папки)

        Returns:
            UploadResult с результатом и ссылками
        """
        if not self._configured:
            return UploadResult(success=False, error="Yandex Disk not configured")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Путь к папке заказа
                folder_path = self._get_order_folder_path(order_id, client_name, work_type, telegram_id)

                # Создаём папку
                if not await self._ensure_folder_exists(client, folder_path):
                    return UploadResult(success=False, error="Failed to create folder")

                # Путь к файлу
                safe_filename = sanitize_filename(filename)
                file_path = f"{folder_path}/{safe_filename}"

                # Получаем URL для загрузки
                upload_url = await self._get_upload_url(client, file_path)
                if not upload_url:
                    return UploadResult(success=False, error="Failed to get upload URL")

                # Загружаем файл
                upload_resp = await client.put(
                    upload_url,
                    content=file_bytes,
                    headers={"Content-Type": "application/octet-stream"},
                )

                if upload_resp.status_code not in (201, 202):
                    return UploadResult(
                        success=False,
                        error=f"Upload failed: {upload_resp.status_code}"
                    )

                # Публикуем папку и получаем ссылку
                public_url = await self._publish_folder(client, folder_path)

                logger.info(f"File uploaded: {file_path}")

                return UploadResult(
                    success=True,
                    public_url=public_url,
                    folder_url=public_url,
                )

        except Exception as e:
            logger.error(f"Error uploading file to Yandex Disk: {e}")
            return UploadResult(success=False, error=str(e))

    async def upload_multiple_files(
        self,
        files: list[tuple[bytes, str]],  # [(content, filename), ...]
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: int = None,
    ) -> UploadResult:
        """
        Загружает несколько файлов в одну папку.

        Args:
            files: Список кортежей (содержимое, имя_файла)
            order_id: ID заказа
            client_name: Имя клиента
            work_type: Тип работы
            telegram_id: Telegram ID клиента (для персональной папки)

        Returns:
            UploadResult с публичной ссылкой на папку
        """
        if not self._configured:
            return UploadResult(success=False, error="Yandex Disk not configured")

        if not files:
            return UploadResult(success=False, error="No files to upload")

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                folder_path = self._get_order_folder_path(order_id, client_name, work_type, telegram_id)

                # Создаём папку
                if not await self._ensure_folder_exists(client, folder_path):
                    return UploadResult(success=False, error="Failed to create folder")

                # Загружаем каждый файл
                uploaded_count = 0
                for file_bytes, filename in files:
                    safe_filename = sanitize_filename(filename)
                    file_path = f"{folder_path}/{safe_filename}"

                    upload_url = await self._get_upload_url(client, file_path)
                    if not upload_url:
                        continue

                    upload_resp = await client.put(
                        upload_url,
                        content=file_bytes,
                        headers={"Content-Type": "application/octet-stream"},
                    )

                    if upload_resp.status_code in (201, 202):
                        uploaded_count += 1
                        logger.debug(f"Uploaded: {safe_filename}")

                if uploaded_count == 0:
                    return UploadResult(success=False, error="No files were uploaded")

                # Публикуем папку
                public_url = await self._publish_folder(client, folder_path)

                logger.info(f"Uploaded {uploaded_count}/{len(files)} files to {folder_path}")

                return UploadResult(
                    success=True,
                    public_url=public_url,
                    folder_url=public_url,
                )

        except Exception as e:
            logger.error(f"Error uploading files to Yandex Disk: {e}")
            return UploadResult(success=False, error=str(e))

    async def upload_append_files(
        self,
        files: list[tuple[bytes, str]],  # [(content, filename), ...]
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: int = None,
    ) -> UploadResult:
        """
        Загружает досланные файлы в подпапку "Дополнительно" существующего заказа.

        Структура: .../Заказ_123_.../Дополнительно_2025-12-02_14-30/

        Args:
            files: Список кортежей (содержимое, имя_файла)
            order_id: ID заказа
            client_name: Имя клиента
            work_type: Тип работы
            telegram_id: Telegram ID клиента

        Returns:
            UploadResult с публичной ссылкой на папку заказа
        """
        if not self._configured:
            return UploadResult(success=False, error="Yandex Disk not configured")

        if not files:
            return UploadResult(success=False, error="No files to upload")

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Базовая папка заказа
                order_folder = self._get_order_folder_path(order_id, client_name, work_type, telegram_id)

                # Подпапка для дополнительных файлов с датой/временем
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
                append_folder = f"{order_folder}/Дополнительно_{timestamp}"

                # Создаём подпапку
                if not await self._ensure_folder_exists(client, append_folder):
                    return UploadResult(success=False, error="Failed to create append folder")

                # Загружаем файлы
                uploaded_count = 0
                for file_bytes, filename in files:
                    safe_filename = sanitize_filename(filename)
                    file_path = f"{append_folder}/{safe_filename}"

                    upload_url = await self._get_upload_url(client, file_path)
                    if not upload_url:
                        continue

                    upload_resp = await client.put(
                        upload_url,
                        content=file_bytes,
                        headers={"Content-Type": "application/octet-stream"},
                    )

                    if upload_resp.status_code in (201, 202):
                        uploaded_count += 1
                        logger.debug(f"Uploaded append file: {safe_filename}")

                if uploaded_count == 0:
                    return UploadResult(success=False, error="No append files were uploaded")

                # Публикуем папку заказа (не подпапку)
                public_url = await self._publish_folder(client, order_folder)

                logger.info(f"Uploaded {uploaded_count}/{len(files)} append files to {append_folder}")

                return UploadResult(
                    success=True,
                    public_url=public_url,
                    folder_url=public_url,
                )

        except Exception as e:
            logger.error(f"Error uploading append files to Yandex Disk: {e}")
            return UploadResult(success=False, error=str(e))

    async def get_folder_link(
        self,
        order_id: int,
        client_name: str,
        work_type: str,
    ) -> Optional[str]:
        """Получает публичную ссылку на папку заказа (если существует)"""
        if not self._configured:
            return None

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                folder_path = self._get_order_folder_path(order_id, client_name, work_type)

                response = await client.get(
                    f"{YADISK_API_BASE}/resources",
                    params={"path": folder_path},
                    headers=self._get_headers(),
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("public_url")

                return None

        except Exception as e:
            logger.error(f"Error getting folder link: {e}")
            return None


    async def upload_chat_file(
        self,
        file_bytes: bytes,
        filename: str,
        order_id: int,
        client_name: str,
        telegram_id: int,
    ) -> UploadResult:
        """
        Загружает файл из чата на Яндекс Диск.

        Структура: .../Заказ_123/Чат/filename

        Args:
            file_bytes: Содержимое файла
            filename: Имя файла
            order_id: ID заказа
            client_name: Имя клиента
            telegram_id: Telegram ID клиента

        Returns:
            UploadResult с публичной ссылкой на файл
        """
        if not self._configured:
            return UploadResult(success=False, error="Yandex Disk not configured")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Папка заказа + подпапка для чата
                order_folder = self._get_order_folder_path(order_id, client_name, "", telegram_id)
                chat_folder = f"{order_folder}/Чат"

                # Создаём папку
                if not await self._ensure_folder_exists(client, chat_folder):
                    return UploadResult(success=False, error="Failed to create chat folder")

                # Путь к файлу с timestamp для уникальности
                timestamp = datetime.now().strftime("%H%M%S")
                safe_filename = sanitize_filename(filename)
                # Add timestamp prefix to avoid overwrites
                file_path = f"{chat_folder}/{timestamp}_{safe_filename}"

                # Получаем URL для загрузки
                upload_url = await self._get_upload_url(client, file_path)
                if not upload_url:
                    return UploadResult(success=False, error="Failed to get upload URL")

                # Загружаем файл
                upload_resp = await client.put(
                    upload_url,
                    content=file_bytes,
                    headers={"Content-Type": "application/octet-stream"},
                )

                if upload_resp.status_code not in (201, 202):
                    return UploadResult(
                        success=False,
                        error=f"Upload failed: {upload_resp.status_code}"
                    )

                # Публикуем файл и получаем ссылку
                public_url = await self._publish_folder(client, file_path)

                logger.info(f"Chat file uploaded: {file_path}")

                return UploadResult(
                    success=True,
                    public_url=public_url,
                    folder_url=public_url,
                )

        except Exception as e:
            logger.error(f"Error uploading chat file to Yandex Disk: {e}")
            return UploadResult(success=False, error=str(e))


# Singleton instance
yandex_disk_service = YandexDiskService()

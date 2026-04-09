"""
Сервис для работы с Яндекс Диском.
Автоматическая загрузка файлов заказов в организованные папки.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
from functools import wraps
import logging
from pathlib import Path
import re
from typing import Any, Callable, Optional, TypeVar

import httpx

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

CLIENTS_ROOT_FOLDER = "Клиенты"
CLIENT_ORDERS_FOLDER = "Заказы"
CLIENT_METADATA_FILE = "00_Паспорт_клиента.txt"
ORDER_METADATA_FILE = "00_Паспорт_заказа.txt"
ORDER_SECTION_CLIENT_FILES = "01_Материалы_от_клиента"
ORDER_SECTION_APPENDS = "02_Дослано_позже"
ORDER_SECTION_CHAT = "03_Диалог_и_комментарии"
ORDER_SECTION_CHAT_ATTACHMENTS = f"{ORDER_SECTION_CHAT}/Вложения"
ORDER_SECTION_DELIVERABLES = "04_Готовая_работа"
CHAT_HISTORY_FILENAME = "История_чата.txt"
DELIVERABLE_BATCH_METADATA_FILE = "00_Паспорт_выдачи.txt"


@dataclass
class UploadResult:
    """Результат загрузки файла"""
    success: bool
    public_url: Optional[str] = None
    folder_url: Optional[str] = None
    batch_url: Optional[str] = None
    error: Optional[str] = None
    uploaded_count: int = 0
    total_count: int = 0


def sanitize_filename(name: str) -> str:
    """Убирает недопустимые символы из имени файла/папки"""
    # Заменяем недопустимые символы на _
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', name)
    # Убираем лишние пробелы
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    return sanitized[:100]  # Ограничиваем длину


def _format_datetime_label(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, datetime):
        return value.strftime("%d.%m.%Y %H:%M")
    return str(value)


def _format_order_date_segment(value: Any) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if value:
        return sanitize_filename(str(value))[:20]
    return "без_даты"


def _format_money_label(value: Any) -> str:
    if value is None:
        return "—"
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return str(value)

    if amount.is_integer():
        return f"{int(amount)} ₽"
    return f"{amount:.2f} ₽"


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
        client_username: Optional[str] = None,
    ) -> str:
        """
        Генерирует путь к персональной папке клиента.

        Структура: /Academic_Saloon_Orders/Клиенты/Клиент__Имя__tg_12345678/
        """
        safe_name = sanitize_filename(client_name) if client_name else "Клиент"
        folder_name = sanitize_filename(f"Клиент__{safe_name}__tg_{telegram_id}")[:120]
        return f"/{self._root_folder}/{CLIENTS_ROOT_FOLDER}/{folder_name}"

    def build_order_meta(self, order: Any) -> dict[str, Any]:
        """Build stable storage metadata from an order-like object."""
        return {
            "created_at": getattr(order, "created_at", None),
            "status": getattr(order, "status", None),
            "subject": getattr(order, "subject", None),
            "topic": getattr(order, "topic", None),
            "deadline": getattr(order, "deadline", None),
            "price": getattr(order, "price", None),
            "final_price": getattr(order, "final_price", None),
            "paid_amount": getattr(order, "paid_amount", None),
            "delivered_at": getattr(order, "delivered_at", None),
            "completed_at": getattr(order, "completed_at", None),
        }

    def _get_order_folder_path(
        self,
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: Optional[int] = None,
        order_meta: Optional[dict[str, Any]] = None,
        client_username: Optional[str] = None,
    ) -> str:
        """
        Генерирует путь к папке заказа внутри папки клиента.

        Структура: /Academic_Saloon_Orders/Клиенты/.../Заказы/Заказ_123__2026-04-08/
        """
        created_at = (order_meta or {}).get("created_at")
        folder_name = sanitize_filename(
            f"Заказ_{order_id}__{_format_order_date_segment(created_at)}"
        )[:120]

        if telegram_id:
            client_folder = self._get_client_folder_path(
                client_name,
                telegram_id,
                client_username=client_username,
            )
            return f"{client_folder}/{CLIENT_ORDERS_FOLDER}/{folder_name}"
        else:
            return f"/{self._root_folder}/{CLIENT_ORDERS_FOLDER}/{folder_name}"

    def _get_order_section_path(
        self,
        order_id: int,
        client_name: str,
        work_type: str,
        section_name: str,
        telegram_id: Optional[int] = None,
        order_meta: Optional[dict[str, Any]] = None,
        client_username: Optional[str] = None,
    ) -> str:
        order_folder = self._get_order_folder_path(
            order_id=order_id,
            client_name=client_name,
            work_type=work_type,
            telegram_id=telegram_id,
            order_meta=order_meta,
            client_username=client_username,
        )
        return f"{order_folder}/{section_name}"

    def _build_client_metadata(
        self,
        client_name: str,
        telegram_id: int,
        client_username: Optional[str] = None,
    ) -> str:
        username_line = f"@{client_username}" if client_username else "—"
        lines = [
            "Academic Saloon — паспорт клиента",
            "",
            f"Обновлено: {_format_datetime_label(datetime.now())}",
            f"Клиент: {client_name or 'Клиент'}",
            f"Telegram ID: {telegram_id}",
            f"Username: {username_line}",
            "",
            "Содержимое папки:",
            f"- {CLIENT_ORDERS_FOLDER}: все заказы клиента",
            "",
            "Папка создаётся автоматически и используется для исходных материалов, досыла, диалога и готовой работы.",
        ]
        return "\n".join(lines)

    def _build_order_metadata(
        self,
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: Optional[int] = None,
        client_username: Optional[str] = None,
        order_meta: Optional[dict[str, Any]] = None,
    ) -> str:
        meta = order_meta or {}
        username_line = f"@{client_username}" if client_username else "—"
        lines = [
            "Academic Saloon — паспорт заказа",
            "",
            f"Заказ: #{order_id}",
            f"Обновлено: {_format_datetime_label(datetime.now())}",
            f"Создан: {_format_datetime_label(meta.get('created_at'))}",
            f"Статус: {meta.get('status') or '—'}",
            "",
            f"Клиент: {client_name or 'Клиент'}",
            f"Telegram ID: {telegram_id or '—'}",
            f"Username: {username_line}",
            "",
            f"Тип работы: {work_type or '—'}",
            f"Предмет: {meta.get('subject') or '—'}",
            f"Тема: {meta.get('topic') or '—'}",
            f"Срок: {meta.get('deadline') or '—'}",
            f"Базовая цена: {_format_money_label(meta.get('price'))}",
            f"Итоговая цена: {_format_money_label(meta.get('final_price'))}",
            f"Оплачено: {_format_money_label(meta.get('paid_amount'))}",
            f"Работа выдана: {_format_datetime_label(meta.get('delivered_at'))}",
            f"Заказ завершён: {_format_datetime_label(meta.get('completed_at'))}",
            "",
            "Структура папки:",
            f"- {ORDER_SECTION_CLIENT_FILES}: исходные материалы от клиента",
            f"- {ORDER_SECTION_APPENDS}: файлы, досланные позже",
            f"- {ORDER_SECTION_CHAT}: история переписки и вложения чата",
            f"- {ORDER_SECTION_DELIVERABLES}: итоговые файлы и работа",
        ]
        return "\n".join(lines)

    def _build_deliverable_batch_name(
        self,
        *,
        delivered_at: datetime | None = None,
        version_number: int | None = None,
    ) -> str:
        batch_time = delivered_at or datetime.now()
        prefix = f"Версия_{version_number}__" if version_number else ""
        return sanitize_filename(f"{prefix}{batch_time.strftime('%Y-%m-%d_%H-%M')}__выдача_клиенту")[:120]

    def _build_deliverable_batch_metadata(
        self,
        *,
        order_id: int,
        file_names: list[str],
        delivered_by: str | None = None,
        delivery_note: str | None = None,
        delivered_at: datetime | None = None,
        version_number: int | None = None,
    ) -> str:
        delivery_time = delivered_at or datetime.now()
        lines = [
            "Academic Saloon — паспорт выдачи",
            "",
            f"Заказ: #{order_id}",
            f"Версия: {version_number or '—'}",
            f"Сформировано: {_format_datetime_label(datetime.now())}",
            f"Выдано клиенту: {_format_datetime_label(delivery_time)}",
            f"Отправил: {delivered_by or 'Менеджер'}",
        ]
        if delivery_note:
            lines.extend(["", "Комментарий:", delivery_note])
        lines.extend(["", "Файлы выдачи:"])
        lines.extend(f"- {file_name}" for file_name in file_names if file_name)
        return "\n".join(lines)

    async def _upload_text_file(
        self,
        client: httpx.AsyncClient,
        file_path: str,
        content: str,
        *,
        overwrite: bool = True,
    ) -> bool:
        upload_url = await self._get_upload_url(client, file_path, overwrite=overwrite)
        if not upload_url:
            return False

        upload_resp = await client.put(
            upload_url,
            content=content.encode("utf-8"),
            headers={"Content-Type": "text/plain; charset=utf-8"},
        )
        return upload_resp.status_code in (201, 202)

    async def _upload_binary_file(
        self,
        client: httpx.AsyncClient,
        file_path: str,
        file_bytes: bytes,
    ) -> bool:
        upload_url = await self._get_upload_url(client, file_path, overwrite=True)
        if not upload_url:
            return False

        upload_resp = await client.put(
            upload_url,
            content=file_bytes,
            headers={"Content-Type": "application/octet-stream"},
        )
        return upload_resp.status_code in (201, 202)

    async def _upload_files_to_folder(
        self,
        client: httpx.AsyncClient,
        folder_path: str,
        files: list[tuple[bytes, str]],
    ) -> tuple[int, list[str]]:
        uploaded_count = 0
        uploaded_paths: list[str] = []

        for file_bytes, filename in files:
            safe_filename = sanitize_filename(filename)
            file_path = f"{folder_path}/{safe_filename}"
            if not await self._upload_binary_file(client, file_path, file_bytes):
                continue
            uploaded_count += 1
            uploaded_paths.append(file_path)

        return uploaded_count, uploaded_paths

    async def _ensure_order_workspace(
        self,
        client: httpx.AsyncClient,
        *,
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: Optional[int],
        client_username: Optional[str] = None,
        order_meta: Optional[dict[str, Any]] = None,
    ) -> Optional[str]:
        order_folder = self._get_order_folder_path(
            order_id=order_id,
            client_name=client_name,
            work_type=work_type,
            telegram_id=telegram_id,
            order_meta=order_meta,
            client_username=client_username,
        )

        if telegram_id:
            client_folder = self._get_client_folder_path(
                client_name,
                telegram_id,
                client_username=client_username,
            )
            folders = [
                client_folder,
                f"{client_folder}/{CLIENT_ORDERS_FOLDER}",
            ]
        else:
            folders = [f"/{self._root_folder}/{CLIENT_ORDERS_FOLDER}"]

        folders.extend(
            [
                order_folder,
                f"{order_folder}/{ORDER_SECTION_CLIENT_FILES}",
                f"{order_folder}/{ORDER_SECTION_APPENDS}",
                f"{order_folder}/{ORDER_SECTION_CHAT}",
                f"{order_folder}/{ORDER_SECTION_CHAT_ATTACHMENTS}",
                f"{order_folder}/{ORDER_SECTION_DELIVERABLES}",
            ]
        )

        for folder in folders:
            if not await self._ensure_folder_exists(client, folder):
                return None

        if telegram_id:
            client_folder = self._get_client_folder_path(
                client_name,
                telegram_id,
                client_username=client_username,
            )
            await self._upload_text_file(
                client,
                f"{client_folder}/{CLIENT_METADATA_FILE}",
                self._build_client_metadata(
                    client_name=client_name,
                    telegram_id=telegram_id,
                    client_username=client_username,
                ),
            )

        await self._upload_text_file(
            client,
            f"{order_folder}/{ORDER_METADATA_FILE}",
            self._build_order_metadata(
                order_id=order_id,
                client_name=client_name,
                work_type=work_type,
                telegram_id=telegram_id,
                client_username=client_username,
                order_meta=order_meta,
            ),
        )

        return order_folder

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

            if response.status_code not in (200, 201, 202, 409):
                logger.warning(f"Failed to publish folder: {response.text}")
                return None

            retry_delays = (0.0, 0.4, 0.8, 1.2, 2.0, 3.0)
            for delay in retry_delays:
                if delay > 0:
                    await asyncio.sleep(delay)

                meta_resp = await client.get(
                    f"{YADISK_API_BASE}/resources",
                    params={"path": path},
                    headers=self._get_headers(),
                )

                if meta_resp.status_code != 200:
                    continue

                public_url = meta_resp.json().get("public_url")
                if public_url:
                    return public_url

            logger.warning(f"Folder published but public URL is not ready yet: {path}")

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
        telegram_id: Optional[int] = None,
        client_username: Optional[str] = None,
        order_meta: Optional[dict[str, Any]] = None,
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
                order_folder = await self._ensure_order_workspace(
                    client,
                    order_id=order_id,
                    client_name=client_name,
                    work_type=work_type,
                    telegram_id=telegram_id,
                    client_username=client_username,
                    order_meta=order_meta,
                )
                if not order_folder:
                    return UploadResult(success=False, error="Failed to create folder")

                folder_path = f"{order_folder}/{ORDER_SECTION_CLIENT_FILES}"

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
                    uploaded_count=1,
                    total_count=1,
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
        telegram_id: Optional[int] = None,
        client_username: Optional[str] = None,
        order_meta: Optional[dict[str, Any]] = None,
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
                order_folder = await self._ensure_order_workspace(
                    client,
                    order_id=order_id,
                    client_name=client_name,
                    work_type=work_type,
                    telegram_id=telegram_id,
                    client_username=client_username,
                    order_meta=order_meta,
                )
                if not order_folder:
                    return UploadResult(success=False, error="Failed to create folder")
                folder_path = f"{order_folder}/{ORDER_SECTION_CLIENT_FILES}"

                uploaded_count, _uploaded_paths = await self._upload_files_to_folder(client, folder_path, files)

                if uploaded_count == 0:
                    return UploadResult(
                        success=False,
                        error="No files were uploaded",
                        uploaded_count=0,
                        total_count=len(files),
                    )

                # Публикуем папку
                public_url = await self._publish_folder(client, order_folder)

                logger.info(f"Uploaded {uploaded_count}/{len(files)} files to {folder_path}")

                return UploadResult(
                    success=True,
                    public_url=public_url,
                    folder_url=public_url,
                    uploaded_count=uploaded_count,
                    total_count=len(files),
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
        telegram_id: Optional[int] = None,
        client_username: Optional[str] = None,
        order_meta: Optional[dict[str, Any]] = None,
    ) -> UploadResult:
        """
        Загружает досланные файлы в подпапку с датой внутри секции досыла.

        Структура: .../Заказ_123_.../02_Дослано_позже/2025-12-02_14-30__досыл_материалов/

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
                order_folder = await self._ensure_order_workspace(
                    client,
                    order_id=order_id,
                    client_name=client_name,
                    work_type=work_type,
                    telegram_id=telegram_id,
                    client_username=client_username,
                    order_meta=order_meta,
                )
                if not order_folder:
                    return UploadResult(success=False, error="Failed to create append folder")

                # Подпапка для дополнительных файлов с датой/временем
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
                append_folder = (
                    f"{order_folder}/{ORDER_SECTION_APPENDS}/{timestamp}__досыл_материалов"
                )

                # Создаём подпапку
                if not await self._ensure_folder_exists(client, append_folder):
                    return UploadResult(success=False, error="Failed to create append folder")

                uploaded_count, _uploaded_paths = await self._upload_files_to_folder(client, append_folder, files)

                if uploaded_count == 0:
                    return UploadResult(
                        success=False,
                        error="No append files were uploaded",
                        uploaded_count=0,
                        total_count=len(files),
                    )

                # Публикуем папку заказа (не подпапку)
                public_url = await self._publish_folder(client, order_folder)

                logger.info(f"Uploaded {uploaded_count}/{len(files)} append files to {append_folder}")

                return UploadResult(
                    success=True,
                    public_url=public_url,
                    folder_url=public_url,
                    uploaded_count=uploaded_count,
                    total_count=len(files),
                )

        except Exception as e:
            logger.error(f"Error uploading append files to Yandex Disk: {e}")
            return UploadResult(success=False, error=str(e))

    async def upload_deliverable_files(
        self,
        files: list[tuple[bytes, str]],
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: int | None = None,
        client_username: str | None = None,
        order_meta: dict[str, Any] | None = None,
        delivered_by: str | None = None,
        delivery_note: str | None = None,
        delivered_at: datetime | None = None,
        version_number: int | None = None,
    ) -> UploadResult:
        """
        Загружает итоговые файлы в 04_Готовая_работа отдельной выдачей.

        Структура:
        .../04_Готовая_работа/2026-04-08_16-40__выдача_клиенту/
          - 00_Паспорт_выдачи.txt
          - файл_1
          - файл_2
        """
        if not self._configured:
            return UploadResult(success=False, error="Yandex Disk not configured")

        if not files:
            return UploadResult(success=False, error="No files to upload")

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                order_folder = await self._ensure_order_workspace(
                    client,
                    order_id=order_id,
                    client_name=client_name,
                    work_type=work_type,
                    telegram_id=telegram_id,
                    client_username=client_username,
                    order_meta=order_meta,
                )
                if not order_folder:
                    return UploadResult(success=False, error="Failed to create deliverables folder")

                deliverables_root = f"{order_folder}/{ORDER_SECTION_DELIVERABLES}"
                batch_folder = f"{deliverables_root}/{self._build_deliverable_batch_name(delivered_at=delivered_at, version_number=version_number)}"
                if not await self._ensure_folder_exists(client, batch_folder):
                    return UploadResult(success=False, error="Failed to create deliverable batch folder")

                safe_file_names = [sanitize_filename(filename) for _file_bytes, filename in files]
                await self._upload_text_file(
                    client,
                    f"{batch_folder}/{DELIVERABLE_BATCH_METADATA_FILE}",
                    self._build_deliverable_batch_metadata(
                        order_id=order_id,
                        file_names=safe_file_names,
                        delivered_by=delivered_by,
                        delivery_note=delivery_note,
                        delivered_at=delivered_at,
                        version_number=version_number,
                    ),
                    overwrite=True,
                )

                uploaded_count, uploaded_paths = await self._upload_files_to_folder(client, batch_folder, files)
                if uploaded_count == 0:
                    return UploadResult(
                        success=False,
                        error="No deliverable files were uploaded",
                        uploaded_count=0,
                        total_count=len(files),
                    )

                batch_public_url = await self._publish_folder(client, batch_folder)
                order_public_url = await self._publish_folder(client, order_folder)
                file_public_url = None
                if len(uploaded_paths) == 1:
                    file_public_url = await self._publish_folder(client, uploaded_paths[0])

                return UploadResult(
                    success=True,
                    public_url=file_public_url or batch_public_url or order_public_url,
                    folder_url=order_public_url or batch_public_url,
                    batch_url=batch_public_url,
                    uploaded_count=uploaded_count,
                    total_count=len(files),
                )
        except Exception as e:
            logger.error(f"Error uploading deliverable files to Yandex Disk: {e}")
            return UploadResult(success=False, error=str(e))

    async def get_folder_link(
        self,
        order_id: int,
        client_name: str,
        work_type: str,
        telegram_id: Optional[int] = None,
        client_username: Optional[str] = None,
        order_meta: Optional[dict[str, Any]] = None,
    ) -> Optional[str]:
        """Получает публичную ссылку на папку заказа (если существует)"""
        if not self._configured:
            return None

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                folder_path = self._get_order_folder_path(
                    order_id=order_id,
                    client_name=client_name,
                    work_type=work_type,
                    telegram_id=telegram_id,
                    order_meta=order_meta,
                    client_username=client_username,
                )

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
        work_type: str = "",
        client_username: Optional[str] = None,
        order_meta: Optional[dict[str, Any]] = None,
    ) -> UploadResult:
        """
        Загружает файл из чата на Яндекс Диск.

        Структура: .../Заказ_123/03_Диалог_и_комментарии/Вложения/timestamp_filename

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
                order_folder = await self._ensure_order_workspace(
                    client,
                    order_id=order_id,
                    client_name=client_name,
                    work_type=work_type,
                    telegram_id=telegram_id,
                    client_username=client_username,
                    order_meta=order_meta,
                )
                if not order_folder:
                    return UploadResult(success=False, error="Failed to create chat folder")
                chat_folder = f"{order_folder}/{ORDER_SECTION_CHAT_ATTACHMENTS}"

                # Путь к файлу с timestamp для уникальности
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
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

                # Публикуем и сам файл, и корневую папку заказа.
                public_url = await self._publish_folder(client, file_path)
                folder_url = await self._publish_folder(client, order_folder)

                logger.info(f"Chat file uploaded: {file_path}")

                return UploadResult(
                    success=True,
                    public_url=public_url,
                    folder_url=folder_url,
                )

        except Exception as e:
            logger.error(f"Error uploading chat file to Yandex Disk: {e}")
            return UploadResult(success=False, error=str(e))

    async def upload_chat_history(
        self,
        chat_text: str,
        order_id: int,
        client_name: str,
        telegram_id: int,
        work_type: str = "",
        client_username: Optional[str] = None,
        order_meta: Optional[dict[str, Any]] = None,
    ) -> bool:
        if not self._configured:
            return False

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                order_folder = await self._ensure_order_workspace(
                    client,
                    order_id=order_id,
                    client_name=client_name,
                    work_type=work_type,
                    telegram_id=telegram_id,
                    client_username=client_username,
                    order_meta=order_meta,
                )
                if not order_folder:
                    return False

                file_path = f"{order_folder}/{ORDER_SECTION_CHAT}/{CHAT_HISTORY_FILENAME}"
                uploaded = await self._upload_text_file(client, file_path, chat_text, overwrite=True)
                if uploaded:
                    await self._publish_folder(client, order_folder)
                    logger.info(f"Chat history backed up: {file_path}")
                return uploaded
        except Exception as e:
            logger.error(f"Error uploading chat history to Yandex Disk: {e}")
            return False


# Singleton instance
yandex_disk_service = YandexDiskService()

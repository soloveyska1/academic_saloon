from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from bot.services.yandex_disk import (
    ORDER_SECTION_APPENDS,
    ORDER_SECTION_CHAT_ATTACHMENTS,
    ORDER_SECTION_CLIENT_FILES,
    ORDER_SECTION_DELIVERABLES,
    YandexDiskService,
)
from database.models.orders import Order, OrderStatus


def make_order() -> Order:
    order = Order(
        user_id=777001,
        work_type="coursework",
        subject="Эконометрика",
        topic="Панельные данные и регрессия",
        deadline="15 апреля 2026",
        status=OrderStatus.IN_PROGRESS.value,
        price=Decimal("12900"),
        paid_amount=Decimal("5000"),
    )
    order.id = 55
    order.created_at = datetime(2026, 4, 8, 14, 35)
    return order


def test_yandex_disk_service_builds_stable_client_order_paths():
    service = YandexDiskService()
    order = make_order()
    order_meta = service.build_order_meta(order)

    client_folder = service._get_client_folder_path("Иван Петров", 777001)
    assert client_folder.endswith("/Клиенты/Клиент__Иван Петров__tg_777001")

    order_folder = service._get_order_folder_path(
        order_id=order.id,
        client_name="Иван Петров",
        work_type=order.work_type,
        telegram_id=order.user_id,
        order_meta=order_meta,
    )
    assert order_folder.endswith("/Заказы/Заказ_55__2026-04-08")

    chat_attachments = service._get_order_section_path(
        order_id=order.id,
        client_name="Иван Петров",
        work_type=order.work_type,
        section_name=ORDER_SECTION_CHAT_ATTACHMENTS,
        telegram_id=order.user_id,
        order_meta=order_meta,
    )
    assert chat_attachments.endswith("/03_Диалог_и_комментарии/Вложения")


def test_yandex_disk_service_builds_readable_metadata_passports():
    service = YandexDiskService()
    order = make_order()
    order_meta = service.build_order_meta(order)

    client_passport = service._build_client_metadata(
        client_name="Иван Петров",
        telegram_id=777001,
        client_username="petrov",
    )
    assert "Academic Saloon — паспорт клиента" in client_passport
    assert "Клиент: Иван Петров" in client_passport
    assert "Telegram ID: 777001" in client_passport
    assert "Username: @petrov" in client_passport

    order_passport = service._build_order_metadata(
        order_id=order.id,
        client_name="Иван Петров",
        work_type="Курсовая",
        telegram_id=order.user_id,
        client_username="petrov",
        order_meta=order_meta,
    )
    assert "Academic Saloon — паспорт заказа" in order_passport
    assert "Заказ: #55" in order_passport
    assert "Статус: in_progress" in order_passport
    assert "Предмет: Эконометрика" in order_passport
    assert "Тема: Панельные данные и регрессия" in order_passport
    assert "Базовая цена: 12900 ₽" in order_passport
    assert "Итоговая цена: 12900 ₽" in order_passport
    assert "Оплачено: 5000 ₽" in order_passport
    assert ORDER_SECTION_CLIENT_FILES in order_passport
    assert ORDER_SECTION_APPENDS in order_passport
    assert ORDER_SECTION_DELIVERABLES in order_passport


def test_yandex_disk_service_builds_deliverable_batch_metadata():
    service = YandexDiskService()
    delivered_at = datetime(2026, 4, 8, 16, 40)

    batch_name = service._build_deliverable_batch_name(delivered_at=delivered_at)
    assert batch_name == "2026-04-08_16-40__выдача_клиенту"

    batch_passport = service._build_deliverable_batch_metadata(
        order_id=55,
        file_names=["essay-final.docx", "appendix.pdf"],
        delivered_by="admin:999",
        delivery_note="Финальная версия + приложения",
        delivered_at=delivered_at,
    )

    assert "Academic Saloon — паспорт выдачи" in batch_passport
    assert "Заказ: #55" in batch_passport
    assert "Выдано клиенту: 08.04.2026 16:40" in batch_passport
    assert "Отправил: admin:999" in batch_passport
    assert "Комментарий:" in batch_passport
    assert "Финальная версия + приложения" in batch_passport
    assert "- essay-final.docx" in batch_passport
    assert "- appendix.pdf" in batch_passport

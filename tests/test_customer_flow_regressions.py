from __future__ import annotations

import io
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import UploadFile
from pydantic import ValidationError

from bot.api.auth import TelegramUser
from bot.api.routers.chat import (
    _build_chat_preview,
    _sync_client_conversation,
    send_order_message,
    upload_chat_file,
    upload_voice_message,
)
from bot.api.routers.orders import (
    confirm_batch_payment,
    confirm_payment,
    get_batch_payment_info,
    request_revision,
    upload_order_files,
)
from bot.api.schemas import (
    BatchPaymentConfirmRequest,
    BatchPaymentInfoRequest,
    PaymentConfirmRequest,
    RevisionRequestData,
    SendMessageRequest,
    SubmitReviewRequest,
)
from bot.handlers.admin import forward_file_to_user, send_message_to_user
from bot.handlers.order_chat import (
    admin_message_from_topic,
    build_topic_history_text,
    build_topic_summary_payload,
    cmd_complete_in_topic,
    cmd_folder_in_topic,
    cmd_history_in_topic,
    cmd_note_in_topic,
    cmd_paid_in_topic,
    cmd_pay_in_topic,
    cmd_price_in_topic,
    cmd_review_in_topic,
    cmd_send_template,
    refresh_topic_header,
    topic_action_callback,
    topic_set_price_callback,
)
from bot.services.order_delivery_service import (
    DeliveryDispatchOptions,
    _sync_delivery_conversation,
    dispatch_order_delivery_event,
    send_order_delivery_batch,
)
from bot.services.order_message_formatter import (
    build_admin_topic_header_keyboard,
    build_admin_topic_header_text,
)
from core.config import settings
from database.models.admin_logs import AdminActionLog, AdminActionType
from database.models.order_events import OrderLifecycleEvent, OrderLifecycleEventType
from database.models.orders import (
    Conversation,
    ConversationType,
    Order,
    OrderDeliveryBatch,
    OrderDeliveryBatchStatus,
    OrderMessage,
    OrderRevisionRound,
    OrderRevisionRoundStatus,
    OrderStatus,
)
from database.models.users import User


class FakeExecuteResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalars(self):
        return self

    def all(self):
        if self.value is None:
            return []
        if isinstance(self.value, list):
            return list(self.value)
        if isinstance(self.value, tuple):
            return list(self.value)
        return [self.value]


class FakeSession:
    def __init__(self, *responses):
        self._responses = list(responses)
        self.added: list[object] = []
        self.commit_calls = 0
        self._next_id = 4000

    async def execute(self, _query):
        if not self._responses:
            return FakeExecuteResult(None)
        return FakeExecuteResult(self._responses.pop(0))

    def add(self, value):
        if getattr(value, "id", None) is None:
            value.id = self._next_id
            self._next_id += 1
        self.added.append(value)

    async def commit(self):
        self.commit_calls += 1

    async def flush(self):
        return None


class FakeUploadSession:
    def __init__(self, current_user: User, order: Order, order_owner: User):
        self.current_user = current_user
        self.order = order
        self.order_owner = order_owner
        self.commit_calls = 0

    async def execute(self, _query):
        if self.current_user is not None:
            value = self.current_user
            self.current_user = None
            return FakeExecuteResult(value)
        if self.order_owner is not None:
            value = self.order_owner
            self.order_owner = None
            return FakeExecuteResult(value)
        raise AssertionError("Unexpected execute() call")

    async def get(self, _model, order_id):
        if self.order.id == order_id:
            return self.order
        return None

    async def commit(self):
        self.commit_calls += 1


class FakeForwardSession:
    def __init__(self, order: Order, order_owner: User | None):
        self.order = order
        self.order_owner = order_owner
        self.commit_calls = 0
        self.added: list[object] = []

    async def execute(self, _query):
        if self.order is not None:
            value = self.order
            self.order = None
            return FakeExecuteResult(value)
        if self.order_owner is not None:
            value = self.order_owner
            self.order_owner = None
            return FakeExecuteResult(value)
        raise AssertionError("Unexpected execute() call")

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commit_calls += 1


class FakeTopicCommandSession:
    def __init__(self, conv: Conversation | None, order: Order | None, user: User | None):
        self.conv = conv
        self.order = order
        self.user = user
        self.commit_calls = 0
        self.added: list[object] = []

    async def execute(self, _query):
        if self.conv is not None:
            value = self.conv
            self.conv = None
            return FakeExecuteResult(value)
        if self.user is not None:
            value = self.user
            self.user = None
            return FakeExecuteResult(value)
        return FakeExecuteResult([])

    async def get(self, _model, order_id):
        if self.order and self.order.id == order_id:
            return self.order
        return None

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commit_calls += 1


class FakeChatRouteSession:
    def __init__(self, order: Order, user: User | None):
        self.order = order
        self.user = user
        self.commit_calls = 0
        self.added: list[object] = []
        self._next_id = 8000

    async def execute(self, _query):
        return FakeExecuteResult(self.user)

    async def get(self, _model, order_id):
        if self.order and self.order.id == order_id:
            return self.order
        return None

    def add(self, value):
        if getattr(value, "id", None) is None:
            value.id = self._next_id
            self._next_id += 1
        self.added.append(value)

    async def commit(self):
        self.commit_calls += 1

    async def refresh(self, _value):
        return None


class FakeBot:
    def __init__(self):
        self.sent_messages: list[dict[str, object]] = []
        self.copy_calls: list[dict[str, object]] = []
        self.sent_documents: list[dict[str, object]] = []
        self.sent_voices: list[dict[str, object]] = []
        self.sent_photos: list[dict[str, object]] = []
        self.sent_videos: list[dict[str, object]] = []
        self.edited_messages: list[dict[str, object]] = []

    async def send_message(self, chat_id, text, **kwargs):
        self.sent_messages.append(
            {
                "chat_id": chat_id,
                "text": text,
                **kwargs,
            }
        )
        return SimpleNamespace(message_id=7000 + len(self.sent_messages))

    async def edit_message_text(self, chat_id, message_id, text, **kwargs):
        self.edited_messages.append(
            {
                "chat_id": chat_id,
                "message_id": message_id,
                "text": text,
                **kwargs,
            }
        )
        return True

    async def copy_message(self, chat_id, from_chat_id, message_id, **kwargs):
        self.copy_calls.append(
            {
                "chat_id": chat_id,
                "from_chat_id": from_chat_id,
                "message_id": message_id,
                **kwargs,
            }
        )

    async def send_document(self, chat_id, document, **kwargs):
        self.sent_documents.append(
            {
                "chat_id": chat_id,
                "document": document,
                **kwargs,
            }
        )
        return SimpleNamespace(message_id=9001)

    async def send_voice(self, chat_id, voice, **kwargs):
        self.sent_voices.append(
            {
                "chat_id": chat_id,
                "voice": voice,
                **kwargs,
            }
        )
        return SimpleNamespace(message_id=9002)

    async def send_photo(self, chat_id, photo, **kwargs):
        self.sent_photos.append(
            {
                "chat_id": chat_id,
                "photo": photo,
                **kwargs,
            }
        )
        return SimpleNamespace(message_id=9003)

    async def send_video(self, chat_id, video, **kwargs):
        self.sent_videos.append(
            {
                "chat_id": chat_id,
                "video": video,
                **kwargs,
            }
        )
        return SimpleNamespace(message_id=9004)

    async def get_file(self, _file_id):
        return SimpleNamespace(file_path="documents/final.docx")

    async def download_file(self, _file_path):
        return io.BytesIO(b"final-file")


def make_user(*, telegram_id: int = 101, username: str = "client", fullname: str = "Client User") -> User:
    return User(
        telegram_id=telegram_id,
        username=username,
        fullname=fullname,
    )


def make_order(
    *,
    order_id: int = 1,
    user_id: int = 101,
    status: str = OrderStatus.WAITING_PAYMENT.value,
    final_price: float = 1000.0,
    paid_amount: float = 0.0,
    revision_count: int = 0,
) -> Order:
    order = Order(
        user_id=user_id,
        work_type="essay",
        subject="Тестовая тема",
        status=status,
        price=Decimal(str(final_price)),
        paid_amount=Decimal(str(paid_amount)),
        revision_count=revision_count,
    )
    order.id = order_id
    return order


def test_customer_request_schemas_normalize_and_validate():
    payment = PaymentConfirmRequest(payment_method=" SBP ", payment_scheme=" FULL ")
    assert payment.payment_method == "sbp"
    assert payment.payment_scheme == "full"

    message = SendMessageRequest(text="  привет менеджеру  ")
    assert message.text == "привет менеджеру"

    review = SubmitReviewRequest(rating=5, text="  Отличная работа, всё приняли!  ")
    assert review.text == "Отличная работа, всё приняли!"

    revision = RevisionRequestData(message="  Добавьте список литературы  ")
    assert revision.message == "Добавьте список литературы"


def test_customer_request_schemas_reject_invalid_values():
    with pytest.raises(ValidationError):
        PaymentConfirmRequest(payment_method="cash", payment_scheme="half")

    with pytest.raises(ValidationError):
        SendMessageRequest(text="   ")

    with pytest.raises(ValidationError):
        SubmitReviewRequest(rating=6, text="Отличная работа")

    with pytest.raises(ValidationError):
        SubmitReviewRequest(rating=5, text="коротко")

    with pytest.raises(ValidationError):
        RevisionRequestData(message="")


@pytest.mark.asyncio
async def test_sync_client_conversation_updates_preview_and_unread(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=77,
        conversation_type=ConversationType.ORDER_CHAT.value,
    )
    order = make_order(order_id=77, user_id=conv.user_id)
    user = make_user(telegram_id=conv.user_id)
    calls: dict[str, object] = {}

    async def fake_get_or_create_topic(bot, session, user_id, order_id, conv_type):
        calls["topic_args"] = (bot, session, user_id, order_id, conv_type)
        return conv, 555

    async def fake_update_conversation(session, conv, last_message, sender, increment_unread=False):
        calls["update_args"] = (session, conv, last_message, sender, increment_unread)

    async def fake_maybe_refresh_topic_header(*args, **kwargs):
        calls["refresh"] = (args, kwargs)

    monkeypatch.setattr("bot.handlers.order_chat.get_or_create_topic", fake_get_or_create_topic)
    monkeypatch.setattr("bot.handlers.order_chat.update_conversation", fake_update_conversation)
    monkeypatch.setattr("bot.handlers.order_chat.maybe_refresh_topic_header", fake_maybe_refresh_topic_header)

    session = FakeTopicCommandSession(conv, order, user)
    bot = object()
    topic_id = await _sync_client_conversation(
        session=session,
        bot=bot,
        user_id=101,
        order_id=77,
        conv_type=ConversationType.ORDER_CHAT.value,
        preview_text=_build_chat_preview(text="Привет, есть вопрос"),
        order=order,
        user=user,
    )

    assert topic_id == 555
    assert calls["topic_args"] == (bot, session, 101, 77, ConversationType.ORDER_CHAT.value)
    assert calls["update_args"] == (
        session,
        conv,
        "Привет, есть вопрос",
        "client",
        True,
    )


@pytest.mark.asyncio
async def test_sync_client_conversation_refreshes_topic_header_for_order_chat(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=77,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=444,
    )
    order = make_order(order_id=77, user_id=conv.user_id, status=OrderStatus.REVISION.value)
    user = make_user(telegram_id=conv.user_id)
    calls: dict[str, object] = {}

    async def fake_get_or_create_topic(bot, session, user_id, order_id, conv_type):
        return conv, 444

    async def fake_update_conversation(session, conv, last_message, sender, increment_unread=False):
        calls["update_args"] = (session, conv, last_message, sender, increment_unread)

    async def fake_maybe_refresh_topic_header(bot, session, conv, order, user):
        calls["refresh_args"] = (bot, session, conv, order, user)

    monkeypatch.setattr("bot.handlers.order_chat.get_or_create_topic", fake_get_or_create_topic)
    monkeypatch.setattr("bot.handlers.order_chat.update_conversation", fake_update_conversation)
    monkeypatch.setattr("bot.handlers.order_chat.maybe_refresh_topic_header", fake_maybe_refresh_topic_header)

    session = object()
    bot = object()
    topic_id = await _sync_client_conversation(
        session=session,
        bot=bot,
        user_id=101,
        order_id=77,
        conv_type=ConversationType.ORDER_CHAT.value,
        preview_text="📝 Клиент дополнил правку",
        order=order,
        user=user,
    )

    assert topic_id == 444
    assert calls["refresh_args"] == (bot, session, conv, order, user)


@pytest.mark.asyncio
async def test_confirm_payment_uses_finalize_layer(monkeypatch):
    user = make_user()
    order = make_order(order_id=7)
    session = FakeSession(user, order)
    bot = FakeBot()
    finalize_calls: list[dict[str, object]] = []

    async def fake_finalize(session, bot, order, change, *, dispatch):
        finalize_calls.append(
            {
                "session": session,
                "bot": bot,
                "order": order,
                "change": change,
                "dispatch": dispatch,
            }
        )
        return change

    async def fake_notify_admin_payment_pending(**kwargs):
        finalize_calls.append({"admin_pending": kwargs})

    async def fake_send_admin_payment_pending_alert(**kwargs):
        finalize_calls.append({"admin_alert": kwargs})

    async def fake_log_mini_app_event(**kwargs):
        finalize_calls.append({"mini_app_event": kwargs})

    monkeypatch.setattr("bot.api.routers.orders.finalize_order_status_change", fake_finalize)
    monkeypatch.setattr("bot.api.routers.orders.get_bot", lambda: bot)
    monkeypatch.setattr("bot.api.websocket.notify_admin_payment_pending", fake_notify_admin_payment_pending)
    monkeypatch.setattr(
        "bot.services.admin_payment_notifications.send_admin_payment_pending_alert",
        fake_send_admin_payment_pending_alert,
    )
    monkeypatch.setattr("bot.api.routers.orders.log_mini_app_event", fake_log_mini_app_event)

    response = await confirm_payment(
        None,
        order.id,
        PaymentConfirmRequest(payment_method="card", payment_scheme="half"),
        tg_user=TelegramUser(id=user.telegram_id, first_name="Client", username=user.username),
        session=session,
    )

    assert response.success is True
    assert response.new_status == OrderStatus.VERIFICATION_PENDING.value
    assert response.amount_to_pay == 500.0
    assert finalize_calls[0]["dispatch"].update_live_card is True
    assert finalize_calls[0]["dispatch"].notification_extra_data == {
        "payment_method": "card",
        "payment_scheme": "half",
        "payment_phase": "initial",
        "amount_to_pay": 500.0,
    }
    assert "Ожидает проверки" in finalize_calls[0]["dispatch"].card_extra_text
    assert bot.sent_messages[0]["chat_id"] == user.telegram_id


@pytest.mark.asyncio
async def test_upload_order_files_uses_order_owner_for_storage(monkeypatch):
    admin_user = make_user(
        telegram_id=settings.ADMIN_IDS[0],
        username="admin",
        fullname="Admin User",
    )
    order_owner = make_user(telegram_id=101, username="client", fullname="Client User")
    order = make_order(order_id=18, user_id=order_owner.telegram_id)
    session = FakeUploadSession(admin_user, order, order_owner)
    delivery_calls: list[dict[str, object]] = []

    class FakeYandexDiskService:
        is_available = True

        def build_order_meta(self, current_order):
            return {"status": current_order.status}
    async def fake_send_order_delivery_batch(session, bot, current_order, *, user, source, sent_by_admin_id, binary_files, manager_comment=None, batch=None):
        delivery_calls.append(
            {
                "session": session,
                "bot": bot,
                "order": current_order,
                "user": user,
                "source": source,
                "sent_by_admin_id": sent_by_admin_id,
                "binary_files": binary_files,
                "manager_comment": manager_comment,
                "batch": batch,
            }
        )
        current_order.files_url = "https://disk.example/order-18/v1"
        return SimpleNamespace(
            batch=SimpleNamespace(version_number=1, file_count=1, files_url="https://disk.example/order-18/v1"),
            review_status_changed=True,
            summary_message="sent",
        )

    monkeypatch.setattr("bot.api.routers.orders.yandex_disk_service", FakeYandexDiskService())
    monkeypatch.setattr("bot.api.routers.orders.get_bot", lambda: object())
    monkeypatch.setattr("bot.api.routers.orders.send_order_delivery_batch", fake_send_order_delivery_batch)

    response = await upload_order_files(
        order.id,
        files=[UploadFile(file=io.BytesIO(b"pdf-bytes"), filename="brief.pdf")],
        tg_user=TelegramUser(id=admin_user.telegram_id, first_name="Admin", username=admin_user.username),
        session=session,
    )

    assert response.success is True
    assert delivery_calls[0]["user"].telegram_id == order_owner.telegram_id
    assert delivery_calls[0]["user"].fullname == "Client User"
    assert delivery_calls[0]["source"] == "api_admin_upload"
    assert delivery_calls[0]["sent_by_admin_id"] == admin_user.telegram_id
    assert delivery_calls[0]["binary_files"][0][1] == "brief.pdf"
    assert order.files_url == "https://disk.example/order-18/v1"
    assert response.files_url == "https://disk.example/order-18/v1"
    assert "Версия 1 отправлена клиенту" in response.message


@pytest.mark.asyncio
async def test_send_order_message_binds_open_revision_round(monkeypatch):
    order = make_order(order_id=170, status=OrderStatus.REVISION.value, revision_count=2)
    user = make_user(telegram_id=order.user_id)
    tg_user = TelegramUser(id=order.user_id, first_name="Client", username=user.username)
    session = FakeChatRouteSession(order, user)
    revision_round = OrderRevisionRound(
        id=501,
        order_id=order.id,
        round_number=2,
        status=OrderRevisionRoundStatus.OPEN.value,
    )

    async def fake_bind_client_revision_round(**kwargs):
        return revision_round

    async def fake_backup_order_chat_history(**kwargs):
        return None

    async def fake_sync_client_conversation(**kwargs):
        return None

    monkeypatch.setattr("bot.api.routers.chat._bind_client_revision_round", fake_bind_client_revision_round)
    monkeypatch.setattr("bot.api.routers.chat._backup_order_chat_history", fake_backup_order_chat_history)
    monkeypatch.setattr("bot.api.routers.chat._sync_client_conversation", fake_sync_client_conversation)
    monkeypatch.setattr("bot.api.routers.chat.get_bot", lambda: object())

    response = await send_order_message(
        order_id=order.id,
        data=SendMessageRequest(text="Ниже отправлю уточнения по правке."),
        tg_user=tg_user,
        session=session,
    )

    assert response.success is True
    assert session.added[0].revision_round_id == revision_round.id
    assert session.added[0].message_text == "Ниже отправлю уточнения по правке."


@pytest.mark.asyncio
async def test_send_order_message_forwards_revision_label_to_topic(monkeypatch):
    order = make_order(order_id=173, status=OrderStatus.REVISION.value, revision_count=2)
    user = make_user(telegram_id=order.user_id)
    tg_user = TelegramUser(id=order.user_id, first_name="Client", username=user.username)
    session = FakeChatRouteSession(order, user)
    bot = FakeBot()
    revision_round = OrderRevisionRound(
        id=801,
        order_id=order.id,
        round_number=2,
        status=OrderRevisionRoundStatus.OPEN.value,
    )

    async def fake_bind_client_revision_round(**kwargs):
        return revision_round

    async def fake_backup_order_chat_history(**kwargs):
        return None

    async def fake_sync_client_conversation(**kwargs):
        return 444

    monkeypatch.setattr("bot.api.routers.chat._bind_client_revision_round", fake_bind_client_revision_round)
    monkeypatch.setattr("bot.api.routers.chat._backup_order_chat_history", fake_backup_order_chat_history)
    monkeypatch.setattr("bot.api.routers.chat._sync_client_conversation", fake_sync_client_conversation)
    monkeypatch.setattr("bot.api.routers.chat.get_bot", lambda: bot)

    response = await send_order_message(
        order_id=order.id,
        data=SendMessageRequest(text="Исправьте формулировку вывода."),
        tg_user=tg_user,
        session=session,
    )

    assert response.success is True
    assert "✏️ Правка #2" in bot.sent_messages[0]["text"]
    assert "Исправьте формулировку вывода." in bot.sent_messages[0]["text"]


@pytest.mark.asyncio
async def test_upload_chat_file_binds_open_revision_round(monkeypatch):
    order = make_order(order_id=171, status=OrderStatus.REVISION.value, revision_count=2)
    user = make_user(telegram_id=order.user_id)
    tg_user = TelegramUser(id=order.user_id, first_name="Client", username=user.username)
    session = FakeChatRouteSession(order, user)
    revision_round = OrderRevisionRound(
        id=601,
        order_id=order.id,
        round_number=2,
        status=OrderRevisionRoundStatus.OPEN.value,
    )

    async def fake_bind_client_revision_round(**kwargs):
        return revision_round

    async def fake_backup_order_chat_history(**kwargs):
        return None

    async def fake_sync_client_conversation(**kwargs):
        return None

    monkeypatch.setattr("bot.api.routers.chat._bind_client_revision_round", fake_bind_client_revision_round)
    monkeypatch.setattr("bot.api.routers.chat._backup_order_chat_history", fake_backup_order_chat_history)
    monkeypatch.setattr("bot.api.routers.chat._sync_client_conversation", fake_sync_client_conversation)
    monkeypatch.setattr("bot.api.routers.chat.yandex_disk_service", SimpleNamespace(is_available=False))
    monkeypatch.setattr("bot.api.routers.chat.get_bot", lambda: object())

    response = await upload_chat_file(
        order_id=order.id,
        file=UploadFile(file=io.BytesIO(b"notes"), filename="revision-notes.pdf"),
        tg_user=tg_user,
        session=session,
    )

    assert response.success is True
    assert session.added[0].revision_round_id == revision_round.id
    assert session.added[0].file_name == "revision-notes.pdf"
    assert session.added[0].file_type == "document"


@pytest.mark.asyncio
async def test_upload_chat_file_forwards_revision_label_to_topic(monkeypatch):
    order = make_order(order_id=174, status=OrderStatus.REVISION.value, revision_count=2)
    user = make_user(telegram_id=order.user_id)
    tg_user = TelegramUser(id=order.user_id, first_name="Client", username=user.username)
    session = FakeChatRouteSession(order, user)
    bot = FakeBot()
    revision_round = OrderRevisionRound(
        id=901,
        order_id=order.id,
        round_number=2,
        status=OrderRevisionRoundStatus.OPEN.value,
    )

    async def fake_bind_client_revision_round(**kwargs):
        return revision_round

    async def fake_backup_order_chat_history(**kwargs):
        return None

    async def fake_sync_client_conversation(**kwargs):
        return 444

    monkeypatch.setattr("bot.api.routers.chat._bind_client_revision_round", fake_bind_client_revision_round)
    monkeypatch.setattr("bot.api.routers.chat._backup_order_chat_history", fake_backup_order_chat_history)
    monkeypatch.setattr("bot.api.routers.chat._sync_client_conversation", fake_sync_client_conversation)
    monkeypatch.setattr("bot.api.routers.chat.yandex_disk_service", SimpleNamespace(is_available=False))
    monkeypatch.setattr("bot.api.routers.chat.get_bot", lambda: bot)

    response = await upload_chat_file(
        order_id=order.id,
        file=UploadFile(file=io.BytesIO(b"notes"), filename="revision-notes.pdf"),
        tg_user=tg_user,
        session=session,
    )

    assert response.success is True
    assert "✏️ Правка #2" in bot.sent_documents[0]["caption"]
    assert "revision-notes.pdf" in bot.sent_documents[0]["caption"]


@pytest.mark.asyncio
async def test_upload_voice_message_binds_open_revision_round(monkeypatch):
    order = make_order(order_id=172, status=OrderStatus.REVISION.value, revision_count=2)
    user = make_user(telegram_id=order.user_id)
    tg_user = TelegramUser(id=order.user_id, first_name="Client", username=user.username)
    session = FakeChatRouteSession(order, user)
    revision_round = OrderRevisionRound(
        id=701,
        order_id=order.id,
        round_number=2,
        status=OrderRevisionRoundStatus.OPEN.value,
    )

    async def fake_bind_client_revision_round(**kwargs):
        return revision_round

    async def fake_backup_order_chat_history(**kwargs):
        return None

    async def fake_sync_client_conversation(**kwargs):
        return None

    monkeypatch.setattr("bot.api.routers.chat._bind_client_revision_round", fake_bind_client_revision_round)
    monkeypatch.setattr("bot.api.routers.chat._backup_order_chat_history", fake_backup_order_chat_history)
    monkeypatch.setattr("bot.api.routers.chat._sync_client_conversation", fake_sync_client_conversation)
    monkeypatch.setattr("bot.api.routers.chat.yandex_disk_service", SimpleNamespace(is_available=False))
    monkeypatch.setattr("bot.api.routers.chat.get_bot", lambda: object())

    response = await upload_voice_message(
        order_id=order.id,
        file=UploadFile(file=io.BytesIO(b"voice"), filename="voice.ogg"),
        tg_user=tg_user,
        session=session,
    )

    assert response.success is True
    assert session.added[0].revision_round_id == revision_round.id
    assert session.added[0].file_type == "voice"


@pytest.mark.asyncio
async def test_upload_voice_message_forwards_revision_label_to_topic(monkeypatch):
    order = make_order(order_id=175, status=OrderStatus.REVISION.value, revision_count=2)
    user = make_user(telegram_id=order.user_id)
    tg_user = TelegramUser(id=order.user_id, first_name="Client", username=user.username)
    session = FakeChatRouteSession(order, user)
    bot = FakeBot()
    revision_round = OrderRevisionRound(
        id=1001,
        order_id=order.id,
        round_number=2,
        status=OrderRevisionRoundStatus.OPEN.value,
    )

    async def fake_bind_client_revision_round(**kwargs):
        return revision_round

    async def fake_backup_order_chat_history(**kwargs):
        return None

    async def fake_sync_client_conversation(**kwargs):
        return 444

    monkeypatch.setattr("bot.api.routers.chat._bind_client_revision_round", fake_bind_client_revision_round)
    monkeypatch.setattr("bot.api.routers.chat._backup_order_chat_history", fake_backup_order_chat_history)
    monkeypatch.setattr("bot.api.routers.chat._sync_client_conversation", fake_sync_client_conversation)
    monkeypatch.setattr("bot.api.routers.chat.yandex_disk_service", SimpleNamespace(is_available=False))
    monkeypatch.setattr("bot.api.routers.chat.get_bot", lambda: bot)

    response = await upload_voice_message(
        order_id=order.id,
        file=UploadFile(file=io.BytesIO(b"voice"), filename="voice.ogg"),
        tg_user=tg_user,
        session=session,
    )

    assert response.success is True
    assert "✏️ Правка #2" in bot.sent_voices[0]["caption"]


@pytest.mark.asyncio
async def test_admin_topic_attachment_is_forwarded_and_saved_as_deliverable(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=55,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=444,
    )
    order = make_order(order_id=55, user_id=conv.user_id)
    order.files_url = "https://disk.example/order-55"

    class FakeTopicSession(FakeSession):
        async def get(self, _model, order_id):
            if order_id == order.id:
                return order
            return None

    session = FakeTopicSession(conv)
    bot = FakeBot()
    draft_calls: list[dict[str, object]] = []
    refresh_calls: list[dict[str, object]] = []

    async def fake_append_topic_delivery_draft(session, order, message, *, source="topic"):
        draft_calls.append(
            {
                "session": session,
                "order": order,
                "message": message,
                "source": source,
            }
        )
        return SimpleNamespace(
            id=701,
            file_count=1,
            manager_comment="Финальная версия",
            file_manifest=[{"file_name": "essay-final.docx"}],
        )

    async def fake_refresh_topic_header(bot, session, conv, order, user):
        refresh_calls.append(
            {
                "bot": bot,
                "session": session,
                "conv": conv,
                "order": order,
                "user": user,
            }
        )
        return 7001

    monkeypatch.setattr("bot.handlers.order_chat.append_topic_delivery_draft", fake_append_topic_delivery_draft)
    monkeypatch.setattr("bot.handlers.order_chat.refresh_topic_header", fake_refresh_topic_header)

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=999, is_bot=False)
            self.text = None
            self.caption = "Финальная версия"
            self.photo = None
            self.document = SimpleNamespace(file_id="doc-1", file_name="essay-final.docx")
            self.video = None
            self.voice = None
            self.audio = None
            self.chat = SimpleNamespace(id=-100123)
            self.message_id = 777
            self.message_thread_id = 444
            self.forum_topic_created = False
            self.forum_topic_edited = False
            self.forum_topic_closed = False
            self.replies: list[dict[str, object]] = []

        async def reply(self, text, **kwargs):
            self.replies.append({"text": text, **kwargs})

    message = FakeTopicMessage()

    await admin_message_from_topic(message, session=session, bot=bot)

    assert bot.copy_calls == []
    assert draft_calls[0]["order"].id == conv.order_id
    assert draft_calls[0]["source"] == "topic"
    assert refresh_calls[0]["conv"].order_id == conv.order_id
    assert "Черновик выдачи по заказу #55" in message.replies[0]["text"]
    assert message.replies[0]["reply_markup"] is not None


@pytest.mark.asyncio
async def test_send_order_delivery_batch_closes_current_revision_round(monkeypatch):
    order = make_order(order_id=156, status=OrderStatus.REVISION.value, revision_count=3)
    user = make_user(telegram_id=order.user_id)
    session = FakeTopicCommandSession(None, order, None)
    bot = FakeBot()
    batch = OrderDeliveryBatch(
        id=901,
        order_id=order.id,
        status=OrderDeliveryBatchStatus.DRAFT.value,
        revision_count_snapshot=3,
        file_count=1,
        file_manifest=[
            {
                "kind": "telegram",
                "file_type": "document",
                "file_id": "doc-1",
                "file_name": "revision-v3.docx",
            }
        ],
    )
    closed_round = OrderRevisionRound(
        id=88,
        order_id=order.id,
        round_number=3,
        status=OrderRevisionRoundStatus.OPEN.value,
    )
    finalize_event_calls: list[dict[str, object]] = []

    async def fake_upload_deliverable_files(**kwargs):
        return SimpleNamespace(
            success=True,
            batch_url="https://disk.example/order-156/v4",
            folder_url="https://disk.example/order-156",
            uploaded_count=1,
            error=None,
        )

    async def fake_finalize_status_change(*args, **kwargs):
        return kwargs.get("change")

    async def fake_next_delivery_version_number(*args, **kwargs):
        return 1

    async def fake_close_current_revision_round(*args, **kwargs):
        return closed_round

    async def fake_persist_delivery_messages(*args, **kwargs):
        return None

    async def fake_sync_delivery_conversation(*args, **kwargs):
        return Conversation(user_id=order.user_id, order_id=order.id, conversation_type=ConversationType.ORDER_CHAT.value)

    async def fake_finalize_order_delivery_event(*args, **kwargs):
        finalize_event_calls.append(kwargs)
        return SimpleNamespace(id=501)

    monkeypatch.setattr(
        "bot.services.order_delivery_service.yandex_disk_service",
        SimpleNamespace(
            upload_deliverable_files=fake_upload_deliverable_files,
            build_order_meta=lambda current_order: {"status": current_order.status},
        ),
    )
    monkeypatch.setattr("bot.services.order_delivery_service._next_delivery_version_number", fake_next_delivery_version_number)
    monkeypatch.setattr("bot.services.order_delivery_service.finalize_order_status_change", fake_finalize_status_change)
    monkeypatch.setattr("bot.services.order_delivery_service.close_current_revision_round", fake_close_current_revision_round)
    monkeypatch.setattr("bot.services.order_delivery_service._persist_delivery_messages", fake_persist_delivery_messages)
    monkeypatch.setattr("bot.services.order_delivery_service._sync_delivery_conversation", fake_sync_delivery_conversation)
    monkeypatch.setattr("bot.services.order_delivery_service.finalize_order_delivery_event", fake_finalize_order_delivery_event)

    result = await send_order_delivery_batch(
        session,
        bot,
        order,
        user=user,
        source="topic",
        sent_by_admin_id=settings.ADMIN_IDS[0],
        batch=batch,
        manager_comment="Исправил замечания по структуре.",
    )

    assert result.batch.version_number == 1
    assert result.review_status_changed is True
    assert finalize_event_calls[0]["fulfilled_revision_round_id"] == closed_round.id
    assert finalize_event_calls[0]["fulfilled_revision_round_number"] == closed_round.round_number
    assert order.status == OrderStatus.REVIEW.value


@pytest.mark.asyncio
async def test_dispatch_order_delivery_event_sends_revision_round_fulfilled_ws(monkeypatch):
    order = make_order(order_id=157, status=OrderStatus.REVIEW.value, revision_count=3)
    batch = OrderDeliveryBatch(
        id=902,
        order_id=order.id,
        status=OrderDeliveryBatchStatus.SENT.value,
        version_number=4,
        revision_count_snapshot=3,
        file_count=2,
        files_url="https://disk.example/order-157/v4",
    )
    delivery_ws_calls: list[dict[str, object]] = []
    revision_ws_calls: list[dict[str, object]] = []

    async def fake_notify_delivery_update(**kwargs):
        delivery_ws_calls.append(kwargs)
        return True

    async def fake_notify_revision_round_fulfilled(**kwargs):
        revision_ws_calls.append(kwargs)
        return True

    monkeypatch.setattr("bot.api.websocket.notify_delivery_update", fake_notify_delivery_update)
    monkeypatch.setattr("bot.api.websocket.notify_revision_round_fulfilled", fake_notify_revision_round_fulfilled)

    result = await dispatch_order_delivery_event(
        session=SimpleNamespace(),
        bot=None,
        order=order,
        batch=batch,
        options=DeliveryDispatchOptions(notify_user=True, update_live_card=False),
        fulfilled_revision_round_id=88,
        fulfilled_revision_round_number=3,
    )

    assert result.ws_notified is True
    assert result.revision_ws_notified is True
    assert delivery_ws_calls[0]["delivery_batch_id"] == batch.id
    assert revision_ws_calls[0]["revision_round_id"] == 88
    assert revision_ws_calls[0]["round_number"] == 3
    assert revision_ws_calls[0]["version_number"] == 4


@pytest.mark.asyncio
async def test_admin_topic_commands_are_not_forwarded_to_client():
    session = FakeSession()
    bot = FakeBot()

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0], is_bot=False)
            self.text = "/summary"
            self.caption = None
            self.photo = None
            self.document = None
            self.video = None
            self.voice = None
            self.audio = None
            self.chat = SimpleNamespace(id=-100123)
            self.message_id = 1001
            self.message_thread_id = 444
            self.forum_topic_created = False
            self.forum_topic_edited = False
            self.forum_topic_closed = False
            self.replies: list[str] = []

        async def reply(self, text):
            self.replies.append(text)

    await admin_message_from_topic(FakeTopicMessage(), session=session, bot=bot)

    assert bot.copy_calls == []
    assert bot.sent_messages == []
    assert session.added == []


def test_admin_topic_header_text_includes_operational_context():
    order = make_order(
        order_id=55,
        status=OrderStatus.REVISION.value,
        final_price=6000.0,
        paid_amount=2500.0,
        revision_count=2,
    )
    order.files_url = "https://disk.example/order-55"
    order.admin_notes = "Сверить список литературы и перепроверить выводы перед сдачей."
    order.delivered_at = datetime(2026, 4, 8, 18, 30)

    text = build_admin_topic_header_text(
        order=order,
        client_name="Client User",
        client_username="client",
        user_id=101,
        operational_lines=[
            "Сейчас: клиент ждёт исправленную версию",
            "Дальше: загрузить материалы в топик и отправить через /deliver",
        ],
    )

    assert "Оплачено: 2 500 ₽" in text
    assert "Осталось: 3 500 ₽" in text
    assert "Платёж: ждём доплату 3 500 ₽" in text
    assert "Кругов правок: 2" in text
    assert "Папка: подключена" in text
    assert "Заметка:" in text
    assert "Операционно:" in text
    assert "Сейчас: клиент ждёт исправленную версию" in text
    assert "Файлы, фото и голосовые попадают в черновик выдачи" in text
    assert "/summary /history /note /folder /deliver /pay /paid /review /done /card /price" in text


def test_admin_topic_header_keyboard_uses_delivery_help_when_draft_is_empty():
    order = make_order(order_id=58, status=OrderStatus.REVIEW.value)

    keyboard = build_admin_topic_header_keyboard(order, has_delivery_draft=False)

    assert keyboard is not None
    delivery_button = keyboard.inline_keyboard[1][1]
    assert delivery_button.text == "📎 Сначала файлы"
    assert delivery_button.callback_data == f"topic_action:delivery_help:{order.id}"


@pytest.mark.asyncio
async def test_build_topic_summary_payload_includes_activity_snapshot(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=56,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=444,
    )
    order = make_order(order_id=56, user_id=conv.user_id, status=OrderStatus.REVIEW.value)
    user = make_user(telegram_id=conv.user_id)

    lifecycle_events = [
        OrderLifecycleEvent(
            id=10,
            order_id=order.id,
            user_id=order.user_id,
            event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
            status_from=OrderStatus.PAID.value,
            status_to=OrderStatus.REVIEW.value,
            created_at=datetime(2026, 4, 8, 19, 0),
            payload={"dispatch": {"notification_extra_data": {"delivered_at": "08.04.2026 19:00"}}},
        )
    ]
    admin_logs = [
        AdminActionLog(
            id=11,
            admin_id=settings.ADMIN_IDS[0],
            admin_username="manager",
            action_type=AdminActionType.ORDER_NOTE_UPDATE.value,
            target_type="order",
            target_id=order.id,
            new_value={"notes": "Проверить титульный лист"},
            created_at=datetime(2026, 4, 8, 19, 5),
        )
    ]
    messages = [
        OrderMessage(
            id=12,
            order_id=order.id,
            sender_type="admin",
            sender_id=settings.ADMIN_IDS[0],
            file_type="document",
            file_name="final.docx",
            created_at=datetime(2026, 4, 8, 19, 10),
        )
    ]

    async def fake_load_topic_activity_context(_session, _order):
        return lifecycle_events, admin_logs, messages

    monkeypatch.setattr("bot.handlers.order_chat.load_topic_activity_context", fake_load_topic_activity_context)

    payload = await build_topic_summary_payload(FakeTopicCommandSession(None, order, None), conv, order, user)

    assert "Последние события:" in payload["text"]
    assert "Выдан файл: final.docx" in payload["text"]
    assert "Обновлена внутренняя заметка" in payload["text"]
    assert "Работа передана клиенту" in payload["text"]
    assert payload["reply_markup"] is not None


@pytest.mark.asyncio
async def test_build_topic_summary_payload_includes_revision_operational_summary(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=59,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=444,
    )
    order = make_order(order_id=59, user_id=conv.user_id, status=OrderStatus.REVISION.value, revision_count=2)
    user = make_user(telegram_id=conv.user_id)

    messages = [
        OrderMessage(
            id=31,
            order_id=order.id,
            sender_type="client",
            sender_id=order.user_id,
            message_text="📝 <b>Запрос на правки</b>\n\nПоправьте структуру введения и список литературы.",
            created_at=datetime(2026, 4, 8, 20, 10),
        )
    ]

    async def fake_load_topic_activity_context(_session, _order):
        return [], [], messages

    monkeypatch.setattr("bot.handlers.order_chat.load_topic_activity_context", fake_load_topic_activity_context)
    async def fake_get_current_revision_round(_session, _order_id):
        return None

    monkeypatch.setattr("bot.handlers.order_chat.get_current_revision_round", fake_get_current_revision_round)

    payload = await build_topic_summary_payload(FakeTopicCommandSession(None, order, None), conv, order, user)

    assert "Операционно:" in payload["text"]
    assert "Сейчас: клиент ждёт исправленную версию" in payload["text"]
    assert "Правка клиента: Поправьте структуру введения и список литературы." in payload["text"]
    assert "Дальше: загрузить материалы в топик и отправить через /deliver" in payload["text"]


@pytest.mark.asyncio
async def test_build_topic_summary_payload_prefers_open_revision_round_context(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=159,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=544,
    )
    order = make_order(order_id=159, user_id=conv.user_id, status=OrderStatus.REVISION.value, revision_count=3)
    user = make_user(telegram_id=conv.user_id)
    current_round = OrderRevisionRound(
        id=501,
        order_id=order.id,
        round_number=3,
        status=OrderRevisionRoundStatus.OPEN.value,
        initial_comment="Нужно исправить выводы и титульный лист.",
        requested_by_user_id=order.user_id,
        requested_at=datetime(2026, 4, 8, 22, 0),
        last_client_activity_at=datetime(2026, 4, 8, 22, 10),
    )
    messages = [
        OrderMessage(
            id=131,
            order_id=order.id,
            revision_round_id=current_round.id,
            sender_type="client",
            sender_id=order.user_id,
            message_text="📝 <b>Запрос на правки</b>\n\nНужно исправить выводы и титульный лист.",
            created_at=datetime(2026, 4, 8, 22, 0),
        ),
        OrderMessage(
            id=132,
            order_id=order.id,
            revision_round_id=current_round.id,
            sender_type="client",
            sender_id=order.user_id,
            message_text="Отправляю скриншот проблемного места.",
            created_at=datetime(2026, 4, 8, 22, 9),
        ),
        OrderMessage(
            id=133,
            order_id=order.id,
            revision_round_id=current_round.id,
            sender_type="client",
            sender_id=order.user_id,
            file_type="document",
            file_name="revision-notes.pdf",
            created_at=datetime(2026, 4, 8, 22, 10),
        ),
    ]

    async def fake_load_topic_activity_context(_session, _order):
        return [], [], messages

    async def fake_get_current_revision_round(_session, _order_id):
        return current_round

    monkeypatch.setattr("bot.handlers.order_chat.load_topic_activity_context", fake_load_topic_activity_context)
    monkeypatch.setattr("bot.handlers.order_chat.get_current_revision_round", fake_get_current_revision_round)

    payload = await build_topic_summary_payload(FakeTopicCommandSession(None, order, None), conv, order, user)

    assert "Сейчас: открыта правка #3" in payload["text"]
    assert "Запрос клиента: Отправляю скриншот проблемного места." in payload["text"]
    assert "Материалы в круге: сообщений: 1 · вложений: 1" in payload["text"]
    assert "Последняя активность клиента:" in payload["text"]
    assert "22:10" in payload["text"]


@pytest.mark.asyncio
async def test_build_topic_summary_payload_includes_verification_operational_summary(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=60,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=445,
    )
    order = make_order(
        order_id=60,
        user_id=conv.user_id,
        status=OrderStatus.VERIFICATION_PENDING.value,
        final_price=5000.0,
        paid_amount=2000.0,
    )
    user = make_user(telegram_id=conv.user_id)

    lifecycle_events = [
        OrderLifecycleEvent(
            id=32,
            order_id=order.id,
            user_id=order.user_id,
            event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
            status_from=OrderStatus.REVIEW.value,
            status_to=OrderStatus.VERIFICATION_PENDING.value,
            created_at=datetime(2026, 4, 8, 20, 20),
            payload={
                "dispatch": {
                    "notification_extra_data": {
                        "amount_to_pay": 3000.0,
                        "payment_phase": "final",
                        "is_batch": True,
                        "batch_orders_count": 2,
                        "batch_total_amount": 4200.0,
                        "batch_order_ids": [60, 61],
                    }
                }
            },
        )
    ]

    async def fake_load_topic_activity_context(_session, _order):
        return lifecycle_events, [], []

    monkeypatch.setattr("bot.handlers.order_chat.load_topic_activity_context", fake_load_topic_activity_context)

    payload = await build_topic_summary_payload(FakeTopicCommandSession(None, order, None), conv, order, user)

    assert "Сейчас: клиент сообщил про доплату 3 000 ₽" in payload["text"]
    assert "Контекст: пакет из 2 заказов на 4 200 ₽" in payload["text"]
    assert "Дальше: сверить поступление и подтвердить через /paid" in payload["text"]


def test_build_topic_history_text_merges_recent_events_without_dup_revision_status():
    order = make_order(order_id=56, status=OrderStatus.REVISION.value)
    order.created_at = datetime(2026, 4, 8, 10, 0)

    lifecycle_events = [
        OrderLifecycleEvent(
            id=1,
            order_id=order.id,
            user_id=order.user_id,
            event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
            status_from=OrderStatus.REVIEW.value,
            status_to=OrderStatus.REVISION.value,
            created_at=datetime(2026, 4, 8, 12, 0),
            payload={"dispatch": {"notification_extra_data": {"revision_count": 3}}},
        ),
        OrderLifecycleEvent(
            id=2,
            order_id=order.id,
            user_id=order.user_id,
            event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
            status_from=OrderStatus.PAID.value,
            status_to=OrderStatus.REVIEW.value,
            created_at=datetime(2026, 4, 8, 11, 0),
            payload={"dispatch": {"notification_extra_data": {"delivered_at": "08.04.2026 11:00"}}},
        ),
    ]
    admin_logs = [
        AdminActionLog(
            id=5,
            admin_id=settings.ADMIN_IDS[0],
            admin_username="manager",
            action_type=AdminActionType.ORDER_NOTE_UPDATE.value,
            target_type="order",
            target_id=order.id,
            old_value={"notes": "Черновик"},
            new_value={"notes": "Финально сверить вывод"},
            created_at=datetime(2026, 4, 8, 12, 30),
        )
    ]
    messages = [
        OrderMessage(
            id=8,
            order_id=order.id,
            sender_type="client",
            sender_id=order.user_id,
            message_text="📝 <b>Запрос на правки</b>\n\nДобавить выводы в заключение.",
            created_at=datetime(2026, 4, 8, 12, 1),
        ),
        OrderMessage(
            id=9,
            order_id=order.id,
            sender_type="admin",
            sender_id=settings.ADMIN_IDS[0],
            file_type="document",
            file_name="final.docx",
            yadisk_url="https://disk.example/final.docx",
            created_at=datetime(2026, 4, 8, 12, 45),
        ),
    ]

    text = build_topic_history_text(
        order=order,
        lifecycle_events=lifecycle_events,
        admin_logs=admin_logs,
        messages=messages,
    )

    assert "Последние события по заказу #56" in text
    assert "Выдан файл: final.docx" in text
    assert "Клиент запросил правки" in text
    assert "Обновлена внутренняя заметка" in text
    assert "Работа передана клиенту" in text
    assert text.count("Заказ переведён в правки") == 0


def test_build_topic_history_text_includes_payment_request_log():
    order = make_order(order_id=61, status=OrderStatus.WAITING_PAYMENT.value)
    text = build_topic_history_text(
        order=order,
        lifecycle_events=[],
        admin_logs=[
            AdminActionLog(
                id=14,
                admin_id=settings.ADMIN_IDS[0],
                admin_username="manager",
                action_type=AdminActionType.ORDER_PAYMENT_REQUEST.value,
                target_type="order",
                target_id=order.id,
                new_value={"amount_to_pay": 2500.0, "payment_phase": "final"},
                created_at=datetime(2026, 4, 8, 20, 30),
            )
        ],
        messages=[],
    )

    assert "Запрос на оплату отправлен" in text
    assert "Доплата 2 500 ₽" in text


def test_build_topic_history_text_includes_status_change_log():
    order = make_order(order_id=62, status=OrderStatus.REVIEW.value)
    text = build_topic_history_text(
        order=order,
        lifecycle_events=[],
        admin_logs=[
            AdminActionLog(
                id=15,
                admin_id=settings.ADMIN_IDS[0],
                admin_username="manager",
                action_type=AdminActionType.ORDER_STATUS_CHANGE.value,
                target_type="order",
                target_id=order.id,
                details="Менеджер завершил заказ из топика",
                old_value={"status": OrderStatus.REVIEW.value},
                new_value={"status": OrderStatus.COMPLETED.value},
                created_at=datetime(2026, 4, 8, 21, 15),
            )
        ],
        messages=[],
    )

    assert "Менеджер изменил статус" in text
    assert "Менеджер завершил заказ из топика" in text
    assert "Готово → Завершён" in text


def test_build_topic_history_text_prefers_payment_confirm_log_over_lifecycle_duplicate():
    order = make_order(order_id=64, status=OrderStatus.REVIEW.value, final_price=3000.0, paid_amount=3000.0)
    order.created_at = datetime(2026, 4, 8, 10, 0)
    lifecycle_events = [
        OrderLifecycleEvent(
            id=16,
            order_id=order.id,
            user_id=order.user_id,
            event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
            status_from=OrderStatus.VERIFICATION_PENDING.value,
            status_to=OrderStatus.REVIEW.value,
            created_at=datetime(2026, 4, 8, 15, 0),
            payload={},
        )
    ]
    admin_logs = [
        AdminActionLog(
            id=17,
            admin_id=settings.ADMIN_IDS[0],
            admin_username="manager",
            action_type=AdminActionType.ORDER_PAYMENT_CONFIRM.value,
            target_type="order",
            target_id=order.id,
            details="Подтверждена доплата 2 000 ₽ из топика",
            old_value={"paid_amount": 1000.0, "status": OrderStatus.VERIFICATION_PENDING.value},
            new_value={
                "paid_amount": 3000.0,
                "payment_phase": "final",
                "payment_delta": 2000.0,
                "status": OrderStatus.REVIEW.value,
            },
            created_at=datetime(2026, 4, 8, 15, 0),
        )
    ]

    text = build_topic_history_text(
        order=order,
        lifecycle_events=lifecycle_events,
        admin_logs=admin_logs,
        messages=[],
    )

    assert "Оплата подтверждена вручную" in text
    assert "Подтверждена доплата 2 000 ₽ из топика" in text
    assert text.count("Работа передана клиенту") == 0


def test_build_topic_history_text_groups_delivery_batch_messages():
    order = make_order(order_id=57, status=OrderStatus.REVIEW.value)
    order.created_at = datetime(2026, 4, 8, 10, 0)
    lifecycle_events = [
        OrderLifecycleEvent(
            id=19,
            order_id=order.id,
            user_id=order.user_id,
            event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
            status_from=OrderStatus.REVISION.value,
            status_to=OrderStatus.REVIEW.value,
            created_at=datetime(2026, 4, 8, 13, 0),
            payload={},
        )
    ]

    messages = [
        OrderMessage(
            id=20,
            order_id=order.id,
            delivery_batch_id=42,
            sender_type="admin",
            sender_id=settings.ADMIN_IDS[0],
            message_text=(
                "📦 Исправленная версия по правке #2 готова\n"
                "Заказ #57\n"
                "Версия: 3\n"
                "Файлов: 2\n\n"
                "Учёл замечания по списку литературы."
            ),
            yadisk_url="https://disk.example/order-57/v3",
            created_at=datetime(2026, 4, 8, 13, 0),
        ),
        OrderMessage(
            id=21,
            order_id=order.id,
            delivery_batch_id=42,
            sender_type="admin",
            sender_id=settings.ADMIN_IDS[0],
            file_type="document",
            file_name="essay-v3.docx",
            yadisk_url="https://disk.example/order-57/v3",
            created_at=datetime(2026, 4, 8, 13, 0),
        ),
        OrderMessage(
            id=22,
            order_id=order.id,
            delivery_batch_id=42,
            sender_type="admin",
            sender_id=settings.ADMIN_IDS[0],
            file_type="document",
            file_name="sources-v3.docx",
            yadisk_url="https://disk.example/order-57/v3",
            created_at=datetime(2026, 4, 8, 13, 1),
        ),
    ]

    text = build_topic_history_text(
        order=order,
        lifecycle_events=lifecycle_events,
        admin_logs=[],
        messages=messages,
    )

    assert "Исправленная версия по правке #2 готова" in text
    assert "Версия: 3 · Файлов: 2 · Учёл замечания по списку литературы." in text
    assert "Открыть версию" in text
    assert "Менеджер написал клиенту" not in text
    assert "Выдан файл:" not in text
    assert "Работа передана клиенту" not in text


def test_build_topic_history_text_prefers_status_change_log_over_lifecycle_duplicate():
    order = make_order(order_id=63, status=OrderStatus.COMPLETED.value)
    order.created_at = datetime(2026, 4, 8, 10, 0)
    lifecycle_events = [
        OrderLifecycleEvent(
            id=23,
            order_id=order.id,
            user_id=order.user_id,
            event_type=OrderLifecycleEventType.STATUS_CHANGED.value,
            status_from=OrderStatus.REVIEW.value,
            status_to=OrderStatus.COMPLETED.value,
            created_at=datetime(2026, 4, 8, 21, 15),
            payload={},
        )
    ]
    admin_logs = [
        AdminActionLog(
            id=24,
            admin_id=settings.ADMIN_IDS[0],
            admin_username="manager",
            action_type=AdminActionType.ORDER_STATUS_CHANGE.value,
            target_type="order",
            target_id=order.id,
            details="Менеджер завершил заказ из топика",
            old_value={"status": OrderStatus.REVIEW.value},
            new_value={"status": OrderStatus.COMPLETED.value},
            created_at=datetime(2026, 4, 8, 21, 15),
        )
    ]

    text = build_topic_history_text(
        order=order,
        lifecycle_events=lifecycle_events,
        admin_logs=admin_logs,
        messages=[],
    )

    assert text.count("Менеджер изменил статус") == 1
    assert "Менеджер завершил заказ из топика" in text
    assert text.count("Заказ завершён") == 0


def test_build_topic_history_text_groups_revision_round_messages():
    order = make_order(order_id=157, status=OrderStatus.REVISION.value)
    order.created_at = datetime(2026, 4, 8, 10, 0)

    messages = [
        OrderMessage(
            id=220,
            order_id=order.id,
            revision_round_id=9,
            sender_type="client",
            sender_id=order.user_id,
            message_text="📝 <b>Запрос на правки</b>\n\nПроверьте оформление таблицы.",
            created_at=datetime(2026, 4, 8, 13, 0),
        ),
        OrderMessage(
            id=221,
            order_id=order.id,
            revision_round_id=9,
            sender_type="client",
            sender_id=order.user_id,
            message_text="Добавил ещё комментарий по шапке.",
            created_at=datetime(2026, 4, 8, 13, 5),
        ),
        OrderMessage(
            id=222,
            order_id=order.id,
            revision_round_id=9,
            sender_type="client",
            sender_id=order.user_id,
            file_type="document",
            file_name="markup.pdf",
            created_at=datetime(2026, 4, 8, 13, 6),
        ),
    ]

    text = build_topic_history_text(
        order=order,
        lifecycle_events=[],
        admin_logs=[],
        messages=messages,
    )

    assert "Клиент дополнил материалы по правке" in text
    assert "Проверьте оформление таблицы." in text
    assert "дополнил: Добавил ещё комментарий по шапке." in text
    assert "вложений: 1" in text


@pytest.mark.asyncio
async def test_refresh_topic_header_creates_message_and_saves_message_id(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=57,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=445,
    )
    order = make_order(order_id=57, user_id=conv.user_id, status=OrderStatus.REVIEW.value)
    user = make_user(telegram_id=conv.user_id)
    session = FakeTopicCommandSession(None, order, None)
    bot = FakeBot()

    async def fake_build_topic_summary_payload(_session, _conv, _order, _user):
        return {"text": "header payload", "reply_markup": None}

    monkeypatch.setattr("bot.handlers.order_chat.build_topic_summary_payload", fake_build_topic_summary_payload)

    result = await refresh_topic_header(bot, session, conv, order, user)

    assert result == 7001
    assert conv.topic_header_message_id == 7001
    assert session.commit_calls == 1
    assert bot.sent_messages[0]["chat_id"] == settings.ADMIN_GROUP_ID
    assert bot.sent_messages[0]["message_thread_id"] == conv.topic_id
    assert bot.sent_messages[0]["text"] == "header payload"


@pytest.mark.asyncio
async def test_cmd_review_in_topic_uses_delivery_helper(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=91,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=444,
    )
    order = make_order(order_id=91, user_id=conv.user_id, status=OrderStatus.REVISION.value)
    user = make_user(telegram_id=conv.user_id)
    session = FakeTopicCommandSession(conv, order, user)
    sync_calls: list[dict[str, object]] = []

    async def fake_sync_order_delivery_review(*args, **kwargs):
        sync_calls.append({"args": args, "kwargs": kwargs})
        return SimpleNamespace(reopened_review=True, delivered_at=None)

    monkeypatch.setattr("bot.handlers.order_chat.sync_order_delivery_review", fake_sync_order_delivery_review)

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0])
            self.message_thread_id = conv.topic_id
            self.replies: list[str] = []

        async def reply(self, text, **kwargs):
            self.replies.append(text)

    message = FakeTopicMessage()
    await cmd_review_in_topic(message, session=session, bot=object())

    assert sync_calls[0]["kwargs"]["client_username"] == user.username
    assert sync_calls[0]["kwargs"]["client_name"] == user.fullname
    assert sync_calls[0]["kwargs"]["card_extra_text"] == "✏️ Менеджер вернул заказ на проверку"
    assert len(session.added) == 1
    assert isinstance(session.added[0], AdminActionLog)
    assert session.added[0].action_type == AdminActionType.ORDER_STATUS_CHANGE.value
    assert session.added[0].old_value == {"status": OrderStatus.REVISION.value}
    assert session.added[0].new_value == {"status": OrderStatus.REVIEW.value}
    assert message.replies == ["✅ Заказ возвращён клиенту на проверку"]


@pytest.mark.asyncio
async def test_cmd_complete_in_topic_uses_finalize_with_close_topic(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=92,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=445,
    )
    order = make_order(order_id=92, user_id=conv.user_id, status=OrderStatus.REVIEW.value)
    order.files_url = "https://disk.example/order-92"
    user = make_user(telegram_id=conv.user_id)
    session = FakeTopicCommandSession(conv, order, user)
    finalize_calls: list[dict[str, object]] = []

    async def fake_finalize(session_arg, bot, order_arg, change, *, dispatch):
        finalize_calls.append(
            {
                "session": session_arg,
                "bot": bot,
                "order": order_arg,
                "change": change,
                "dispatch": dispatch,
            }
        )
        return change

    monkeypatch.setattr("bot.handlers.order_chat.finalize_order_status_change", fake_finalize)

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0])
            self.message_thread_id = conv.topic_id
            self.replies: list[str] = []

        async def reply(self, text, **kwargs):
            self.replies.append(text)

    message = FakeTopicMessage()
    await cmd_complete_in_topic(message, session=session, bot=object())

    assert order.status == OrderStatus.COMPLETED.value
    assert len(session.added) == 1
    assert isinstance(session.added[0], AdminActionLog)
    assert session.added[0].action_type == AdminActionType.ORDER_STATUS_CHANGE.value
    assert session.added[0].old_value == {"status": OrderStatus.REVIEW.value}
    assert session.added[0].new_value == {"status": OrderStatus.COMPLETED.value}
    assert finalize_calls[0]["dispatch"].close_topic is True
    assert finalize_calls[0]["dispatch"].update_live_card is True
    assert finalize_calls[0]["dispatch"].yadisk_link == order.files_url
    assert "Закрыто менеджером из топика" in (finalize_calls[0]["dispatch"].card_extra_text or "")
    assert message.replies == ["✅ Заказ завершён. Топик будет закрыт."]


@pytest.mark.asyncio
async def test_cmd_folder_in_topic_shows_folder_link():
    conv = Conversation(
        user_id=101,
        order_id=93,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=446,
    )
    order = make_order(order_id=93, user_id=conv.user_id, status=OrderStatus.REVIEW.value, final_price=4200.0, paid_amount=2100.0)
    order.files_url = "https://disk.example/order-93"
    order.admin_notes = "Готовим финальный комплект."
    order.delivered_at = datetime(2026, 4, 8, 19, 15)
    session = FakeTopicCommandSession(conv, order, make_user(telegram_id=conv.user_id))

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0])
            self.message_thread_id = conv.topic_id
            self.replies: list[dict[str, object]] = []

        async def reply(self, text, **kwargs):
            self.replies.append({"text": text, **kwargs})

    message = FakeTopicMessage()
    await cmd_folder_in_topic(message, session=session)

    assert "🗂 <b>Папка заказа #93</b>" in message.replies[0]["text"]
    assert "Открыть папку на Яндекс.Диске" in message.replies[0]["text"]
    assert message.replies[0]["reply_markup"] is not None


@pytest.mark.asyncio
async def test_cmd_pay_in_topic_sends_followup_payment_request(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=94,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=447,
    )
    order = make_order(
        order_id=94,
        user_id=conv.user_id,
        status=OrderStatus.REVIEW.value,
        final_price=3000.0,
        paid_amount=1000.0,
    )
    order.payment_scheme = "half"
    user = make_user(telegram_id=conv.user_id)
    session = FakeTopicCommandSession(conv, order, user)
    custom_notifications: list[dict[str, object]] = []
    live_card_calls: list[dict[str, object]] = []
    bot = FakeBot()

    async def fake_send_custom_notification(**kwargs):
        custom_notifications.append(kwargs)
        return True

    async def fake_update_live_card(**kwargs):
        live_card_calls.append(kwargs)
        return None

    monkeypatch.setattr("bot.services.realtime_notifications.send_custom_notification", fake_send_custom_notification)
    monkeypatch.setattr("bot.services.live_cards.update_live_card", fake_update_live_card)

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0])
            self.message_thread_id = conv.topic_id
            self.replies: list[str] = []

        async def reply(self, text, **kwargs):
            self.replies.append(text)

    message = FakeTopicMessage()
    await cmd_pay_in_topic(message, session=session, bot=bot)

    assert "НУЖНА ДОПЛАТА" in bot.sent_messages[0]["text"]
    assert bot.sent_messages[0]["chat_id"] == order.user_id
    assert custom_notifications[0]["data"]["payment_phase"] == "final"
    assert custom_notifications[0]["data"]["amount_to_pay"] == 2000.0
    assert "Доплата 2 000 ₽ отправлен" in live_card_calls[0]["extra_text"]
    assert len(session.added) == 1
    assert isinstance(session.added[0], AdminActionLog)
    assert session.added[0].action_type == AdminActionType.ORDER_PAYMENT_REQUEST.value
    assert message.replies == ["📤 Запрос на доплату 2 000 ₽ отправлен клиенту"]


@pytest.mark.asyncio
async def test_cmd_history_in_topic_replies_with_compact_timeline(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=94,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=447,
    )
    order = make_order(order_id=94, user_id=conv.user_id, status=OrderStatus.REVIEW.value)
    session = FakeTopicCommandSession(conv, order, None)

    async def fake_build_topic_history_payload(_session, _order):
        return {"text": "history payload", "disable_web_page_preview": True}

    monkeypatch.setattr("bot.handlers.order_chat.build_topic_history_payload", fake_build_topic_history_payload)

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0], username="manager")
            self.message_thread_id = conv.topic_id
            self.replies: list[dict[str, object]] = []

        async def reply(self, text, **kwargs):
            self.replies.append({"text": text, **kwargs})

    message = FakeTopicMessage()
    await cmd_history_in_topic(message, session=session)

    assert message.replies == [{"text": "history payload", "disable_web_page_preview": True}]


@pytest.mark.asyncio
async def test_topic_action_delivery_help_shows_draft_guidance():
    conv = Conversation(
        user_id=101,
        order_id=95,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=448,
    )
    order = make_order(order_id=95, user_id=conv.user_id, status=OrderStatus.REVIEW.value)
    user = make_user(telegram_id=conv.user_id)
    session = FakeTopicCommandSession(conv, order, user)

    class FakeCallbackMessage:
        def __init__(self):
            self.chat = SimpleNamespace(id=settings.ADMIN_GROUP_ID)
            self.message_thread_id = conv.topic_id
            self.replies: list[str] = []

        async def answer(self, text, **kwargs):
            self.replies.append(text)

    class FakeCallback:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0])
            self.data = f"topic_action:delivery_help:{order.id}"
            self.message = FakeCallbackMessage()
            self.answers: list[dict[str, object]] = []

        async def answer(self, text=None, **kwargs):
            self.answers.append({"text": text, **kwargs})

    callback = FakeCallback()

    await topic_action_callback(callback, session=session, bot=object())

    assert "Выдача версии по заказу #95" in callback.message.replies[0]
    assert "/deliver комментарий" in callback.message.replies[0]
    assert callback.answers == [{"text": "Сначала загрузите файлы в топик", "show_alert": True}]


@pytest.mark.asyncio
async def test_cmd_note_in_topic_updates_internal_note_and_logs(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=96,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=449,
    )
    order = make_order(order_id=96, user_id=conv.user_id, status=OrderStatus.REVIEW.value)
    order.admin_notes = "Старая заметка"
    user = make_user(telegram_id=conv.user_id)
    session = FakeTopicCommandSession(conv, order, user)
    refresh_calls: list[dict[str, object]] = []
    header_refresh_calls: list[dict[str, object]] = []

    async def fake_refresh_topic_card(bot, session_arg, conv_arg, order_arg, user_arg):
        refresh_calls.append(
            {
                "bot": bot,
                "session": session_arg,
                "conv": conv_arg,
                "order": order_arg,
                "user": user_arg,
            }
        )

    async def fake_maybe_refresh_topic_header(bot, session_arg, conv_arg, order_arg, user_arg):
        header_refresh_calls.append(
            {
                "bot": bot,
                "session": session_arg,
                "conv": conv_arg,
                "order": order_arg,
                "user": user_arg,
            }
        )

    monkeypatch.setattr("bot.handlers.order_chat.refresh_topic_card", fake_refresh_topic_card)
    monkeypatch.setattr("bot.handlers.order_chat.maybe_refresh_topic_header", fake_maybe_refresh_topic_header)

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0], username="manager")
            self.message_thread_id = conv.topic_id
            self.text = "/note Финально проверить оформление и титульный лист."
            self.replies: list[str] = []

        async def reply(self, text, **kwargs):
            self.replies.append(text)

    message = FakeTopicMessage()
    await cmd_note_in_topic(message, session=session, bot=object())

    assert order.admin_notes == "Финально проверить оформление и титульный лист."
    assert session.commit_calls == 1
    assert len(session.added) == 1
    assert isinstance(session.added[0], AdminActionLog)
    assert session.added[0].action_type == AdminActionType.ORDER_NOTE_UPDATE.value
    assert session.added[0].old_value == {"notes": "Старая заметка"}
    assert session.added[0].new_value == {"notes": "Финально проверить оформление и титульный лист."}
    assert refresh_calls[0]["order"] is order
    assert header_refresh_calls[0]["order"] is order
    assert "✅ Заметка сохранена" in message.replies[0]


@pytest.mark.asyncio
async def test_cmd_send_template_refreshes_topic_header(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=97,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=450,
    )
    order = make_order(order_id=97, user_id=conv.user_id, status=OrderStatus.REVIEW.value)
    user = make_user(telegram_id=conv.user_id)
    session = FakeTopicCommandSession(conv, order, user)
    bot = FakeBot()
    refresh_calls: list[dict[str, object]] = []

    async def fake_maybe_refresh_topic_header(bot_arg, session_arg, conv_arg, order_arg, user_arg):
        refresh_calls.append(
            {
                "bot": bot_arg,
                "session": session_arg,
                "conv": conv_arg,
                "order": order_arg,
                "user": user_arg,
            }
        )

    monkeypatch.setattr("bot.handlers.order_chat.maybe_refresh_topic_header", fake_maybe_refresh_topic_header)

    class FakeTopicMessage:
        def __init__(self):
            self.text = "/t7"
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0])
            self.message_thread_id = conv.topic_id
            self.replies: list[str] = []

        async def reply(self, text, **kwargs):
            self.replies.append(text)

    message = FakeTopicMessage()

    await cmd_send_template(message, session=session, bot=bot)

    assert bot.sent_messages[0]["chat_id"] == conv.user_id
    assert refresh_calls[0]["conv"] is conv
    assert refresh_calls[0]["order"] is order
    assert refresh_calls[0]["user"] is user
    assert "✅ Шаблон" in message.replies[0]


@pytest.mark.asyncio
async def test_cmd_price_in_topic_logs_price_change(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=97,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=450,
    )
    order = make_order(order_id=97, user_id=conv.user_id, status=OrderStatus.PENDING.value, final_price=0.0)
    order.price = Decimal("0")
    order.paid_amount = Decimal("0")
    order.bonus_used = Decimal("0")
    user = make_user(telegram_id=conv.user_id)
    user.balance = Decimal("0")
    session = FakeTopicCommandSession(conv, order, user)
    refresh_calls: list[dict[str, object]] = []
    finalize_calls: list[dict[str, object]] = []
    payment_notifications: list[dict[str, object]] = []

    async def fake_finalize_order_status_change(session_arg, bot_arg, order_arg, change_arg, *, dispatch):
        finalize_calls.append(
            {
                "session": session_arg,
                "bot": bot_arg,
                "order": order_arg,
                "change": change_arg,
                "dispatch": dispatch,
            }
        )
        await session_arg.commit()

    async def fake_send_payment_notification(bot_arg, order_arg, user_arg, price_arg):
        payment_notifications.append(
            {
                "bot": bot_arg,
                "order": order_arg,
                "user": user_arg,
                "price": price_arg,
            }
        )
        return True

    async def fake_maybe_refresh_topic_header(bot_arg, session_arg, conv_arg, order_arg, user_arg):
        refresh_calls.append(
            {
                "bot": bot_arg,
                "session": session_arg,
                "conv": conv_arg,
                "order": order_arg,
                "user": user_arg,
            }
        )

    monkeypatch.setattr("bot.handlers.order_chat.finalize_order_status_change", fake_finalize_order_status_change)
    monkeypatch.setattr("bot.handlers.channel_cards.send_payment_notification", fake_send_payment_notification)
    monkeypatch.setattr("bot.handlers.order_chat.maybe_refresh_topic_header", fake_maybe_refresh_topic_header)

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0], username="manager")
            self.message_thread_id = conv.topic_id
            self.text = "/price 5000"
            self.replies: list[str] = []

        async def reply(self, text, **kwargs):
            self.replies.append(text)

    message = FakeTopicMessage()
    await cmd_price_in_topic(message, session=session, bot=object(), state=object())

    assert float(order.price) == 5000.0
    assert order.status == OrderStatus.WAITING_PAYMENT.value
    assert len(session.added) == 1
    assert isinstance(session.added[0], AdminActionLog)
    assert session.added[0].action_type == AdminActionType.ORDER_PRICE_SET.value
    assert session.added[0].old_value == {"price": 0.0, "bonus_used": 0.0}
    assert session.added[0].new_value["price"] == 5000.0
    assert session.added[0].new_value["final_price"] == 5000.0
    assert finalize_calls[0]["order"] is order
    assert payment_notifications[0]["price"] == 5000
    assert refresh_calls[0]["order"] is order
    assert "✅ Цена 5 000 ₽ установлена" in message.replies[0]


@pytest.mark.asyncio
async def test_topic_set_price_callback_logs_price_change(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=111,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=455,
    )
    user = make_user(telegram_id=conv.user_id)
    user.balance = Decimal("0")
    order = make_order(order_id=111, user_id=conv.user_id, status=OrderStatus.PENDING.value, final_price=0.0)
    order.price = Decimal("0")
    order.paid_amount = Decimal("0")
    order.bonus_used = Decimal("0")
    finalize_calls: list[dict[str, object]] = []
    payment_notifications: list[dict[str, object]] = []
    refresh_calls: list[dict[str, object]] = []

    class FakeTopicPriceSession:
        def __init__(self):
            self.added: list[object] = []
            self.commit_calls = 0
            self._responses = [user, conv, user]

        async def get(self, _model, order_id):
            if order_id == order.id:
                return order
            return None

        async def execute(self, _query):
            if self._responses:
                return FakeExecuteResult(self._responses.pop(0))
            return FakeExecuteResult(None)

        def add(self, value):
            self.added.append(value)

        async def commit(self):
            self.commit_calls += 1

    async def fake_finalize_order_status_change(session_arg, bot_arg, order_arg, change_arg, *, dispatch):
        finalize_calls.append(
            {
                "session": session_arg,
                "bot": bot_arg,
                "order": order_arg,
                "change": change_arg,
                "dispatch": dispatch,
            }
        )
        await session_arg.commit()

    async def fake_send_payment_notification(bot_arg, order_arg, user_arg, price_arg):
        payment_notifications.append(
            {
                "bot": bot_arg,
                "order": order_arg,
                "user": user_arg,
                "price": price_arg,
            }
        )
        return True

    async def fake_maybe_refresh_topic_header(bot_arg, session_arg, conv_arg, order_arg, user_arg):
        refresh_calls.append(
            {
                "bot": bot_arg,
                "session": session_arg,
                "conv": conv_arg,
                "order": order_arg,
                "user": user_arg,
            }
        )

    monkeypatch.setattr("bot.handlers.order_chat.finalize_order_status_change", fake_finalize_order_status_change)
    monkeypatch.setattr("bot.handlers.channel_cards.send_payment_notification", fake_send_payment_notification)
    monkeypatch.setattr("bot.handlers.order_chat.maybe_refresh_topic_header", fake_maybe_refresh_topic_header)

    class FakeCallbackMessage:
        def __init__(self):
            self.message_thread_id = conv.topic_id
            self.deleted = False

        async def delete(self):
            self.deleted = True

    class FakeCallback:
        def __init__(self):
            self.data = f"topic_setprice:{order.id}:7000"
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0], username="manager")
            self.message = FakeCallbackMessage()
            self.answers: list[dict[str, object]] = []

        async def answer(self, text=None, show_alert=False):
            self.answers.append({"text": text, "show_alert": show_alert})

    session = FakeTopicPriceSession()
    callback = FakeCallback()
    await topic_set_price_callback(callback, session=session, bot=object())

    assert float(order.price) == 7000.0
    assert order.status == OrderStatus.WAITING_PAYMENT.value
    assert len(session.added) == 1
    assert isinstance(session.added[0], AdminActionLog)
    assert session.added[0].action_type == AdminActionType.ORDER_PRICE_SET.value
    assert session.added[0].old_value == {"price": 0.0, "bonus_used": 0.0}
    assert session.added[0].new_value["price"] == 7000.0
    assert finalize_calls[0]["order"] is order
    assert payment_notifications[0]["price"] == 7000
    assert refresh_calls[0]["conv"] is conv
    assert callback.answers[0]["text"] == "✅ Цена 7 000 ₽ установлена!"
    assert callback.answers[0]["show_alert"] is True
    assert callback.message.deleted is True


@pytest.mark.asyncio
async def test_sync_delivery_conversation_refreshes_topic_header(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=98,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=451,
    )
    order = make_order(order_id=98, user_id=conv.user_id, status=OrderStatus.REVIEW.value)
    user = make_user(telegram_id=conv.user_id)
    calls: dict[str, object] = {}

    async def fake_get_or_create_topic(*, bot, session, user_id, order_id, conv_type):
        calls["topic"] = {
            "bot": bot,
            "session": session,
            "user_id": user_id,
            "order_id": order_id,
            "conv_type": conv_type,
        }
        return conv, conv.topic_id

    async def fake_update_conversation(session, conv, last_message, sender, increment_unread=False):
        calls["update"] = {
            "session": session,
            "conv": conv,
            "last_message": last_message,
            "sender": sender,
            "increment_unread": increment_unread,
        }

    async def fake_backup_chat_to_yadisk(*, order, client_name, telegram_id, session, client_username=None):
        calls["backup"] = {
            "order": order,
            "client_name": client_name,
            "telegram_id": telegram_id,
            "session": session,
            "client_username": client_username,
        }
        return True

    async def fake_maybe_refresh_topic_header(bot, session, conv, order, user):
        calls["refresh"] = {
            "bot": bot,
            "session": session,
            "conv": conv,
            "order": order,
            "user": user,
        }

    monkeypatch.setattr("bot.handlers.order_chat.get_or_create_topic", fake_get_or_create_topic)
    monkeypatch.setattr("bot.handlers.order_chat.update_conversation", fake_update_conversation)
    monkeypatch.setattr("bot.handlers.order_chat.backup_chat_to_yadisk", fake_backup_chat_to_yadisk)
    monkeypatch.setattr("bot.handlers.order_chat.maybe_refresh_topic_header", fake_maybe_refresh_topic_header)

    session = object()
    bot = object()
    result = await _sync_delivery_conversation(
        session=session,
        bot=bot,
        order=order,
        user=user,
        summary_message="📦 Исправленная версия готова",
    )

    assert result is conv
    assert calls["update"]["conv"] is conv
    assert calls["update"]["last_message"] == "📦 Исправленная версия готова"
    assert calls["refresh"]["conv"] is conv
    assert calls["refresh"]["order"] is order
    assert calls["refresh"]["user"] is user


@pytest.mark.asyncio
async def test_cmd_paid_in_topic_confirms_followup_payment(monkeypatch):
    conv = Conversation(
        user_id=101,
        order_id=95,
        conversation_type=ConversationType.ORDER_CHAT.value,
        topic_id=448,
    )
    order = make_order(
        order_id=95,
        user_id=conv.user_id,
        status=OrderStatus.REVIEW.value,
        final_price=3000.0,
        paid_amount=1000.0,
    )
    order.payment_scheme = "half"
    user = make_user(telegram_id=conv.user_id)
    session = FakeTopicCommandSession(conv, order, user)
    live_card_calls: list[dict[str, object]] = []
    order_update_calls: list[dict[str, object]] = []
    custom_notifications: list[dict[str, object]] = []
    bot = FakeBot()

    async def fake_update_live_card(**kwargs):
        live_card_calls.append(kwargs)
        return None

    async def fake_notify_order_update(**kwargs):
        order_update_calls.append(kwargs)
        return None

    async def fake_send_custom_notification(**kwargs):
        custom_notifications.append(kwargs)
        return True

    async def fake_process_order_bonus(**kwargs):
        return 50

    async def fake_process_referral_bonus(**kwargs):
        return None

    monkeypatch.setattr("bot.services.live_cards.update_live_card", fake_update_live_card)
    monkeypatch.setattr("bot.api.websocket.notify_order_update", fake_notify_order_update)
    monkeypatch.setattr("bot.services.realtime_notifications.send_custom_notification", fake_send_custom_notification)
    monkeypatch.setattr("bot.handlers.order_chat.BonusService.process_order_bonus", fake_process_order_bonus)
    monkeypatch.setattr("bot.handlers.order_chat.BonusService.process_referral_bonus", fake_process_referral_bonus)

    class FakeTopicMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=settings.ADMIN_IDS[0])
            self.message_thread_id = conv.topic_id
            self.replies: list[str] = []

        async def reply(self, text, **kwargs):
            self.replies.append(text)

    message = FakeTopicMessage()
    await cmd_paid_in_topic(message, session=session, bot=bot)

    assert order.paid_amount == Decimal("3000.0")
    assert order.status == OrderStatus.REVIEW.value
    assert session.commit_calls >= 1
    assert len(session.added) == 1
    assert isinstance(session.added[0], AdminActionLog)
    assert session.added[0].action_type == AdminActionType.ORDER_PAYMENT_CONFIRM.value
    assert session.added[0].old_value["status"] == OrderStatus.REVIEW.value
    assert session.added[0].new_value["status"] == OrderStatus.REVIEW.value
    assert "Доплата 2 000 ₽ подтверждён" in message.replies[0]
    assert "Доплата 2 000 ₽ подтверждён из топика" in live_card_calls[0]["extra_text"]
    assert order_update_calls[0]["new_status"] == OrderStatus.REVIEW.value
    assert order_update_calls[0]["order_data"]["payment_phase"] == "final"
    assert custom_notifications[0]["notification_type"] == "success"
    assert "Доплата" in bot.sent_messages[0]["text"]
    assert "+50₽ бонусов" not in bot.sent_messages[0]["text"]


@pytest.mark.asyncio
async def test_admin_forward_file_syncs_order_chat_and_history(monkeypatch):
    admin_user = make_user(
        telegram_id=settings.ADMIN_IDS[0],
        username="admin",
        fullname="Admin User",
    )
    order_owner = make_user(telegram_id=101, username="client", fullname="Client User")
    order = make_order(
        order_id=88,
        user_id=order_owner.telegram_id,
        status=OrderStatus.IN_PROGRESS.value,
    )
    session = FakeForwardSession(order, order_owner)
    bot = FakeBot()
    state_data = {"file_order_id": order.id, "file_user_id": order_owner.telegram_id}
    delivery_calls: list[dict[str, object]] = []

    class FakeState:
        def __init__(self):
            self.cleared = False

        async def get_data(self):
            return dict(state_data)

        async def clear(self):
            self.cleared = True

    async def fake_send_order_delivery_batch(session, bot, current_order, *, user, source, sent_by_admin_id, binary_files, manager_comment=None, batch=None):
        delivery_calls.append(
            {
                "session": session,
                "bot": bot,
                "order": current_order,
                "user": user,
                "source": source,
                "sent_by_admin_id": sent_by_admin_id,
                "binary_files": binary_files,
                "manager_comment": manager_comment,
                "batch": batch,
            }
        )
        return SimpleNamespace(
            batch=SimpleNamespace(version_number=2, file_count=1, files_url="https://disk.example/order-88/v2"),
            review_status_changed=True,
            summary_message="sent",
        )

        monkeypatch.setattr("bot.handlers.admin.is_admin", lambda _user_id: True)
    monkeypatch.setattr("bot.handlers.admin.send_order_delivery_batch", fake_send_order_delivery_batch)

    class FakeAdminMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=admin_user.telegram_id)
            self.document = SimpleNamespace(file_id="doc-88", file_name="final.docx")
            self.photo = None
            self.video = None
            self.caption = "Финальная версия"
            self.answers: list[str] = []

        async def answer(self, text):
            self.answers.append(text)

    message = FakeAdminMessage()
    state = FakeState()

    await forward_file_to_user(message, state=state, bot=bot, session=session)

    assert state.cleared is True
    assert delivery_calls[0]["user"].telegram_id == order_owner.telegram_id
    assert delivery_calls[0]["source"] == "admin_direct"
    assert delivery_calls[0]["sent_by_admin_id"] == admin_user.telegram_id
    assert delivery_calls[0]["binary_files"][0][1] == "final.docx"
    assert delivery_calls[0]["manager_comment"] == "Финальная версия"
    assert message.answers == [f"✅ Версия 2 отправлена клиенту ({order_owner.telegram_id}) и возвращена на проверку."]


@pytest.mark.asyncio
async def test_admin_message_syncs_order_chat_and_history(monkeypatch):
    admin_user = make_user(
        telegram_id=settings.ADMIN_IDS[0],
        username="admin",
        fullname="Admin User",
    )
    order_owner = make_user(telegram_id=101, username="client", fullname="Client User")
    order = make_order(
        order_id=89,
        user_id=order_owner.telegram_id,
        status=OrderStatus.REVISION.value,
    )
    session = FakeForwardSession(order, order_owner)
    bot = FakeBot()
    state_data = {"msg_order_id": order.id, "msg_user_id": order_owner.telegram_id}
    updates: list[dict[str, object]] = []
    backups: list[dict[str, object]] = []
    ws_chat_calls: list[dict[str, object]] = []

    class FakeState:
        def __init__(self):
            self.cleared = False

        async def get_data(self):
            return dict(state_data)

        async def clear(self):
            self.cleared = True

    async def fake_get_or_create_topic(**kwargs):
        return (
            Conversation(
                user_id=order.user_id,
                order_id=order.id,
                conversation_type=ConversationType.ORDER_CHAT.value,
                topic_id=888,
            ),
            888,
        )

    async def fake_update_conversation(session, conv, last_message, sender, increment_unread=False):
        updates.append(
            {
                "session": session,
                "conv": conv,
                "last_message": last_message,
                "sender": sender,
                "increment_unread": increment_unread,
            }
        )

    async def fake_backup_chat_to_yadisk(**kwargs):
        backups.append(kwargs)
        return True

    async def fake_notify_new_chat_message(**kwargs):
        ws_chat_calls.append(kwargs)

    monkeypatch.setattr("bot.handlers.admin.is_admin", lambda _user_id: True)
    monkeypatch.setattr("bot.handlers.order_chat.get_or_create_topic", fake_get_or_create_topic)
    monkeypatch.setattr("bot.handlers.order_chat.update_conversation", fake_update_conversation)
    monkeypatch.setattr("bot.handlers.order_chat.backup_chat_to_yadisk", fake_backup_chat_to_yadisk)
    monkeypatch.setattr("bot.services.realtime_notifications.notify_new_chat_message", fake_notify_new_chat_message)

    class FakeAdminMessage:
        def __init__(self):
            self.from_user = SimpleNamespace(id=admin_user.telegram_id, username=admin_user.username)
            self.text = "Посмотрите обновлённый комментарий к заказу"
            self.caption = None
            self.answers: list[str] = []

        async def answer(self, text):
            self.answers.append(text)

    message = FakeAdminMessage()
    state = FakeState()

    await send_message_to_user(message, state=state, bot=bot, session=session)

    assert state.cleared is True
    assert bot.sent_messages[0]["chat_id"] == order_owner.telegram_id
    assert isinstance(session.added[0], OrderMessage)
    assert session.added[0].message_text == message.text
    assert updates[0]["last_message"] == message.text
    assert backups[0]["order"].id == order.id
    assert ws_chat_calls[0]["order_id"] == order.id
    assert message.answers == [f"✅ Сообщение отправлено клиенту ({order_owner.telegram_id})"]


@pytest.mark.asyncio
async def test_request_revision_uses_finalize_and_escapes_admin_message(monkeypatch):
    user = make_user()
    order = make_order(
        order_id=11,
        status=OrderStatus.REVIEW.value,
        revision_count=3,
    )
    session = FakeSession(order, None, None, user)
    bot = FakeBot()
    finalize_calls: list[object] = []
    conversation_calls: list[dict[str, object]] = []
    revision_ws_calls: list[dict[str, object]] = []

    async def fake_finalize(session, bot, order, change, *, dispatch):
        finalize_calls.append(dispatch)
        return change

    async def fake_sync_order_chat_conversation(**kwargs):
        conversation_calls.append(kwargs)
        return 777

    async def fake_notify_revision_round_opened(**kwargs):
        revision_ws_calls.append(kwargs)
        return True

    monkeypatch.setattr("bot.api.routers.orders.finalize_order_status_change", fake_finalize)
    monkeypatch.setattr("bot.api.routers.orders.sync_order_chat_conversation", fake_sync_order_chat_conversation)
    monkeypatch.setattr("bot.api.routers.orders.get_bot", lambda: bot)
    monkeypatch.setattr("bot.api.websocket.notify_revision_round_opened", fake_notify_revision_round_opened)

    response = await request_revision(
        order.id,
        RevisionRequestData(message="  Исправьте <раздел> и вывод  "),
        tg_user=TelegramUser(id=user.telegram_id, first_name="Client", username=user.username),
        session=session,
    )

    assert response.success is True
    assert response.revision_count == 4
    assert response.is_paid is False
    assert isinstance(session.added[0], OrderRevisionRound)
    assert session.added[0].round_number == 4
    assert session.added[1].message_text == "📝 <b>Запрос на правки</b>\n\nИсправьте <раздел> и вывод"
    assert session.added[1].revision_round_id == session.added[0].id
    assert finalize_calls[0].notification_extra_data == {
        "revision_count": 4,
        "revision_round_number": 4,
        "is_paid": False,
    }
    assert revision_ws_calls[0]["revision_round_id"] == session.added[0].id
    assert revision_ws_calls[0]["round_number"] == 4
    assert conversation_calls[0]["preview_text"] == "📝 Запрос на правки"
    assert "&lt;раздел&gt;" in bot.sent_messages[0]["text"]


@pytest.mark.asyncio
async def test_request_revision_reuses_open_round_when_order_already_in_revision(monkeypatch):
    user = make_user()
    order = make_order(
        order_id=12,
        status=OrderStatus.REVISION.value,
        revision_count=4,
    )
    current_round = OrderRevisionRound(
        id=77,
        order_id=order.id,
        round_number=4,
        status=OrderRevisionRoundStatus.OPEN.value,
        initial_comment="Уточнить список литературы",
        requested_by_user_id=user.telegram_id,
        requested_at=datetime(2026, 4, 8, 21, 0),
    )
    session = FakeSession(order, current_round, user)
    bot = FakeBot()
    finalize_calls: list[object] = []
    conversation_calls: list[dict[str, object]] = []
    revision_ws_calls: list[dict[str, object]] = []

    async def fake_finalize(session, bot, order, change, *, dispatch):
        finalize_calls.append(dispatch)
        return change

    async def fake_sync_order_chat_conversation(**kwargs):
        conversation_calls.append(kwargs)
        return 778

    async def fake_notify_revision_round_updated(**kwargs):
        revision_ws_calls.append(kwargs)
        return True

    monkeypatch.setattr("bot.api.routers.orders.finalize_order_status_change", fake_finalize)
    monkeypatch.setattr("bot.api.routers.orders.sync_order_chat_conversation", fake_sync_order_chat_conversation)
    monkeypatch.setattr("bot.api.routers.orders.get_bot", lambda: bot)
    monkeypatch.setattr("bot.api.websocket.notify_revision_round_updated", fake_notify_revision_round_updated)

    response = await request_revision(
        order.id,
        RevisionRequestData(message="  Докину скриншот и финальные замечания  "),
        tg_user=TelegramUser(id=user.telegram_id, first_name="Client", username=user.username),
        session=session,
    )

    assert response.success is True
    assert response.revision_count == 4
    assert finalize_calls == []
    assert session.commit_calls == 1
    assert len(session.added) == 1
    assert isinstance(session.added[0], OrderMessage)
    assert session.added[0].revision_round_id == current_round.id
    assert current_round.last_client_activity_at is not None
    assert revision_ws_calls[0]["revision_round_id"] == current_round.id
    assert revision_ws_calls[0]["round_number"] == 4
    assert conversation_calls[0]["preview_text"] == "📝 Клиент дополнил правки"
    assert "ПРАВКА #4" in bot.sent_messages[0]["text"]


@pytest.mark.asyncio
async def test_confirm_batch_payment_handles_partial_finalize_failure(monkeypatch):
    user = make_user()
    first_order = make_order(order_id=1)
    second_order = make_order(order_id=2)
    session = FakeSession(user, [first_order, second_order])
    bot = FakeBot()
    finalized_orders: list[int] = []
    dispatches: list[object] = []

    async def fake_finalize(session, bot, order, change, *, dispatch):
        finalized_orders.append(order.id)
        dispatches.append(dispatch)
        if order.id == 2:
            raise RuntimeError("broken second finalize")
        return change

    summary_calls: list[dict[str, object]] = []
    order_alert_calls: list[dict[str, object]] = []

    async def fake_notify_admin_batch_payment_pending(**kwargs):
        summary_calls.append(kwargs)
        return True

    async def fake_send_admin_batch_payment_pending_summary(**kwargs):
        summary_calls.append({"bot_summary": kwargs})
        return True

    async def fake_send_admin_payment_pending_alert(**kwargs):
        order_alert_calls.append(kwargs)
        return None

    monkeypatch.setattr("bot.api.routers.orders.finalize_order_status_change", fake_finalize)
    monkeypatch.setattr("bot.api.routers.orders.get_bot", lambda: bot)
    monkeypatch.setattr("bot.api.websocket.notify_admin_batch_payment_pending", fake_notify_admin_batch_payment_pending)
    monkeypatch.setattr(
        "bot.services.admin_payment_notifications.send_admin_batch_payment_pending_summary",
        fake_send_admin_batch_payment_pending_summary,
    )
    monkeypatch.setattr(
        "bot.services.admin_payment_notifications.send_admin_payment_pending_alert",
        fake_send_admin_payment_pending_alert,
    )

    response = await confirm_batch_payment(
        None,
        BatchPaymentConfirmRequest(order_ids=[1, 2], payment_method="sbp", payment_scheme="half"),
        tg_user=TelegramUser(id=user.telegram_id, first_name="Client", username=user.username),
        session=session,
    )

    assert response.success is True
    assert response.processed_count == 1
    assert response.failed_orders == [2]
    assert response.total_amount == 500.0
    assert response.processed_orders[0].id == 1
    assert response.processed_orders[0].amount_to_pay == 500.0
    assert response.failed_order_details[0].id == 2
    assert finalized_orders == [1, 2]
    assert dispatches[0].notification_extra_data["amount_to_pay"] == 500.0
    assert dispatches[0].notification_extra_data["batch_orders_count"] == 2
    assert dispatches[0].notification_extra_data["batch_total_amount"] == 1000.0
    assert dispatches[0].notification_extra_data["batch_order_ids"] == [1, 2]
    assert summary_calls
    assert any(
        (
            call.get("orders_count") == 1
            or call.get("bot_summary", {}).get("processed_orders", [{}])[0].get("id") == 1
        )
        for call in summary_calls
        if isinstance(call, dict)
    )
    assert order_alert_calls[0]["order"].id == 1
    assert "#1" in bot.sent_messages[0]["text"]
    assert "#2" in bot.sent_messages[0]["text"]
    assert "Не удалось включить" in bot.sent_messages[0]["text"]


@pytest.mark.asyncio
async def test_get_batch_payment_info_supports_followup_payment_orders():
    user = make_user()
    waiting_order = make_order(order_id=1, status=OrderStatus.WAITING_PAYMENT.value, final_price=2000.0, paid_amount=0.0)
    followup_order = make_order(order_id=2, status=OrderStatus.REVIEW.value, final_price=3000.0, paid_amount=1000.0)
    session = FakeSession([waiting_order, followup_order])

    response = await get_batch_payment_info(
        BatchPaymentInfoRequest(order_ids=[1, 2]),
        tg_user=TelegramUser(id=user.telegram_id, first_name="Client", username=user.username),
        session=session,
    )

    assert response.orders_count == 2
    assert response.orders[0].payment_phase == "initial"
    assert response.orders[0].amount_for_half == 1000.0
    assert response.orders[0].amount_for_full == 2000.0
    assert response.orders[1].payment_phase == "final"
    assert response.orders[1].amount_for_half == 2000.0
    assert response.orders[1].amount_for_full == 2000.0
    assert response.total_amount_half == 3000.0
    assert response.total_amount_full == 4000.0

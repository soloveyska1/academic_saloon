from sqlalchemy import BigInteger, String, Float, DateTime, Integer, Text, ForeignKey, Enum, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.db import Base
from datetime import datetime
import enum


class OrderStatus(str, enum.Enum):
    """Статусы заказа"""
    DRAFT = "draft"              # Черновик (заполняется)
    PENDING = "pending"          # Ожидает оценки
    WAITING_ESTIMATION = "waiting_estimation"  # Спецзаказ: ждёт ручной оценки админа
    WAITING_PAYMENT = "waiting_payment"  # Цена рассчитана, ждёт оплаты
    VERIFICATION_PENDING = "verification_pending"  # Пользователь нажал "Я оплатил", ждём проверки админа
    CONFIRMED = "confirmed"      # Подтверждён (legacy, для совместимости)
    PAID = "paid"                # Оплачен аванс
    PAID_FULL = "paid_full"      # Оплачен полностью
    IN_PROGRESS = "in_progress"  # В работе
    REVIEW = "review"            # На проверке у клиента
    REVISION = "revision"        # Правки запрошены клиентом
    COMPLETED = "completed"      # Завершён
    CANCELLED = "cancelled"      # Отменён
    REJECTED = "rejected"        # Отклонён админом


class PaymentScheme(str, enum.Enum):
    """Схемы оплаты"""
    FULL = "full"        # 100% сразу
    HALF = "half"        # 50% аванс + 50% после


class WorkType(str, enum.Enum):
    """Типы работ"""
    MASTERS = "masters"              # Магистерская
    DIPLOMA = "diploma"              # Дипломная (ВКР)
    COURSEWORK = "coursework"        # Курсовая
    INDEPENDENT = "independent"      # Самостоятельная
    ESSAY = "essay"                  # Эссе
    REPORT = "report"                # Реферат
    CONTROL = "control"              # Контрольная
    PRESENTATION = "presentation"    # Презентация
    PRACTICE = "practice"            # Отчёт по практике
    OTHER = "other"                  # Другое
    PHOTO_TASK = "photo_task"        # Просто фото задания (быстрый заказ)


WORK_TYPE_LABELS = {
    WorkType.MASTERS: "🎩 Магистерская",
    WorkType.DIPLOMA: "🎓 Диплом (ВКР)",
    WorkType.COURSEWORK: "📚 Курсовая",
    WorkType.INDEPENDENT: "📖 Самостоятельная",
    WorkType.ESSAY: "📝 Эссе",
    WorkType.REPORT: "📄 Реферат",
    WorkType.CONTROL: "✏️ Контрольная",
    WorkType.PRESENTATION: "📊 Презентация",
    WorkType.PRACTICE: "🏢 Отчёт по практике",
    WorkType.OTHER: "🦄 Спецзадача",
    WorkType.PHOTO_TASK: "📸 Фото задания",
}


# Минимальные цены для калькулятора (психологические)
WORK_TYPE_PRICES = {
    WorkType.MASTERS: "от 44 900₽",
    WorkType.DIPLOMA: "от 34 900₽",
    WorkType.COURSEWORK: "от 11 900₽",
    WorkType.INDEPENDENT: "от 2 400₽",
    WorkType.ESSAY: "от 1 400₽",
    WorkType.REPORT: "от 900₽",
    WorkType.CONTROL: "от 1 400₽",
    WorkType.PRESENTATION: "от 1 900₽",
    WorkType.PRACTICE: "от 4 900₽",
    WorkType.OTHER: "индивидуально",
}

# Типичные сроки выполнения
WORK_TYPE_DEADLINES = {
    WorkType.MASTERS: "от 3 нед",
    WorkType.DIPLOMA: "от 2 нед",
    WorkType.COURSEWORK: "5-7 дней",
    WorkType.INDEPENDENT: "2-3 дня",
    WorkType.ESSAY: "1-2 дня",
    WorkType.REPORT: "1-2 дня",
    WorkType.CONTROL: "1-2 дня",
    WorkType.PRESENTATION: "2-3 дня",
    WorkType.PRACTICE: "3-5 дней",
    WorkType.OTHER: "",
}


# ══════════════════════════════════════════════════════════════
#           ЦЕНТРАЛИЗОВАННЫЕ МЕТАДАННЫЕ СТАТУСОВ
# ══════════════════════════════════════════════════════════════

ORDER_STATUS_META = {
    OrderStatus.DRAFT: {
        "emoji": "📝",
        "label": "Черновик",
        "short_label": "Черновик",
        "description": "",
        "is_active": False,
        "is_final": False,
        "user_can_cancel": True,
        "show_in_history": False,
    },
    OrderStatus.PENDING: {
        "emoji": "⏳",
        "label": "Ожидает оценки",
        "short_label": "Ожидает",
        "description": "Скоро назначу цену",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": True,
        "show_in_history": False,
    },
    OrderStatus.WAITING_ESTIMATION: {
        "emoji": "🔍",
        "label": "Оценивается",
        "short_label": "Оценка",
        "description": "Менеджер оценивает стоимость",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": True,
        "show_in_history": False,
    },
    OrderStatus.WAITING_PAYMENT: {
        "emoji": "💵",
        "label": "Ждёт оплаты",
        "short_label": "К оплате",
        "description": "Цена готова, жду оплату",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": True,
        "show_in_history": False,
    },
    OrderStatus.VERIFICATION_PENDING: {
        "emoji": "🔔",
        "label": "Проверка оплаты",
        "short_label": "Проверка",
        "description": "Админ проверяет платёж",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.CONFIRMED: {
        "emoji": "✅",
        "label": "Ждёт оплаты",
        "short_label": "К оплате",
        "description": "Цена назначена",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": True,
        "show_in_history": False,
    },
    OrderStatus.PAID: {
        "emoji": "💳",
        "label": "Аванс оплачен",
        "short_label": "Аванс",
        "description": "Приступаю к работе",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.PAID_FULL: {
        "emoji": "💰",
        "label": "Оплачен",
        "short_label": "Оплачен",
        "description": "В приоритете",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.IN_PROGRESS: {
        "emoji": "⚙️",
        "label": "В работе",
        "short_label": "В работе",
        "description": "Скоро будет готово",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.REVIEW: {
        "emoji": "🔍",
        "label": "Готово",
        "short_label": "Готово",
        "description": "Проверь и напиши, если что",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.REVISION: {
        "emoji": "✏️",
        "label": "Правки",
        "short_label": "Правки",
        "description": "Вносим исправления",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.COMPLETED: {
        "emoji": "✅",
        "label": "Завершён",
        "short_label": "Завершён",
        "description": "",
        "is_active": False,
        "is_final": True,
        "user_can_cancel": False,
        "show_in_history": True,
    },
    OrderStatus.CANCELLED: {
        "emoji": "—",
        "label": "Отменён",
        "short_label": "Отменён",
        "description": "",
        "is_active": False,
        "is_final": True,
        "user_can_cancel": False,
        "show_in_history": True,
    },
    OrderStatus.REJECTED: {
        "emoji": "—",
        "label": "Отклонён",
        "short_label": "Отклонён",
        "description": "",
        "is_active": False,
        "is_final": True,
        "user_can_cancel": False,
        "show_in_history": True,
    },
}


def get_status_meta(status: str | OrderStatus) -> dict:
    """Получить метаданные статуса"""
    if isinstance(status, str):
        try:
            status = OrderStatus(status)
        except ValueError:
            return ORDER_STATUS_META.get(OrderStatus.PENDING, {})
    return ORDER_STATUS_META.get(status, {})


def get_active_statuses() -> list[str]:
    """Получить список активных статусов"""
    return [s.value for s, meta in ORDER_STATUS_META.items() if meta.get("is_active")]


def get_history_statuses() -> list[str]:
    """Получить список статусов для истории (завершённые)"""
    return [s.value for s, meta in ORDER_STATUS_META.items() if meta.get("show_in_history")]


def get_cancelable_statuses() -> list[str]:
    """Получить список статусов, которые пользователь может отменить"""
    return [s.value for s, meta in ORDER_STATUS_META.items() if meta.get("user_can_cancel")]


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Связь с пользователем
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.telegram_id"), index=True)

    # Основная информация
    work_type: Mapped[str] = mapped_column(String(50))
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    topic: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Финансы
    # TODO: migrate all financial Float fields → Numeric(12,2) for precision (requires Alembic migration)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    promo_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Примененный промокод
    promo_discount: Mapped[float] = mapped_column(Float, default=0.0)  # Скидка от промокода (%)
    bonus_used: Mapped[float] = mapped_column(Float, default=0.0)  # Списанные бонусы
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)

    # Схема и способ оплаты
    payment_scheme: Mapped[str | None] = mapped_column(String(20), nullable=True)  # full / half
    payment_method: Mapped[str | None] = mapped_column(String(20), nullable=True)  # card / sbp / transfer
    yookassa_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # ID платежа в ЮKassa

    # Статус
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.DRAFT.value)

    # Прогресс выполнения (0-100%)
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    progress_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Служебное
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    files_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Yandex.Disk folder URL
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # Работа сдана (старт 30-дневных правок)
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # Напоминание отправлено
    review_submitted: Mapped[bool] = mapped_column(default=False)  # Отзыв оставлен
    revision_count: Mapped[int] = mapped_column(Integer, default=0)  # Счётчик кругов правок (3 бесплатно)
    is_archived: Mapped[bool] = mapped_column(default=False)  # Архивный заказ (скрыт из основного списка)

    # Live-карточка в канале заказов
    channel_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # ID сообщения в канале

    @property
    def status_label(self) -> str:
        """Человекочитаемый статус с emoji"""
        meta = get_status_meta(self.status)
        emoji = meta.get("emoji", "📋")
        label = meta.get("label", self.status)
        return f"{emoji} {label}"

    @property
    def status_meta(self) -> dict:
        """Полные метаданные текущего статуса"""
        return get_status_meta(self.status)

    @property
    def can_be_cancelled(self) -> bool:
        """Может ли пользователь отменить этот заказ"""
        return self.status in get_cancelable_statuses()

    @property
    def is_active(self) -> bool:
        """Является ли заказ активным"""
        return self.status in get_active_statuses()

    @property
    def work_type_label(self) -> str:
        """Человекочитаемый тип работы"""
        try:
            return WORK_TYPE_LABELS.get(WorkType(self.work_type), self.work_type)
        except ValueError:
            return self.work_type

    @property
    def final_price(self) -> float:
        """Итоговая цена с учётом скидки, промокода и бонусов"""
        # Сначала применяем скидку лояльности
        price_with_discount = self.price * (1 - self.discount / 100)
        # Затем применяем скидку по промокоду
        promo_discount = getattr(self, 'promo_discount', 0) or 0
        price_with_promo = price_with_discount * (1 - promo_discount / 100)
        # И в конце вычитаем бонусы
        return max(0, price_with_promo - self.bonus_used)


class MessageSender(str, enum.Enum):
    """Отправитель сообщения в чате заказа"""
    ADMIN = "admin"
    CLIENT = "client"


class OrderMessage(Base):
    """
    Сообщения в приватном чате по заказу.
    Хранит историю переписки между админом и клиентом.
    """
    __tablename__ = "order_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Связь с заказом
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"), index=True)

    # Кто отправил
    sender_type: Mapped[str] = mapped_column(String(20))  # admin / client
    sender_id: Mapped[int] = mapped_column(BigInteger)  # telegram_id отправителя

    # Контент сообщения
    message_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Файл (если есть)
    file_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # photo/document/voice/video
    file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Telegram file_id
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Оригинальное имя файла
    yadisk_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Ссылка на Яндекс.Диск

    # Telegram message IDs для редактирования/удаления
    admin_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # ID сообщения у админа
    client_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # ID сообщения у клиента

    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_read: Mapped[bool] = mapped_column(default=False)  # Прочитано ли получателем

    # Relationship
    order: Mapped["Order"] = relationship("Order", backref="messages")


class ConversationType(str, enum.Enum):
    """Типы диалогов"""
    ORDER_CHAT = "order_chat"  # Чат по заказу
    SUPPORT = "support"        # Обращение в поддержку
    FREE = "free"              # Свободное сообщение


class Conversation(Base):
    """
    Диалог с клиентом.
    Единая точка для отслеживания всех переписок — с заказом или без.
    """
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Клиент
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.telegram_id"), index=True)

    # Привязка к заказу (опционально — может быть None для свободных диалогов)
    order_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("orders.id"), nullable=True, index=True)

    # Forum Topic ID в админской группе (message_thread_id)
    topic_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)

    # ID закреплённой карточки заказа внутри топика
    topic_card_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Тип диалога
    conversation_type: Mapped[str] = mapped_column(String(20), default=ConversationType.FREE.value)

    # Последнее сообщение (для превью)
    last_message_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_sender: Mapped[str | None] = mapped_column(String(20), nullable=True)  # admin / client

    # Статусы
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    # Непрочитанные сообщения (для админа)
    unread_count: Mapped[int] = mapped_column(Integer, default=0)

    # Метаданные
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships (lazy to avoid circular imports)
    # user: relationship to User via user_id
    # order: relationship to Order via order_id

    @property
    def type_emoji(self) -> str:
        """Эмодзи типа диалога"""
        type_map = {
            ConversationType.ORDER_CHAT.value: "📋",
            ConversationType.SUPPORT.value: "🛠️",
            ConversationType.FREE.value: "💬",
        }
        return type_map.get(self.conversation_type, "💬")

    @property
    def type_label(self) -> str:
        """Метка типа диалога"""
        type_map = {
            ConversationType.ORDER_CHAT.value: "Заказ",
            ConversationType.SUPPORT.value: "Поддержка",
            ConversationType.FREE.value: "Сообщение",
        }
        return type_map.get(self.conversation_type, "Диалог")

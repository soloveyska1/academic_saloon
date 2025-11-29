from sqlalchemy import BigInteger, String, Float, DateTime, Integer, Text, ForeignKey, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.db import Base
from datetime import datetime
import enum


class OrderStatus(str, enum.Enum):
    """Статусы заказа"""
    DRAFT = "draft"              # Черновик (заполняется)
    PENDING = "pending"          # Ожидает оценки
    CONFIRMED = "confirmed"      # Подтверждён, ждёт оплаты
    PAID = "paid"                # Оплачен аванс
    PAID_FULL = "paid_full"      # Оплачен полностью
    IN_PROGRESS = "in_progress"  # В работе
    REVIEW = "review"            # На проверке у клиента
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
    WorkType.OTHER: "📎 Другое",
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
        "description": "Заказ ещё заполняется",
        "is_active": False,
        "is_final": False,
        "user_can_cancel": True,
        "show_in_history": False,
    },
    OrderStatus.PENDING: {
        "emoji": "⏳",
        "label": "Ожидает оценки",
        "short_label": "Ожидает",
        "description": "Скоро посмотрю и назначу цену",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": True,
        "show_in_history": False,
    },
    OrderStatus.CONFIRMED: {
        "emoji": "✅",
        "label": "Подтверждён",
        "short_label": "Подтверждён",
        "description": "Цена назначена — можно оплачивать",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": True,
        "show_in_history": False,
    },
    OrderStatus.PAID: {
        "emoji": "💳",
        "label": "Аванс оплачен",
        "short_label": "Аванс",
        "description": "Аванс получен — приступаю к работе",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.PAID_FULL: {
        "emoji": "💰",
        "label": "Полностью оплачен",
        "short_label": "Оплачен",
        "description": "Полная оплата — в приоритете",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.IN_PROGRESS: {
        "emoji": "⚙️",
        "label": "В работе",
        "short_label": "В работе",
        "description": "Работа кипит — скоро будет готово",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.REVIEW: {
        "emoji": "🔍",
        "label": "На проверке",
        "short_label": "Проверка",
        "description": "Готово — проверь и подтверди",
        "is_active": True,
        "is_final": False,
        "user_can_cancel": False,
        "show_in_history": False,
    },
    OrderStatus.COMPLETED: {
        "emoji": "✨",
        "label": "Завершён",
        "short_label": "Готово",
        "description": "Заказ выполнен — спасибо!",
        "is_active": False,
        "is_final": True,
        "user_can_cancel": False,
        "show_in_history": True,
    },
    OrderStatus.CANCELLED: {
        "emoji": "❌",
        "label": "Отменён",
        "short_label": "Отменён",
        "description": "Заказ отменён",
        "is_active": False,
        "is_final": True,
        "user_can_cancel": False,
        "show_in_history": True,
    },
    OrderStatus.REJECTED: {
        "emoji": "🚫",
        "label": "Отклонён",
        "short_label": "Отклонён",
        "description": "К сожалению, не могу взять этот заказ",
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
    price: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    bonus_used: Mapped[float] = mapped_column(Float, default=0.0)  # Списанные бонусы
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)

    # Схема и способ оплаты
    payment_scheme: Mapped[str | None] = mapped_column(String(20), nullable=True)  # full / half
    payment_method: Mapped[str | None] = mapped_column(String(20), nullable=True)  # card / sbp / transfer
    yookassa_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # ID платежа в ЮKassa

    # Статус
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.DRAFT.value)

    # Служебное
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # Напоминание отправлено

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
        """Итоговая цена с учётом скидки и бонусов"""
        price_with_discount = self.price * (1 - self.discount / 100)
        return max(0, price_with_discount - self.bonus_used)

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
    IN_PROGRESS = "in_progress"  # В работе
    REVIEW = "review"            # На проверке у клиента
    COMPLETED = "completed"      # Завершён
    CANCELLED = "cancelled"      # Отменён


class WorkType(str, enum.Enum):
    """Типы работ"""
    COURSEWORK = "coursework"        # Курсовая
    DIPLOMA = "diploma"              # Дипломная
    ESSAY = "essay"                  # Эссе
    REPORT = "report"                # Реферат
    CONTROL = "control"              # Контрольная
    PRESENTATION = "presentation"    # Презентация
    PRACTICE = "practice"            # Отчёт по практике
    OTHER = "other"                  # Другое


WORK_TYPE_LABELS = {
    WorkType.COURSEWORK: "📚 Курсовая",
    WorkType.DIPLOMA: "🎓 Дипломная",
    WorkType.ESSAY: "📝 Эссе",
    WorkType.REPORT: "📄 Реферат",
    WorkType.CONTROL: "✏️ Контрольная",
    WorkType.PRESENTATION: "📊 Презентация",
    WorkType.PRACTICE: "🏢 Отчёт по практике",
    WorkType.OTHER: "📎 Другое",
}


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
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)

    # Статус
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.DRAFT.value)

    # Служебное
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def status_label(self) -> str:
        """Человекочитаемый статус"""
        labels = {
            OrderStatus.DRAFT.value: "📝 Черновик",
            OrderStatus.PENDING.value: "⏳ Ожидает оценки",
            OrderStatus.CONFIRMED.value: "✅ Подтверждён",
            OrderStatus.PAID.value: "💰 Оплачен",
            OrderStatus.IN_PROGRESS.value: "⚙️ В работе",
            OrderStatus.REVIEW.value: "🔍 На проверке",
            OrderStatus.COMPLETED.value: "✨ Завершён",
            OrderStatus.CANCELLED.value: "❌ Отменён",
        }
        return labels.get(self.status, self.status)

    @property
    def work_type_label(self) -> str:
        """Человекочитаемый тип работы"""
        try:
            return WORK_TYPE_LABELS.get(WorkType(self.work_type), self.work_type)
        except ValueError:
            return self.work_type

    @property
    def final_price(self) -> float:
        """Итоговая цена с учётом скидки"""
        return self.price * (1 - self.discount / 100)

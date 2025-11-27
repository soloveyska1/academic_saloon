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
    REJECTED = "rejected"        # Отклонён админом


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


# Минимальные цены для калькулятора
WORK_TYPE_PRICES = {
    WorkType.MASTERS: "от 45 000₽",
    WorkType.DIPLOMA: "от 35 000₽",
    WorkType.COURSEWORK: "от 12 000₽",
    WorkType.INDEPENDENT: "от 2 500₽",
    WorkType.ESSAY: "от 1 500₽",
    WorkType.REPORT: "от 1 000₽",
    WorkType.CONTROL: "от 1 500₽",
    WorkType.PRESENTATION: "от 2 000₽",
    WorkType.PRACTICE: "от 5 000₽",
    WorkType.OTHER: "индивидуально",
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
    bonus_used: Mapped[float] = mapped_column(Float, default=0.0)  # Списанные бонусы
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)

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
            OrderStatus.REJECTED.value: "🚫 Отклонён",
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
        """Итоговая цена с учётом скидки и бонусов"""
        price_with_discount = self.price * (1 - self.discount / 100)
        return max(0, price_with_discount - self.bonus_used)

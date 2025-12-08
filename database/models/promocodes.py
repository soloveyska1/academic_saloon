from sqlalchemy import BigInteger, String, Float, DateTime, Integer, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.db import Base
from datetime import datetime

class PromoCode(Base):
    __tablename__ = "promocodes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    discount_percent: Mapped[float] = mapped_column(Float)  # Процент скидки (например, 10.0 для 10%)
    
    # Ограничения
    max_uses: Mapped[int] = mapped_column(Integer, default=0)  # 0 = безлимит
    current_uses: Mapped[int] = mapped_column(Integer, default=0)
    
    # Срок действия
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Кто создал (админ)
    created_by: Mapped[int] = mapped_column(BigInteger, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class PromoCodeUsage(Base):
    """
    Tracks promo code usage by users.

    When an order is cancelled, the usage is marked as inactive (soft delete)
    rather than being deleted. This allows the user to use the promo again.
    """
    __tablename__ = "promocode_usages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    promocode_id: Mapped[int] = mapped_column(Integer, ForeignKey("promocodes.id"))
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.telegram_id"))
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id"))

    discount_amount: Mapped[float] = mapped_column(Float)  # How much was saved

    # Soft delete support for promo return on order cancellation
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    promocode: Mapped["PromoCode"] = relationship("PromoCode", backref="usages")

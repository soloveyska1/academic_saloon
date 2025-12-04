"""
Pydantic schemas for Mini App API responses
"""

import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator, Field


class RankInfo(BaseModel):
    """User rank information (spend-based)"""
    name: str
    emoji: str
    level: int
    next_rank: Optional[str] = None
    progress: int  # 0-100
    spent_to_next: int  # Amount to spend for next rank


class LoyaltyInfo(BaseModel):
    """User loyalty status (orders-based)"""
    status: str
    emoji: str
    level: int
    discount: int  # Discount percentage
    orders_to_next: int  # Orders needed for next level


class OrderResponse(BaseModel):
    """Order data for Mini App"""
    id: int
    status: str
    work_type: str
    work_type_label: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    deadline: Optional[str] = None
    price: float
    final_price: float
    paid_amount: float
    discount: float
    bonus_used: float
    progress: int
    payment_scheme: Optional[str] = None  # full / half
    created_at: str
    completed_at: Optional[str] = None

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """Full user profile for Mini App"""
    id: int
    telegram_id: int
    username: Optional[str] = None
    fullname: str
    balance: float
    bonus_balance: float
    orders_count: int
    total_spent: float
    discount: float
    referral_code: str
    daily_luck_available: bool
    rank: RankInfo
    loyalty: LoyaltyInfo
    orders: List[OrderResponse]

    class Config:
        from_attributes = True


class OrdersListResponse(BaseModel):
    """Paginated orders list"""
    orders: List[OrderResponse]
    total: int
    has_more: bool


class PromoCodeRequest(BaseModel):
    """Promo code application request"""
    code: str = Field(..., min_length=1, max_length=50)

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        # Only allow alphanumeric characters
        cleaned = re.sub(r'[^A-Za-z0-9]', '', v)
        if not cleaned:
            raise ValueError('Некорректный промокод')
        return cleaned.upper()


class PromoCodeResponse(BaseModel):
    """Promo code result"""
    success: bool
    message: str
    discount: Optional[int] = None


class RouletteResponse(BaseModel):
    """Daily roulette spin result"""
    success: bool
    prize: Optional[str] = None
    type: Optional[str] = None  # 'bonus', 'discount', 'nothing'
    value: Optional[int] = None
    message: str
    next_spin_at: Optional[str] = None


class ConfigResponse(BaseModel):
    """Public configuration for Mini App"""
    bot_username: str
    support_username: str
    reviews_channel: str


# ═══════════════════════════════════════════════════════════════════════════
#  ORDER CREATION SCHEMAS (Web App First)
# ═══════════════════════════════════════════════════════════════════════════

class OrderCreateRequest(BaseModel):
    """Request to create a new order from Mini App"""
    work_type: str = Field(..., min_length=1, max_length=50)
    subject: str = Field(..., min_length=1, max_length=200)
    topic: Optional[str] = Field(None, max_length=500)
    deadline: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=5000)

    @field_validator('subject', 'topic', 'description')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        # Strip whitespace and limit consecutive newlines
        v = v.strip()
        v = re.sub(r'\n{3,}', '\n\n', v)
        # Remove potential script tags (basic XSS prevention)
        v = re.sub(r'<script[^>]*>.*?</script>', '', v, flags=re.IGNORECASE | re.DOTALL)
        v = re.sub(r'<[^>]+>', '', v)  # Remove all HTML tags
        return v

    @field_validator('work_type')
    @classmethod
    def validate_work_type(cls, v: str) -> str:
        valid_types = [
            'masters', 'diploma', 'coursework', 'practice', 'essay',
            'presentation', 'control', 'independent', 'report', 'photo_task', 'other'
        ]
        if v not in valid_types:
            raise ValueError(f'Некорректный тип работы: {v}')
        return v

    @field_validator('deadline')
    @classmethod
    def validate_deadline(cls, v: str) -> str:
        valid_deadlines = [
            'today', 'tomorrow', '3days', 'week', '2weeks', 'month', 'flexible'
        ]
        # Allow valid keys or custom dates in format DD.MM.YYYY
        if v not in valid_deadlines:
            if not re.match(r'^\d{1,2}\.\d{1,2}\.\d{4}$', v):
                raise ValueError('Некорректный срок выполнения')
        return v


class OrderCreateResponse(BaseModel):
    """Response after order creation"""
    success: bool
    order_id: int
    message: str
    price: Optional[float] = None
    is_manual_required: bool = False  # True for 'other' type - needs admin estimation

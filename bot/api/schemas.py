"""
Pydantic schemas for Mini App API responses
"""

import re
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, field_validator, Field


class RankInfo(BaseModel):
    """User rank information (spend-based)"""
    name: str
    emoji: str
    level: int
    cashback: int  # Cashback percentage for current rank
    bonus: Optional[str] = None  # Bonus perk for this rank (e.g., "Персональный менеджер")
    next_rank: Optional[str] = None
    progress: int  # 0-100
    spent_to_next: int  # Amount to spend for next rank
    is_max: bool = False  # Whether user is at max rank


class LoyaltyInfo(BaseModel):
    """User loyalty status (orders-based)"""
    status: str
    emoji: str
    level: int
    discount: int  # Discount percentage
    orders_to_next: int  # Orders needed for next level


class BonusExpiryInfo(BaseModel):
    """Информация о сгорании бонусов"""
    has_expiry: bool = False  # Есть ли активные бонусы с датой сгорания
    balance: float = 0
    days_left: Optional[int] = None  # Дней до сгорания
    expiry_date: Optional[str] = None  # Дата сгорания
    burn_amount: Optional[int] = None  # Сколько сгорит
    status: Optional[str] = None  # ok / warning / expired
    status_text: Optional[str] = None  # Текст для UI
    color: Optional[str] = None  # Цвет для UI


class BalanceTransactionResponse(BaseModel):
    """История операций по бонусному балансу"""

    id: int
    amount: float
    type: str
    reason: str
    description: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


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
    promo_code: Optional[str] = None  # Applied promo code
    promo_discount: float = 0.0  # Promo discount percentage
    bonus_used: float
    progress: int
    payment_scheme: Optional[str] = None  # full / half
    files_url: Optional[str] = None  # Yandex.Disk folder URL with work files
    review_submitted: bool = False  # Whether review was submitted
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
    daily_bonus_streak: int = 0  # Days in a row claimed daily bonus
    rank: RankInfo
    loyalty: LoyaltyInfo
    bonus_expiry: Optional[BonusExpiryInfo] = None  # Информация о сгорании бонусов
    transactions: List[BalanceTransactionResponse]
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
        # Allow alphanumeric characters (Latin and Cyrillic)
        cleaned = re.sub(r'[^A-Za-z0-9А-Яа-яЁё]', '', v)
        if not cleaned:
            raise ValueError('Некорректный промокод')
        return cleaned.upper()


class PromoCodeResponse(BaseModel):
    """Promo code result"""
    success: bool
    message: str
    discount: Optional[float] = None  # Changed to float to support decimal discounts


class RouletteResponse(BaseModel):
    """Daily roulette spin result"""
    success: bool
    prize: Optional[str] = None
    type: Optional[str] = None  # 'bonus', 'discount', 'nothing'
    value: Optional[int] = None
    message: str
    next_spin_at: Optional[str] = None


class DailyBonusInfoResponse(BaseModel):
    """Daily bonus info for Mini App"""
    can_claim: bool
    streak: int  # Current streak (1-7)
    next_bonus: int  # Bonus amount for current/next day
    cooldown_remaining: Optional[str] = None  # "Xч Yмин" or None if can claim
    bonuses: List[int]  # Array of bonus amounts [10, 20, 30, 40, 50, 100, 150]


class DailyBonusClaimResponse(BaseModel):
    """Daily bonus claim result"""
    success: bool
    won: bool
    bonus: int  # Actual bonus won (0 if lost)
    streak: int  # Updated streak
    message: str
    next_claim_at: Optional[str] = None  # When can claim next


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
    promo_code: Optional[str] = Field(None, max_length=50)  # Optional promo code

    @field_validator('subject', 'topic', 'description')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        # Strip whitespace and limit consecutive newlines
        v = v.strip()
        v = re.sub(r'\\n{3,}', '\\n\\n', v)
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
            if not re.match(r'^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$', v):
                raise ValueError('Некорректный срок выполнения')
        return v

    @field_validator('promo_code')
    @classmethod
    def validate_promo_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == '':
            return None
        # Clean and uppercase
        return re.sub(r'[^A-Za-z0-9]', '', v).upper()


class OrderCreateResponse(BaseModel):
    """Response after order creation"""
    success: bool
    order_id: int
    message: str
    price: Optional[float] = None
    is_manual_required: bool = False  # True for 'other' type - needs admin estimation
    promo_applied: bool = False  # True if promo code was successfully applied
    promo_failed: bool = False  # True if promo code was provided but failed
    promo_failure_reason: Optional[str] = None  # Reason why promo failed (if promo_failed=True)


class ChatMessage(BaseModel):
    """Message in a support/order chat"""
    id: int
    sender_type: str  # admin / client
    sender_name: str
    message_text: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    created_at: str
    is_read: bool


class ChatMessagesListResponse(BaseModel):
    """List of chat messages"""
    order_id: int
    messages: List[ChatMessage]
    unread_count: int


class SendMessageResponse(BaseModel):
    """Response for sending a message"""
    success: bool
    message_id: int
    message: str


class ChatMessageResponse(BaseModel):
    """Single chat message response"""
    success: bool
    message_id: int
    message: str


class ChatMessagesResponse(BaseModel):
    """Chat messages response for support"""
    messages: List[ChatMessage]
    unread_count: int = 0


# --- ADMIN SCHEMAS ---

class AdminSqlRequest(BaseModel):
    query: str

class AdminSqlResponse(BaseModel):
    columns: List[str]
    rows: List[List[Any]]
    error: Optional[str] = None

class AdminStatsResponse(BaseModel):
    revenue: float
    active_orders_count: int
    total_users_count: int

class AdminUserResponse(BaseModel):
    internal_id: int
    telegram_id: int
    fullname: str
    username: Optional[str] = None
    is_admin: bool
    last_active: Optional[str] = None

class AdminOrderUpdate(BaseModel):
    status: str

class AdminPriceUpdate(BaseModel):
    price: float

class AdminMessageRequest(BaseModel):
    text: str

class AdminProgressUpdate(BaseModel):
    percent: int
    status_text: Optional[str] = None


class FileUploadResponse(BaseModel):
    success: bool
    message: str
    files_url: Optional[str] = None
    uploaded_count: int = 0

class PaymentConfirmRequest(BaseModel):
    payment_method: str
    payment_scheme: str

class PaymentConfirmResponse(BaseModel):
    success: bool
    message: str
    new_status: str
    amount_to_pay: float

class PaymentInfoResponse(BaseModel):
    order_id: int
    status: str
    price: float
    final_price: float
    discount: float
    bonus_used: float
    paid_amount: float
    remaining: float
    card_number: str
    card_holder: str
    sbp_phone: str
    sbp_bank: str

class SubmitReviewRequest(BaseModel):
    rating: int
    text: str

class SubmitReviewResponse(BaseModel):
    success: bool
    message: str

class RevisionRequestData(BaseModel):
    message: str

class RevisionRequestResponse(BaseModel):
    success: bool
    message: str
    prefilled_text: str
    revision_count: int
    is_paid: bool

class ConfirmWorkResponse(BaseModel):
    success: bool
    message: str

class SendMessageRequest(BaseModel):
    text: str

class ChatFileUploadResponse(BaseModel):
    success: bool
    message_id: int
    message: str
    file_url: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#  BATCH PAYMENT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class BatchOrderItem(BaseModel):
    """Single order info for batch payment"""
    id: int
    work_type_label: str
    subject: Optional[str] = None
    final_price: float
    remaining: float


class BatchPaymentInfoRequest(BaseModel):
    """Request for batch payment info"""
    order_ids: List[int] = Field(..., min_length=1)


class BatchPaymentInfoResponse(BaseModel):
    """Batch payment info response"""
    orders: List[BatchOrderItem]
    total_amount: float
    orders_count: int
    card_number: str
    card_holder: str
    sbp_phone: str
    sbp_bank: str


class BatchPaymentConfirmRequest(BaseModel):
    """Batch payment confirmation request"""
    order_ids: List[int] = Field(..., min_length=1)
    payment_method: str  # card / sbp
    payment_scheme: str  # full / half


class BatchPaymentConfirmResponse(BaseModel):
    """Batch payment confirmation response"""
    success: bool
    message: str
    processed_count: int
    total_amount: float
    failed_orders: List[int] = []

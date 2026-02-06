"""
Pydantic schemas for Mini App API responses
"""

import re
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field, field_validator


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

    model_config = ConfigDict(from_attributes=True)


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
    is_archived: bool = False  # Whether order is archived
    revision_count: int = 0  # Number of revision rounds (3 free included)
    created_at: str
    completed_at: Optional[str] = None
    delivered_at: Optional[str] = None  # When work was delivered (30-day revision period)

    model_config = ConfigDict(from_attributes=True)


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
    referrals_count: int = 0  # Number of referrals invited
    daily_luck_available: bool
    daily_bonus_streak: int = 0  # Days in a row claimed daily bonus
    free_spins: int = 0  # Legacy roulette field (kept for frontend compat)
    roulette_onboarding_seen: bool = True  # Legacy roulette field (kept for frontend compat)
    rank: RankInfo
    loyalty: LoyaltyInfo
    bonus_expiry: Optional[BonusExpiryInfo] = None  # Информация о сгорании бонусов
    transactions: List[BalanceTransactionResponse]
    orders: List[OrderResponse]

    model_config = ConfigDict(from_attributes=True)


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
        # Принимаем оба формата: с underscore (от бота) и без (от mini app)
        valid_deadlines = [
            'today', 'tomorrow', '3days', '3_days', 'week', '2weeks', '2_weeks', 'month', 'flexible'
        ]
        # Allow valid keys or custom dates in format DD.MM.YYYY
        if v not in valid_deadlines:
            if not re.match(r'^\d{1,2}\.\d{1,2}\.\d{4}$', v):
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

class RecentActivityItem(BaseModel):
    type: str  # 'order', 'payment', 'user', 'system'
    message: str
    time: str

class AdminStatsResponse(BaseModel):
    revenue: float
    active_orders_count: int
    total_users_count: int
    # Extended CRM fields
    orders_by_status: Optional[Dict[str, int]] = None
    new_users_today: Optional[int] = None
    completed_today: Optional[int] = None
    revenue_this_week: Optional[float] = None
    revenue_last_week: Optional[float] = None
    average_order_value: Optional[float] = None
    recent_activity: Optional[List[RecentActivityItem]] = None

class DailyRevenueItem(BaseModel):
    date: str
    revenue: float
    orders_count: int

class RevenueChartResponse(BaseModel):
    data: List[DailyRevenueItem]
    total: float
    period_days: int

class AdminUserResponse(BaseModel):
    internal_id: int
    telegram_id: int
    fullname: str
    username: Optional[str] = None
    is_admin: bool
    is_banned: Optional[bool] = None
    last_active: Optional[str] = None

class ClientOrderSummary(BaseModel):
    id: int
    status: str
    work_type: str
    subject: Optional[str] = None
    price: float
    final_price: float
    paid_amount: float
    created_at: str
    completed_at: Optional[str] = None

class ClientProfileResponse(BaseModel):
    """Full client profile for CRM"""
    id: int
    telegram_id: int
    fullname: str
    username: Optional[str] = None
    is_banned: bool = False
    admin_notes: Optional[str] = None
    created_at: Optional[str] = None
    last_active: Optional[str] = None
    # Financial
    balance: float = 0
    bonus_balance: float = 0
    total_spent: float = 0
    # Loyalty
    rank_name: str = "Новичок"
    rank_emoji: str = "🌱"
    loyalty_status: str = "Стандарт"
    loyalty_discount: int = 0
    # Stats
    orders_count: int = 0
    completed_orders: int = 0
    cancelled_orders: int = 0
    # Referrals
    referrals_count: int = 0
    referral_earnings: float = 0
    # Orders
    orders: List[ClientOrderSummary] = []
    # Segment
    segment: str = "new"  # new, active, vip, dormant, churned

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


# ═══════════════════════════════════════════════════════════════════════════
#  LIVE FEED SCHEMAS (Real-time admin notifications)
# ═══════════════════════════════════════════════════════════════════════════

class LiveEvent(BaseModel):
    """Single live event for admin feed"""
    id: str  # Unique event ID (timestamp_type_entity_id)
    type: str  # new_order, payment_received, status_changed, new_message, new_user
    priority: str  # critical, high, normal, low
    title: str
    message: str
    order_id: Optional[int] = None
    user_id: Optional[int] = None
    amount: Optional[float] = None
    timestamp: str
    is_new: bool = True  # For highlighting new events


class LiveFeedResponse(BaseModel):
    """Live feed response with events and counters"""
    events: List[LiveEvent]
    counters: Dict[str, int]  # pending_orders, pending_payments, unread_messages
    last_update: str
    has_critical: bool = False  # True if there are critical events


# ═══════════════════════════════════════════════════════════════════════════
#  GOD MODE SCHEMAS (Admin Panel API)
# ═══════════════════════════════════════════════════════════════════════════

class GodOrderStatusRequest(BaseModel):
    """Request to update order status"""
    status: str = Field(..., min_length=1, max_length=50)

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = [
            'draft', 'pending', 'waiting_estimation', 'waiting_payment',
            'verification_pending', 'confirmed', 'paid', 'paid_full',
            'in_progress', 'review', 'revision', 'completed', 'cancelled', 'rejected'
        ]
        if v not in valid_statuses:
            raise ValueError(f'Некорректный статус: {v}')
        return v


class GodOrderPriceRequest(BaseModel):
    """Request to set order price"""
    price: float = Field(..., ge=0)

    @field_validator('price')
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v < 0:
            raise ValueError('Цена не может быть отрицательной')
        if v > 10_000_000:
            raise ValueError('Слишком большая цена')
        return v


class GodOrderProgressRequest(BaseModel):
    """Request to update order progress"""
    progress: int = Field(..., ge=0, le=100)
    status_text: Optional[str] = Field(None, max_length=500)


class GodPaymentConfirmRequest(BaseModel):
    """Request to confirm order payment"""
    amount: Optional[float] = Field(None, ge=0)
    is_full: bool = True


class GodPaymentRejectRequest(BaseModel):
    """Request to reject order payment"""
    reason: str = Field(default="Платёж не найден", max_length=500)


class GodOrderMessageRequest(BaseModel):
    """Request to send message about order"""
    text: str = Field(..., min_length=1, max_length=5000)

    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Текст сообщения не может быть пустым')
        return v


class GodOrderNotesRequest(BaseModel):
    """Request to update order admin notes"""
    notes: str = Field(default="", max_length=5000)


class GodUserBalanceRequest(BaseModel):
    """Request to modify user balance"""
    amount: float = Field(...)
    reason: str = Field(default="Admin adjustment", max_length=500)
    notify: bool = True

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v == 0:
            raise ValueError('Сумма не может быть нулевой')
        if abs(v) > 10_000_000:
            raise ValueError('Слишком большая сумма')
        return v


class GodUserBanRequest(BaseModel):
    """Request to ban/unban user"""
    ban: bool = True
    reason: str = Field(default="", max_length=500)


class GodUserWatchRequest(BaseModel):
    """Request to toggle user watch mode"""
    watch: bool = True


class GodUserNotesRequest(BaseModel):
    """Request to update user admin notes"""
    notes: str = Field(default="", max_length=5000)


class GodPromoCreateRequest(BaseModel):
    """Request to create promo code"""
    code: str = Field(..., min_length=3, max_length=50)
    discount_percent: float = Field(default=10, gt=0, le=100)
    max_uses: int = Field(default=0, ge=0)
    valid_until: Optional[str] = None
    new_users_only: bool = False

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) < 3:
            raise ValueError('Код должен содержать минимум 3 символа')
        # Allow alphanumeric characters only
        if not re.match(r'^[A-Z0-9]+$', v):
            raise ValueError('Код может содержать только буквы и цифры')
        return v

    @field_validator('valid_until')
    @classmethod
    def validate_valid_until(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        try:
            datetime.fromisoformat(v)
        except (ValueError, TypeError):
            raise ValueError('Некорректный формат даты (используйте ISO формат)')
        return v


class GodActivityUpdateRequest(BaseModel):
    """Request to update user activity tracking"""
    page: Optional[str] = Field(None, max_length=100)
    action: Optional[str] = Field(None, max_length=100)
    order_id: Optional[int] = None
    platform: Optional[str] = Field(None, max_length=50)


class GodSqlRequest(BaseModel):
    """Request to execute safe SQL query"""
    query: str = Field(..., min_length=1, max_length=10000)

    @field_validator('query')
    @classmethod
    def validate_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Запрос не может быть пустым')
        return v


class GodBroadcastRequest(BaseModel):
    """Request to send broadcast message"""
    text: str = Field(..., min_length=1, max_length=4000)
    target: str = Field(default="all")

    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Текст сообщения не может быть пустым')
        return v

    @field_validator('target')
    @classmethod
    def validate_target(cls, v: str) -> str:
        valid_targets = ['all', 'active', 'with_orders']
        if v not in valid_targets:
            raise ValueError(f'Некорректная целевая группа: {v}')
        return v

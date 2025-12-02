"""
Pydantic schemas for Mini App API responses
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


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
    code: str


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

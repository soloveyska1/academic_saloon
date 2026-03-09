"""
Single source of truth for rank and loyalty level definitions.

Used by:
- database/models/users.py (User.rank_info, User.loyalty_status)
- bot/api/routers/ (API responses)
- bot/texts/ (user-facing messages)
- mini-app/src/lib/ranks.ts (frontend — keep in sync manually)

When changing ranks here, also update:
1. Frontend: mini-app/src/lib/ranks.ts
2. Database: create Alembic migration to update rank_levels / loyalty_levels tables
"""
from dataclasses import dataclass
from typing import Optional


# ══════════════════════════════════════════════════════════════
#                    RANK TIERS (SPEND-BASED)
# ══════════════════════════════════════════════════════════════

@dataclass(frozen=True)
class RankTier:
    """Rank tier based on total amount spent."""
    id: str
    name: str
    min_spent: int        # Minimum total_spent in ₽
    cashback_percent: int  # Cashback percentage
    bonus: Optional[str] = None  # Extra perk description


RANK_TIERS: list[RankTier] = [
    RankTier(
        id="resident",
        name="Резидент",
        min_spent=0,
        cashback_percent=3,
    ),
    RankTier(
        id="partner",
        name="Партнёр",
        min_spent=5_000,
        cashback_percent=5,
    ),
    RankTier(
        id="priority",
        name="Приоритет",
        min_spent=15_000,
        cashback_percent=7,
        bonus="Приоритетная поддержка",
    ),
    RankTier(
        id="premium",
        name="Премиум клуб",
        min_spent=50_000,
        cashback_percent=10,
        bonus="Персональный менеджер",
    ),
]


# ══════════════════════════════════════════════════════════════
#                    LOYALTY LEVELS (ORDER-COUNT-BASED)
# ══════════════════════════════════════════════════════════════

@dataclass(frozen=True)
class LoyaltyTier:
    """Loyalty level based on total orders count."""
    id: str
    name: str
    min_orders: int
    discount_percent: int


LOYALTY_TIERS: list[LoyaltyTier] = [
    LoyaltyTier(id="new", name="Новый клиент", min_orders=0, discount_percent=0),
    LoyaltyTier(id="regular", name="Постоянный", min_orders=3, discount_percent=3),
    LoyaltyTier(id="vip", name="VIP", min_orders=7, discount_percent=5),
    LoyaltyTier(id="premium", name="Премиум", min_orders=15, discount_percent=10),
]


# ══════════════════════════════════════════════════════════════
#                    LOOKUP FUNCTIONS
# ══════════════════════════════════════════════════════════════

def get_rank_for_spent(total_spent: float) -> RankTier:
    """Returns the highest rank tier the user qualifies for."""
    result = RANK_TIERS[0]
    for tier in RANK_TIERS:
        if total_spent >= tier.min_spent:
            result = tier
    return result


def get_next_rank(total_spent: float) -> Optional[RankTier]:
    """Returns the next rank tier, or None if at max."""
    current = get_rank_for_spent(total_spent)
    current_idx = RANK_TIERS.index(current)
    if current_idx < len(RANK_TIERS) - 1:
        return RANK_TIERS[current_idx + 1]
    return None


def get_rank_progress(total_spent: float) -> dict:
    """
    Returns rank progress info.

    Example return:
        {
            "current": RankTier(id="partner", ...),
            "next": RankTier(id="priority", ...) or None,
            "progress_percent": 66,
            "spent_to_next": 5000,
            "has_next": True,
        }
    """
    current = get_rank_for_spent(total_spent)
    next_tier = get_next_rank(total_spent)

    if next_tier is None:
        return {
            "current": current,
            "next": None,
            "progress_percent": 100,
            "spent_to_next": 0,
            "has_next": False,
        }

    range_total = next_tier.min_spent - current.min_spent
    range_done = total_spent - current.min_spent
    progress = min(int((range_done / range_total) * 100), 99) if range_total > 0 else 0

    return {
        "current": current,
        "next": next_tier,
        "progress_percent": progress,
        "spent_to_next": int(next_tier.min_spent - total_spent),
        "has_next": True,
    }


def get_loyalty_for_orders(orders_count: int) -> LoyaltyTier:
    """Returns the highest loyalty tier the user qualifies for."""
    result = LOYALTY_TIERS[0]
    for tier in LOYALTY_TIERS:
        if orders_count >= tier.min_orders:
            result = tier
    return result


def get_next_loyalty(orders_count: int) -> Optional[LoyaltyTier]:
    """Returns the next loyalty tier, or None if at max."""
    current = get_loyalty_for_orders(orders_count)
    current_idx = LOYALTY_TIERS.index(current)
    if current_idx < len(LOYALTY_TIERS) - 1:
        return LOYALTY_TIERS[current_idx + 1]
    return None


def get_loyalty_progress(orders_count: int) -> dict:
    """Returns loyalty progress info (same structure as get_rank_progress)."""
    current = get_loyalty_for_orders(orders_count)
    next_tier = get_next_loyalty(orders_count)

    if next_tier is None:
        return {
            "current": current,
            "next": None,
            "progress_percent": 100,
            "orders_to_next": 0,
            "has_next": False,
        }

    range_total = next_tier.min_orders - current.min_orders
    range_done = orders_count - current.min_orders
    progress = min(int((range_done / range_total) * 100), 99) if range_total > 0 else 0

    return {
        "current": current,
        "next": next_tier,
        "progress_percent": progress,
        "orders_to_next": next_tier.min_orders - orders_count,
        "has_next": True,
    }

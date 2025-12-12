from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.models.levels import RankLevel, LoyaltyLevel
from database.models.orders import Order
from .schemas import RankInfo, LoyaltyInfo, OrderResponse

async def get_rank_levels(session: AsyncSession) -> list[RankLevel]:
    result = await session.execute(select(RankLevel).order_by(RankLevel.min_spent))
    return result.scalars().all()

async def get_loyalty_levels(session: AsyncSession) -> list[LoyaltyLevel]:
    result = await session.execute(select(LoyaltyLevel).order_by(LoyaltyLevel.min_orders))
    return result.scalars().all()

def get_rank_info(total_spent: float, rank_levels: list[RankLevel]) -> RankInfo:
    """Calculate user rank based on total spent"""
    current_level = 0
    for i, level in enumerate(rank_levels):
        if total_spent >= (level.min_spent or 0):
            current_level = i

    current = rank_levels[current_level] if rank_levels else None
    next_rank = (
        rank_levels[current_level + 1]
        if rank_levels and current_level < len(rank_levels) - 1
        else None
    )

    if current is None:
        return RankInfo(name="", emoji="", level=0, cashback=0, next_rank=None, progress=0, spent_to_next=0, is_max=False)

    progress = 100
    spent_to_next = 0
    is_max = next_rank is None
    if next_rank:
        progress_range = (next_rank.min_spent or 0) - (current.min_spent or 0)
        progress_current = total_spent - (current.min_spent or 0)
        progress = min(100, int((progress_current / progress_range) * 100)) if progress_range else 100
        spent_to_next = int((next_rank.min_spent or 0) - total_spent)

    return RankInfo(
        name=current.name,
        emoji=current.emoji,
        level=current_level + 1,
        cashback=int(current.cashback_percent or 0),
        bonus=current.bonus,
        next_rank=next_rank.name if next_rank else None,
        progress=progress,
        spent_to_next=spent_to_next,
        is_max=is_max
    )

def get_loyalty_info(orders_count: int, loyalty_levels: list[LoyaltyLevel]) -> LoyaltyInfo:
    """Calculate user loyalty based on orders count"""
    current_level = 0
    for i, level in enumerate(loyalty_levels):
        if orders_count >= (level.min_orders or 0):
            current_level = i

    current = loyalty_levels[current_level] if loyalty_levels else None
    next_level = (
        loyalty_levels[current_level + 1]
        if loyalty_levels and current_level < len(loyalty_levels) - 1
        else None
    )

    orders_to_next = 0 if not next_level else max((next_level.min_orders or 0) - orders_count, 0)

    return LoyaltyInfo(
        status=current.name if current else "",
        emoji=current.emoji if current else "",
        level=current_level + 1,
        discount=current.discount_percent if current else 0,
        orders_to_next=orders_to_next
    )

def order_to_response(order: Order) -> OrderResponse:
    """Convert Order model to response schema"""
    return OrderResponse(
        id=order.id,
        status=order.status.value if hasattr(order.status, 'value') else str(order.status),
        work_type=order.work_type.value if hasattr(order.work_type, 'value') else str(order.work_type),
        work_type_label=order.work_type_label,
        subject=order.subject,
        topic=order.topic,
        deadline=order.deadline,
        price=round(float(order.price or 0), 2),
        final_price=round(float(order.final_price), 2),
        paid_amount=round(float(order.paid_amount or 0), 2),
        discount=round(float(order.discount or 0), 2),
        promo_code=getattr(order, 'promo_code', None),
        promo_discount=round(float(getattr(order, 'promo_discount', 0) or 0), 2),
        bonus_used=round(float(order.bonus_used or 0), 2),
        progress=order.progress or 0,
        payment_scheme=order.payment_scheme,  # full / half
        files_url=getattr(order, 'files_url', None),  # Work files URL (Yandex.Disk)
        review_submitted=getattr(order, 'review_submitted', False),  # Whether review was submitted
        is_archived=getattr(order, 'is_archived', False),  # Whether order is archived
        created_at=order.created_at.isoformat() if order.created_at else "",
        completed_at=order.completed_at.isoformat() if order.completed_at else None
    )

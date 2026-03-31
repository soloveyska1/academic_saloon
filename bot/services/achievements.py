from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from aiogram import Bot
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.services.bonus import BonusReason, BonusService
from core.ranks import get_next_rank
from database.models.achievements import UserAchievement
from database.models.orders import Order, OrderStatus
from database.models.users import User

logger = logging.getLogger(__name__)


AchievementRarity = str


@dataclass(frozen=True)
class AchievementDefinition:
    key: str
    title: str
    description: str
    icon: str
    rarity: AchievementRarity
    reward_amount: int
    sort_order: int
    metric: str
    target: int
    hint_mode: str = "count"


ACHIEVEMENT_DEFINITIONS: tuple[AchievementDefinition, ...] = (
    AchievementDefinition(
        key="first_paid_order",
        title="Первый чек",
        description="Оплатить первый заказ",
        icon="star",
        rarity="common",
        reward_amount=50,
        sort_order=10,
        metric="paid_orders_count",
        target=1,
    ),
    AchievementDefinition(
        key="three_paid_orders",
        title="На связи",
        description="3 оплаченных заказа",
        icon="zap",
        rarity="rare",
        reward_amount=100,
        sort_order=20,
        metric="paid_orders_count",
        target=3,
    ),
    AchievementDefinition(
        key="five_paid_orders",
        title="Постоянный клиент",
        description="5 оплаченных заказов",
        icon="award",
        rarity="epic",
        reward_amount=150,
        sort_order=30,
        metric="paid_orders_count",
        target=5,
    ),
    AchievementDefinition(
        key="ten_paid_orders",
        title="Легенда салона",
        description="10 оплаченных заказов",
        icon="crown",
        rarity="legendary",
        reward_amount=300,
        sort_order=40,
        metric="paid_orders_count",
        target=10,
    ),
    AchievementDefinition(
        key="full_payment_first",
        title="Полный вперёд",
        description="Оплатить заказ полностью сразу",
        icon="check-circle",
        rarity="rare",
        reward_amount=75,
        sort_order=50,
        metric="full_payment_orders_count",
        target=1,
    ),
    AchievementDefinition(
        key="promo_first",
        title="Тактика скидки",
        description="Использовать промокод в оплаченной заявке",
        icon="tag",
        rarity="common",
        reward_amount=50,
        sort_order=60,
        metric="promo_paid_orders_count",
        target=1,
    ),
    AchievementDefinition(
        key="first_referral",
        title="Первый приглашённый",
        description="Пригласить первого друга",
        icon="user-plus",
        rarity="rare",
        reward_amount=100,
        sort_order=70,
        metric="referrals_count",
        target=1,
    ),
    AchievementDefinition(
        key="referral_three",
        title="Амбассадор",
        description="Пригласить 3 друзей",
        icon="users",
        rarity="epic",
        reward_amount=200,
        sort_order=80,
        metric="referrals_count",
        target=3,
    ),
    AchievementDefinition(
        key="referral_six",
        title="Собрал команду",
        description="Пригласить 6 друзей",
        icon="users",
        rarity="legendary",
        reward_amount=400,
        sort_order=90,
        metric="referrals_count",
        target=6,
    ),
    AchievementDefinition(
        key="streak_7",
        title="Недельная серия",
        description="7 дней подряд забирать daily bonus",
        icon="flame",
        rarity="rare",
        reward_amount=75,
        sort_order=100,
        metric="daily_streak",
        target=7,
        hint_mode="days",
    ),
    AchievementDefinition(
        key="streak_30",
        title="Железная дисциплина",
        description="30 дней подряд забирать daily bonus",
        icon="flame",
        rarity="legendary",
        reward_amount=200,
        sort_order=110,
        metric="daily_streak",
        target=30,
        hint_mode="days",
    ),
    AchievementDefinition(
        key="spent_10000",
        title="Серьёзный подход",
        description="10 000 ₽ в завершённых заказах",
        icon="award",
        rarity="epic",
        reward_amount=150,
        sort_order=120,
        metric="completed_spend_total",
        target=10_000,
        hint_mode="money",
    ),
    AchievementDefinition(
        key="spent_50000",
        title="Клуб 50K",
        description="50 000 ₽ в завершённых заказах",
        icon="crown",
        rarity="legendary",
        reward_amount=400,
        sort_order=130,
        metric="completed_spend_total",
        target=50_000,
        hint_mode="money",
    ),
    AchievementDefinition(
        key="perfect_first",
        title="С первого раза",
        description="Получить работу без единой правки",
        icon="graduation-cap",
        rarity="rare",
        reward_amount=75,
        sort_order=140,
        metric="perfect_orders_count",
        target=1,
    ),
    AchievementDefinition(
        key="perfect_three",
        title="Безупречный цикл",
        description="3 завершённых заказа без правок",
        icon="graduation-cap",
        rarity="legendary",
        reward_amount=200,
        sort_order=150,
        metric="perfect_orders_count",
        target=3,
    ),
    AchievementDefinition(
        key="review_first",
        title="Голос клиента",
        description="Оставить первый отзыв",
        icon="check-circle",
        rarity="common",
        reward_amount=50,
        sort_order=160,
        metric="reviewed_orders_count",
        target=1,
    ),
    AchievementDefinition(
        key="max_rank",
        title="Премиум клуб",
        description="Достигнуть максимального ранга",
        icon="crown",
        rarity="legendary",
        reward_amount=500,
        sort_order=170,
        metric="max_rank_unlocked",
        target=1,
        hint_mode="rank",
    ),
)


@dataclass(frozen=True)
class AchievementContext:
    metrics: dict[str, int]
    next_rank_name: str | None


def _pluralize_ru(value: int, one: str, two: str, five: str) -> str:
    value = abs(int(value))
    if value % 10 == 1 and value % 100 != 11:
        return one
    if 2 <= value % 10 <= 4 and not 12 <= value % 100 <= 14:
        return two
    return five


def _format_money(value: int | float | Decimal) -> str:
    amount = int(round(float(value)))
    return f"{amount:,}".replace(",", " ") + " ₽"


def _build_hint(definition: AchievementDefinition, current_value: int, next_rank_name: str | None) -> str | None:
    remaining = max(definition.target - current_value, 0)
    if remaining <= 0:
        return None

    if definition.hint_mode == "days":
        return f"Ещё {remaining} {_pluralize_ru(remaining, 'день', 'дня', 'дней')}"
    if definition.hint_mode == "money":
        return f"Ещё {_format_money(remaining)}"
    if definition.hint_mode == "rank":
        return f"До ранга «{next_rank_name}»" if next_rank_name else "Доведите уровень до максимума"

    noun = {
        "referrals_count": ("друг", "друга", "друзей"),
        "paid_orders_count": ("заказ", "заказа", "заказов"),
        "promo_paid_orders_count": ("заказ", "заказа", "заказов"),
        "perfect_orders_count": ("работа", "работы", "работ"),
        "reviewed_orders_count": ("отзыв", "отзыва", "отзывов"),
        "full_payment_orders_count": ("заказ", "заказа", "заказов"),
    }.get(definition.metric, ("шаг", "шага", "шагов"))
    return f"Ещё {remaining} {_pluralize_ru(remaining, *noun)}"


def _to_int(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return int(round(float(value)))
    return int(value)


async def _load_user(session: AsyncSession, telegram_id: int) -> User | None:
    return await session.scalar(select(User).where(User.telegram_id == telegram_id))


async def _load_orders(session: AsyncSession, telegram_id: int) -> list[Order]:
    result = await session.execute(
        select(Order).where(
            Order.user_id == telegram_id,
            Order.work_type != "support_chat",
        )
    )
    return result.scalars().all()


def _build_context(user: User, orders: list[Order]) -> AchievementContext:
    paid_orders = [
        order for order in orders
        if float(order.paid_amount or 0) > 0 and order.status not in {
            OrderStatus.CANCELLED.value,
            OrderStatus.REJECTED.value,
        }
    ]
    completed_orders = [order for order in orders if order.status == OrderStatus.COMPLETED.value]
    perfect_orders = [order for order in completed_orders if int(order.revision_count or 0) == 0]
    reviewed_orders = [order for order in completed_orders if bool(getattr(order, "review_submitted", False))]
    promo_paid_orders = [order for order in paid_orders if getattr(order, "promo_code", None)]
    full_payment_orders = [
        order for order in paid_orders
        if str(getattr(order, "payment_scheme", "") or "").lower() == "full"
    ]
    completed_spend_total = sum(float(order.paid_amount or 0) for order in completed_orders)
    next_rank = get_next_rank(completed_spend_total)

    return AchievementContext(
        metrics={
            "paid_orders_count": len(paid_orders),
            "referrals_count": int(user.referrals_count or 0),
            "daily_streak": int(user.daily_bonus_streak or 0),
            "completed_spend_total": int(round(completed_spend_total)),
            "promo_paid_orders_count": len(promo_paid_orders),
            "perfect_orders_count": len(perfect_orders),
            "reviewed_orders_count": len(reviewed_orders),
            "full_payment_orders_count": len(full_payment_orders),
            "max_rank_unlocked": 1 if next_rank is None else 0,
        },
        next_rank_name=None if next_rank is None else next_rank.name,
    )


async def _get_existing_unlocks(session: AsyncSession, telegram_id: int) -> dict[str, UserAchievement]:
    result = await session.execute(
        select(UserAchievement).where(UserAchievement.user_id == telegram_id)
    )
    unlocks = result.scalars().all()
    return {unlock.achievement_key: unlock for unlock in unlocks}


async def _get_owner_percentages(session: AsyncSession) -> dict[str, int]:
    total_users = int((await session.scalar(select(func.count(User.id)))) or 0)
    if total_users <= 0:
        return {}

    result = await session.execute(
        select(UserAchievement.achievement_key, func.count(UserAchievement.id))
        .group_by(UserAchievement.achievement_key)
    )
    counts = result.all()
    return {
        key: max(1, min(100, int(round((count / total_users) * 100))))
        for key, count in counts
        if count
    }


def _serialize_achievements(
    context: AchievementContext,
    unlocks: dict[str, UserAchievement],
    owner_percentages: dict[str, int],
) -> list[dict[str, Any]]:
    payload: list[dict[str, Any]] = []
    for definition in ACHIEVEMENT_DEFINITIONS:
        current_value = _to_int(context.metrics.get(definition.metric, 0))
        unlocked_row = unlocks.get(definition.key)
        unlocked = unlocked_row is not None or current_value >= definition.target
        progress = 1.0 if definition.target <= 0 else min(current_value / definition.target, 1.0)
        payload.append(
            {
                "key": definition.key,
                "title": definition.title,
                "description": definition.description,
                "icon": definition.icon,
                "rarity": definition.rarity,
                "reward_amount": int(unlocked_row.reward_amount) if unlocked_row else definition.reward_amount,
                "unlocked": unlocked,
                "unlocked_at": unlocked_row.unlocked_at.isoformat() if unlocked_row and unlocked_row.unlocked_at else None,
                "progress": round(progress, 4),
                "current": current_value,
                "target": definition.target,
                "hint": None if unlocked else _build_hint(definition, current_value, context.next_rank_name),
                "owners_percent": owner_percentages.get(definition.key, 0),
                "sort_order": definition.sort_order,
            }
        )
    return payload


async def _send_unlock_notification(
    *,
    telegram_id: int,
    unlocked_definitions: list[AchievementDefinition],
    total_reward: int,
    bot: Bot | None,
) -> None:
    if not unlocked_definitions:
        return

    if len(unlocked_definitions) == 1:
        definition = unlocked_definitions[0]
        title = f"Достижение открыто: {definition.title}"
        reward_line = f"\nНаграда: +{total_reward} ₽" if total_reward > 0 else ""
        message = f"{definition.description}{reward_line}"
        icon = definition.icon
    else:
        names = ", ".join(item.title for item in unlocked_definitions[:3])
        if len(unlocked_definitions) > 3:
            names += f" и ещё {len(unlocked_definitions) - 3}"
        reward_line = f"\nНаграда: +{total_reward} ₽" if total_reward > 0 else ""
        title = f"Новых достижений: {len(unlocked_definitions)}"
        message = f"{names}.{reward_line}"
        icon = "award"

    try:
        from bot.api.websocket import notify_data_refresh
        from bot.services.realtime_notifications import send_custom_notification

        await send_custom_notification(
            telegram_id=telegram_id,
            title=title,
            message=message,
            notification_type="success",
            icon=icon,
            color="#d4af37",
            action="view_club",
            celebration=True,
            confetti=True,
            data={
                "achievement_keys": [item.key for item in unlocked_definitions],
                "reward_amount": total_reward,
            },
        )
        await notify_data_refresh(telegram_id, refresh_type="profile")
    except Exception as exc:
        logger.warning("[Achievements] Failed to send WS notification to %s: %s", telegram_id, exc)

    if bot is None:
        return

    try:
        titles = "\n".join(f"• {item.title}" for item in unlocked_definitions[:5])
        if len(unlocked_definitions) > 5:
            titles += f"\n• и ещё {len(unlocked_definitions) - 5}"
        reward_line = f"\n\n🎁 На баланс начислено: <b>{total_reward} ₽</b>" if total_reward > 0 else ""
        await bot.send_message(
            telegram_id,
            f"🏆 <b>Новые достижения</b>\n\n{titles}{reward_line}",
        )
    except Exception as exc:
        logger.warning("[Achievements] Failed to send Telegram notification to %s: %s", telegram_id, exc)


async def sync_user_achievements(
    session: AsyncSession,
    telegram_id: int,
    *,
    bot: Bot | None = None,
    notify: bool = False,
) -> list[dict[str, Any]]:
    user = await _load_user(session, telegram_id)
    if user is None:
        return []

    orders = await _load_orders(session, telegram_id)
    context = _build_context(user, orders)
    unlocks = await _get_existing_unlocks(session, telegram_id)

    new_rows: list[UserAchievement] = []
    new_definitions: list[AchievementDefinition] = []
    total_reward = 0

    for definition in ACHIEVEMENT_DEFINITIONS:
        current_value = _to_int(context.metrics.get(definition.metric, 0))
        if current_value < definition.target or definition.key in unlocks:
            continue

        row = UserAchievement(
            user_id=telegram_id,
            achievement_key=definition.key,
            reward_amount=definition.reward_amount,
        )
        session.add(row)
        unlocks[definition.key] = row
        new_rows.append(row)
        new_definitions.append(definition)
        total_reward += definition.reward_amount

        if definition.reward_amount > 0:
            await BonusService.add_bonus(
                session=session,
                user_id=telegram_id,
                amount=definition.reward_amount,
                reason=BonusReason.ACHIEVEMENT,
                description=f"Достижение «{definition.title}»",
                bot=bot,
                auto_commit=False,
                send_ws_notification=False,
            )

    if new_rows:
        await session.commit()
        for row in new_rows:
            await session.refresh(row)

    owner_percentages = await _get_owner_percentages(session)
    payload = _serialize_achievements(context, unlocks, owner_percentages)

    if notify and new_definitions:
        await _send_unlock_notification(
            telegram_id=telegram_id,
            unlocked_definitions=new_definitions,
            total_reward=total_reward,
            bot=bot,
        )

    return payload

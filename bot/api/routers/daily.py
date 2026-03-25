from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_session
from database.models.users import User
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import (
    DailyBonusInfoResponse, DailyBonusClaimResponse, StreakFreezeResponse
)
from bot.services.bonus import BonusService, BonusReason

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Daily Bonus"])

# ═══════════════════════════════════════════════════════════════════════════
#  DAILY BONUS — Гарантированный ежедневный бонус
#  Система стриков с возрастающими наградами
# ═══════════════════════════════════════════════════════════════════════════

# Базовые награды за 7-дневный цикл (увеличиваются на каждый день)
DAILY_BONUS_AMOUNTS = [10, 20, 30, 40, 50, 100, 150]

# Множитель для VIP пользователей (max rank)
VIP_MULTIPLIER = 1.5

# Milestone бонусы - дополнительные награды за длинные стрики
MILESTONE_BONUSES = {
    7: 100,    # Неделя подряд: +100₽
    14: 200,   # 2 недели: +200₽
    30: 500,   # Месяц: +500₽
    60: 1000,  # 2 месяца: +1000₽
    90: 2000,  # 3 месяца: +2000₽
    180: 5000, # Полгода: +5000₽
    365: 15000, # Год: +15000₽
}

# Cooldown между клеймами (в часах)
DAILY_COOLDOWN_HOURS = 24

# Grace period - время после cooldown, в течение которого стрик сохраняется (в часах)
STREAK_GRACE_PERIOD_HOURS = 24  # 24 часа после cooldown (итого 48 часов от последнего клейма)
STREAK_FREEZE_COST = 100  # Cost in bonus rubles
MAX_FREEZE_COUNT = 3  # Max freezes a user can hold
MIN_STREAK_FOR_FREEZE = 3


def _get_msk_tz():
    try:
        return ZoneInfo("Europe/Moscow")
    except Exception:
        return timezone.utc


def _to_msk_date(dt: datetime | None, msk_tz) -> date | None:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(msk_tz).date()


def _build_milestones() -> list[dict[str, int]]:
    return [{"day": day, "bonus": reward} for day, reward in sorted(MILESTONE_BONUSES.items())]


def _freeze_is_armed(streak: int, freeze_count: int) -> bool:
    return streak >= MIN_STREAK_FOR_FREEZE and freeze_count > 0


def _freeze_pending_for_missed_day(
    *,
    last_claim_date,
    today_msk,
    current_streak: int,
    freeze_count: int,
) -> bool:
    if last_claim_date is None:
        return False
    return (
        last_claim_date == (today_msk - timedelta(days=2))
        and current_streak >= MIN_STREAK_FOR_FREEZE
        and freeze_count > 0
    )

def _calculate_bonus_amount(base_amount: int, is_vip: bool) -> int:
    """Вычисляет итоговую сумму бонуса с учётом VIP множителя"""
    if is_vip:
        return int(base_amount * VIP_MULTIPLIER)
    return base_amount


def _get_next_milestone(current_streak: int) -> tuple[int, int] | None:
    """Возвращает следующий milestone (день, награда) или None"""
    for day, reward in sorted(MILESTONE_BONUSES.items()):
        if current_streak < day:
            return (day, reward)
    return None


def _check_milestone_reached(new_streak: int) -> tuple[int, int] | None:
    """Проверяет, достигнут ли milestone при данном стрике. Возвращает (день, награда) или None"""
    return (new_streak, MILESTONE_BONUSES[new_streak]) if new_streak in MILESTONE_BONUSES else None


@router.get("/daily-bonus/info", response_model=DailyBonusInfoResponse)
async def get_daily_bonus_info(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение информации о ежедневном бонусе.
    Показывает текущий стрик, доступность бонуса и размер следующей награды.
    """
    # Eager load not needed for properties
    result = await session.execute(
        select(User)
        .where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # VIP Check
    is_vip = False
    try:
        # Check if user reached max rank (has_next=False means Max)
        rank_prog = user.rank_progress
        if rank_prog and not rank_prog.get("has_next", True):
             is_vip = True
    except Exception as e:
        logger.debug(f"[Daily] VIP check failed: {e}")

    # ═══ MSK TIMEZONE LOGIC ═══
    msk_tz = _get_msk_tz()
    now_msk = datetime.now(msk_tz)
    today_msk = now_msk.date()

    # Calculate next midnight MSK
    next_midnight = (now_msk + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    last_claim_date = _to_msk_date(user.last_daily_bonus_at, msk_tz)
    current_streak = user.daily_bonus_streak or 0
    freeze_count = user.streak_freeze_count or 0
    freeze_pending = _freeze_pending_for_missed_day(
        last_claim_date=last_claim_date,
        today_msk=today_msk,
        current_streak=current_streak,
        freeze_count=freeze_count,
    )
    bonuses = [_calculate_bonus_amount(b, is_vip) for b in DAILY_BONUS_AMOUNTS]
    milestones = [
        {
            "day": day,
            "bonus": _calculate_bonus_amount(reward, is_vip),
        }
        for day, reward in sorted(MILESTONE_BONUSES.items())
    ]

    # 1. Check if already claimed today
    if last_claim_date == today_msk:
        remaining = next_midnight - now_msk
        hours = int(remaining.total_seconds() // 3600)
        minutes = int((remaining.total_seconds() % 3600) // 60)
        cooldown_text = f"{hours}ч {minutes}мин" if hours > 0 else f"{minutes}мин"
        
        return DailyBonusInfoResponse(
            can_claim=False,
            streak=current_streak,
            next_bonus=0, # Hidden when claimed
            cooldown_remaining=cooldown_text,
            bonuses=bonuses,
            streak_freeze_count=freeze_count,
            streak_freeze_active=_freeze_is_armed(current_streak, freeze_count),
            streak_freeze_pending=False,
            streak_milestones=milestones,
        )

    # 2. Check streak continuity
    if last_claim_date:
        yesterday_msk = today_msk - timedelta(days=1)
        if last_claim_date == yesterday_msk:
            pass
        elif freeze_pending:
            # Keep the streak visible: next claim will consume one freeze and continue the chain.
            pass
        elif last_claim_date < yesterday_msk:
            current_streak = 0
    elif current_streak > 0:
        # Admin reset case: last_claim is None but streak exists.
        # Treat as valid continuation.
        pass
    else:
        # New user
        current_streak = 0

    # Next claim will be (current_streak + 1)
    next_streak = current_streak + 1
    current_day_index = (next_streak - 1) % 7
    base_bonus = DAILY_BONUS_AMOUNTS[current_day_index]
    next_bonus = _calculate_bonus_amount(base_bonus, is_vip)
    
    return DailyBonusInfoResponse(
        can_claim=True,
        streak=current_streak,
        next_bonus=next_bonus,
        cooldown_remaining=None,
        bonuses=bonuses,
        streak_freeze_count=freeze_count,
        streak_freeze_active=_freeze_is_armed(current_streak, freeze_count),
        streak_freeze_pending=freeze_pending,
        streak_milestones=milestones,
    )


@router.post("/daily-bonus/claim", response_model=DailyBonusClaimResponse)
async def claim_daily_bonus(
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение ежедневного бонуса (Calendar Day Logic).
    Сброс происходит в 00:00 по МСК.
    """
    # ═══ ЗАЩИТА: FOR UPDATE ═══
    result = await session.execute(
        select(User)
        .where(User.telegram_id == tg_user.id)
        .with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    msk_tz = _get_msk_tz()
    now_msk = datetime.now(msk_tz)
    today_msk = now_msk.date()
    last_claim_date = _to_msk_date(user.last_daily_bonus_at, msk_tz)

    # VIP Check
    is_vip = False
    try:
         rank_prog = user.rank_progress
         if rank_prog and not rank_prog.get("has_next", True):
             is_vip = True
    except Exception as e:
        logger.debug(f"[Daily] VIP check failed: {e}")

    # 1. Check if already claimed
    if last_claim_date == today_msk:
        next_midnight = (now_msk + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return DailyBonusClaimResponse(
            success=False,
            won=False,
            bonus=0,
            streak=user.daily_bonus_streak,
            message="Бонус уже получен сегодня.",
            new_balance=float(user.balance or 0),
            streak_freeze_count=user.streak_freeze_count or 0,
            streak_freeze_active=_freeze_is_armed(user.daily_bonus_streak or 0, user.streak_freeze_count or 0),
            next_claim_at=next_midnight.isoformat()
        )

    # 2. Calculate Streak
    current_streak = user.daily_bonus_streak
    freeze_count = user.streak_freeze_count or 0
    freeze_used = False
    
    if last_claim_date:
        yesterday_msk = today_msk - timedelta(days=1)
        if last_claim_date == yesterday_msk:
            # Perfect streak
            new_streak = current_streak + 1
        elif _freeze_pending_for_missed_day(
            last_claim_date=last_claim_date,
            today_msk=today_msk,
            current_streak=current_streak,
            freeze_count=freeze_count,
        ):
            # Missed exactly one day — consume one freeze and continue the chain.
            user.streak_freeze_count = freeze_count - 1
            freeze_used = True
            new_streak = current_streak + 1
            logger.info(
                f"[DailyBonus] Freeze used for {tg_user.id}. "
                f"Streak preserved from {current_streak} to {new_streak}."
            )
        elif last_claim_date < yesterday_msk:
            # Missed too much time or no freeze available — streak breaks.
            new_streak = 1
            logger.info(f"[DailyBonus] Streak reset for {tg_user.id}. Gap exceeded protection window.")
        else:
            # Future claim?!
            new_streak = current_streak + 1
    elif current_streak > 0:
        # Admin reset: has streak but no date -> Continue streak
        new_streak = current_streak + 1
    else:
        # First ever claim
        new_streak = 1

    # 3. Calculate Reward
    day_index = (new_streak - 1) % 7
    base_bonus = DAILY_BONUS_AMOUNTS[day_index]
    bonus_amount = _calculate_bonus_amount(base_bonus, is_vip)
    total_bonus = bonus_amount
    milestone_reached = None

    # Milestone check
    milestone = _check_milestone_reached(new_streak)
    if milestone:
        m_day, m_reward = milestone
        m_bonus = _calculate_bonus_amount(m_reward, is_vip)
        total_bonus += m_bonus
        milestone_reached = {"day": m_day, "reward": m_bonus}

    # 4. Commit
    user.daily_bonus_streak = new_streak
    user.last_daily_bonus_at = now_msk # Store as TZ-aware

    try:
        await BonusService.add_bonus(
            session=session,
            user_id=tg_user.id,
            amount=bonus_amount,
            reason=BonusReason.DAILY_LUCK,
            description=f"Ежедневный бонус (день {new_streak})" + (" 👑 VIP" if is_vip else ""),
            bot=None,
            auto_commit=False,
        )

        if milestone_reached:
            await BonusService.add_bonus(
                session=session,
                user_id=tg_user.id,
                amount=milestone_reached["reward"],
                reason=BonusReason.DAILY_LUCK,
                description=f"🏆 Milestone: {milestone_reached['day']} дней!",
                bot=None,
                auto_commit=False,
            )

        await session.commit()

    except Exception as e:
        await session.rollback()
        logger.error(f"[DailyBonus] Error: {e}")
        raise HTTPException(500, "Ошибка начисления бонуса")

    # Next claim at midnight
    next_midnight = (now_msk + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    # Message
    msg_parts = []
    if freeze_used:
        msg_parts.append("🛡 Защита серии сработала")

    msg = f"🎁 +{bonus_amount}₽ (День {new_streak})"
    if milestone_reached:
        msg += f"\n🏆 +{milestone_reached['reward']}₽ за стрик!"
    msg_parts.append(msg)

    return DailyBonusClaimResponse(
        success=True,
        won=True,
        bonus=total_bonus,
        streak=new_streak,
        message="\n".join(msg_parts),
        new_balance=float(user.balance or 0),
        streak_freeze_count=user.streak_freeze_count or 0,
        streak_freeze_active=_freeze_is_armed(new_streak, user.streak_freeze_count or 0),
        streak_freeze_pending=False,
        freeze_used=freeze_used,
        next_claim_at=next_midnight.isoformat()
    )


@router.post("/daily-bonus/buy-freeze", response_model=StreakFreezeResponse)
async def buy_streak_freeze(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Buy a streak freeze for 100₽ bonus balance.
    Freeze automatically protects streak if user misses a day.
    Max 3 freezes at a time.
    """
    result = await session.execute(
        select(User)
        .where(User.telegram_id == tg_user.id)
        .with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    # Check limits
    current_freezes = user.streak_freeze_count or 0
    current_streak = user.daily_bonus_streak or 0

    if current_streak < MIN_STREAK_FOR_FREEZE:
        return StreakFreezeResponse(
            success=False,
            message=f"Защита серии откроется с {MIN_STREAK_FOR_FREEZE}-го дня серии",
            freeze_count=current_freezes,
            bonus_balance=float(user.balance or 0),
        )

    if current_freezes >= MAX_FREEZE_COUNT:
        return StreakFreezeResponse(
            success=False,
            message=f"Максимум {MAX_FREEZE_COUNT} защиты в запасе",
            freeze_count=current_freezes,
            bonus_balance=float(user.balance or 0),
        )

    # Check balance
    if float(user.balance or 0) < STREAK_FREEZE_COST:
        return StreakFreezeResponse(
            success=False,
            message=f"Нужно {STREAK_FREEZE_COST} ₽ бонусов",
            freeze_count=current_freezes,
            bonus_balance=float(user.balance or 0),
        )

    # Deduct balance and add freeze
    try:
        success, new_balance = await BonusService.deduct_bonus(
            session=session,
            user_id=tg_user.id,
            amount=STREAK_FREEZE_COST,
            reason=BonusReason.STREAK_FREEZE,
            description=f"Защита серии {current_freezes + 1}/{MAX_FREEZE_COUNT}",
            bot=None,
            user=user,
            auto_commit=False,
        )
        if not success:
            await session.rollback()
            return StreakFreezeResponse(
                success=False,
                message=f"Нужно {STREAK_FREEZE_COST} ₽ бонусов",
                freeze_count=current_freezes,
                bonus_balance=float(user.balance or 0),
            )

        user.streak_freeze_count = current_freezes + 1
        await session.commit()

        logger.info(f"[StreakFreeze] User {tg_user.id} bought freeze #{current_freezes + 1}")

        return StreakFreezeResponse(
            success=True,
            message="Защита серии добавлена",
            freeze_count=current_freezes + 1,
            bonus_balance=float(new_balance),
        )
    except Exception as e:
        await session.rollback()
        logger.error(f"[StreakFreeze] Error: {e}")
        raise HTTPException(500, "Ошибка покупки заморозки")


# ═══════════════════════════════════════════════════════════════════════════
#  ADMIN: Reset Daily Bonus for Testing
# ═══════════════════════════════════════════════════════════════════════════

from core.config import settings

def _require_admin(tg_user: TelegramUser) -> None:
    """Check if user is admin"""
    if tg_user.id not in settings.ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/daily-bonus/reset")
async def reset_daily_bonus(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    [ADMIN ONLY] Сбросить cooldown ежедневного бонуса.

    Используется для тестирования функциональности бонусов.
    Сбрасывает last_daily_bonus_at, позволяя получить бонус повторно.
    """
    _require_admin(tg_user)

    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Reset cooldown by setting last_daily_bonus_at to None
    # Keep streak intact so user can test milestone bonuses
    old_claim_time = user.last_daily_bonus_at
    user.last_daily_bonus_at = None

    await session.commit()

    logger.info(
        f"[DailyBonus] Admin {tg_user.id} reset daily bonus cooldown. "
        f"Old claim time: {old_claim_time}, Streak preserved: {user.daily_bonus_streak}"
    )

    return {
        "success": True,
        "message": "Daily bonus cooldown reset. You can claim again.",
        "streak": user.daily_bonus_streak,
    }


@router.post("/daily-bonus/reset-streak")
async def reset_daily_bonus_streak(
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    [ADMIN ONLY] Полный сброс ежедневного бонуса (cooldown + streak).

    Используется для полного тестирования с нуля.
    """
    _require_admin(tg_user)

    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_streak = user.daily_bonus_streak
    user.last_daily_bonus_at = None
    user.daily_bonus_streak = 0

    await session.commit()

    logger.info(
        f"[DailyBonus] Admin {tg_user.id} fully reset daily bonus. "
        f"Old streak: {old_streak}, now 0"
    )

    return {
        "success": True,
        "message": "Daily bonus fully reset (cooldown + streak = 0).",
        "old_streak": old_streak,
        "new_streak": 0,
    }


@router.post("/daily-bonus/set-streak")
async def set_daily_bonus_streak(
    streak: int,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    [ADMIN ONLY] Установить произвольный стрик для тестирования milestone бонусов.

    Например, установите streak=6, чтобы протестировать получение
    milestone бонуса на 7-й день.
    """
    _require_admin(tg_user)

    if streak < 0 or streak > 400:
        raise HTTPException(status_code=400, detail="Streak must be between 0 and 400")

    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_streak = user.daily_bonus_streak
    user.daily_bonus_streak = streak
    user.last_daily_bonus_at = None  # Reset cooldown too

    await session.commit()

    logger.info(
        f"[DailyBonus] Admin {tg_user.id} set streak to {streak}. "
        f"Old: {old_streak}"
    )

    # Calculate next milestone
    next_milestone = None
    for day, reward in sorted(MILESTONE_BONUSES.items()):
        if streak < day:
            next_milestone = {"day": day, "reward": reward}
            break

    return {
        "success": True,
        "message": f"Streak set to {streak}. Cooldown reset.",
        "old_streak": old_streak,
        "new_streak": streak,
        "next_milestone": next_milestone,
    }

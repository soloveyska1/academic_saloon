import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import random

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.db import get_session
from database.models.users import User
from bot.api.auth import TelegramUser, get_current_user
from bot.api.schemas import (
    DailyBonusInfoResponse, DailyBonusClaimResponse, RouletteResponse
)
# Rate limiting temporarily disabled - uncomment when slowapi is installed on server
# from bot.api.rate_limit import rate_limit_roulette
from bot.services.bonus import BonusService, BonusReason
from bot.services.mini_app_logger import log_roulette_spin
from bot.bot_instance import get_bot

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Daily & Roulette"])

# ═══════════════════════════════════════════════════════════════════════════
#  ROULETTE
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/roulette/spin", response_model=RouletteResponse)
async def spin_roulette(
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Элитный Клуб - испытай удачу!
    БЕЗ ЛИМИТА - крутить можно сколько угодно
    Шанс выигрыша крайне низкий - это элитный клуб!
    """
    # await rate_limit_roulette.check(request)  # Rate limiting disabled

    result = await session.execute(select(User).where(User.telegram_id == tg_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prizes = [
        {"prize": "ДЖЕКПОТ 50000₽", "type": "jackpot", "value": 50000, "weight": 1},
        {"prize": "МЕГА-ПРИЗ 10000₽", "type": "bonus", "value": 10000, "weight": 10},
        {"prize": "СУПЕР-ПРИЗ 5000₽", "type": "bonus", "value": 5000, "weight": 100},
        {"prize": "КРУПНЫЙ 1000₽", "type": "bonus", "value": 1000, "weight": 1000},
        {"prize": "ХОРОШИЙ 500₽", "type": "bonus", "value": 500, "weight": 10000},
        {"prize": "БОНУС 100₽", "type": "bonus", "value": 100, "weight": 100000},
        {"prize": "Не повезло", "type": "nothing", "value": 0, "weight": 9888889},
    ]

    total_weight = sum(p["weight"] for p in prizes)
    rand = random.randint(1, total_weight)
    cumulative = 0
    selected = prizes[-1]
    for prize in prizes:
        cumulative += prize["weight"]
        if rand <= cumulative:
            selected = prize
            break

    if selected["type"] in ("bonus", "jackpot") and selected["value"] > 0:
        # Use atomic update to prevent race condition
        await session.execute(
            update(User)
            .where(User.telegram_id == user.telegram_id)
            .values(
                balance=User.balance + selected["value"],
                last_bonus_at=datetime.now(ZoneInfo("Europe/Moscow")),
                bonus_expiry_notified=False
            )
        )
        await session.commit()
        # Refresh user to get updated balance
        await session.refresh(user)
    else:
        await session.commit()

    if selected["type"] != "nothing":
        try:
            bot = get_bot()
            await log_roulette_spin(
                bot=bot,
                user_id=user.telegram_id,
                username=user.username,
                prize=selected["prize"],
                prize_type=selected["type"],
                value=selected["value"],
            )

            if selected["value"] > 0:
                from bot.services.realtime_notifications import send_balance_notification
                await send_balance_notification(
                    telegram_id=user.telegram_id,
                    change=round(float(selected["value"]), 2),
                    new_balance=round(float(user.balance), 2),
                    reason=f"Выигрыш в рулетке: {selected['prize']}",
                    reason_key="roulette_win"
                )
        except Exception as e:
            logger.warning(f"Roulette Log Error: {e}")

    message = f"Поздравляем! Ты выиграл {selected['value']}₽!" if selected["value"] > 0 else "Не повезло! Попробуй ещё раз!"

    return RouletteResponse(
        success=True,
        prize=selected["prize"],
        type=selected["type"],
        value=selected["value"],
        message=message,
        next_spin_at=None
    )

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
    except Exception:
        pass

    # ═══ MSK TIMEZONE LOGIC ═══
    msk_tz = ZoneInfo("Europe/Moscow")
    now_msk = datetime.now(msk_tz)
    today_msk = now_msk.date()
    
    # Calculate next midnight MSK
    next_midnight = (now_msk + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    last_claim = user.last_daily_bonus_at
    last_claim_date = None
    
    if last_claim:
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)
        # Convert to MSK for date comparison
        last_claim_msk = last_claim.astimezone(msk_tz)
        last_claim_date = last_claim_msk.date()

    # 1. Check if already claimed today
    if last_claim_date == today_msk:
        remaining = next_midnight - now_msk
        hours = int(remaining.total_seconds() // 3600)
        minutes = int((remaining.total_seconds() % 3600) // 60)
        cooldown_text = f"{hours}ч {minutes}мин" if hours > 0 else f"{minutes}мин"
        
        return DailyBonusInfoResponse(
            can_claim=False,
            streak=user.daily_bonus_streak,
            next_bonus=0, # Hidden when claimed
            cooldown_remaining=cooldown_text,
            bonuses=[_calculate_bonus_amount(b, is_vip) for b in DAILY_BONUS_AMOUNTS]
        )

    # 2. Check streak continuity
    # If last claim was yesterday -> streak continues
    # If last claim was before yesterday -> streak resets to 0 (will become 1 upon claim)
    current_streak = user.daily_bonus_streak
    
    if last_claim_date:
        yesterday_msk = today_msk - timedelta(days=1)
        if last_claim_date < yesterday_msk:
             # Streak valid only if claimed yesterday
             # Actually, let's allow "broken" streak to show as 0 here, 
             # but UI might want to know what the *next* claim will be.
             # If broken, next claim is Day 1.
             current_streak = 0
    else:
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
        bonuses=[_calculate_bonus_amount(b, is_vip) for b in DAILY_BONUS_AMOUNTS]
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

    msk_tz = ZoneInfo("Europe/Moscow")
    now_msk = datetime.now(msk_tz)
    today_msk = now_msk.date()
    
    last_claim = user.last_daily_bonus_at
    last_claim_date = None
    
    if last_claim:
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)
        last_claim_msk = last_claim.astimezone(msk_tz)
        last_claim_date = last_claim_msk.date()

    # VIP Check
    is_vip = False
    try:
         rank_prog = user.rank_progress
         if rank_prog and not rank_prog.get("has_next", True):
             is_vip = True
    except Exception:
        pass

    # 1. Check if already claimed
    if last_claim_date == today_msk:
        next_midnight = (now_msk + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return DailyBonusClaimResponse(
            success=False,
            won=False,
            bonus=0,
            streak=user.daily_bonus_streak,
            message="Бонус уже получен сегодня.",
            next_claim_at=next_midnight.isoformat()
        )

    # 2. Calculate Streak
    current_streak = user.daily_bonus_streak
    
    if last_claim_date:
        yesterday_msk = today_msk - timedelta(days=1)
        if last_claim_date == yesterday_msk:
            # Perfect streak
            new_streak = current_streak + 1
        elif last_claim_date < yesterday_msk:
            # Streak broken
            new_streak = 1
            logger.info(f"[DailyBonus] Streak reset for {tg_user.id}. Missed day.")
        else:
            # Should not happen (claim in future?), treat as increment
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
    msg = f"🎁 +{bonus_amount}₽ (День {new_streak})"
    if milestone_reached:
        msg += f"\n🏆 +{milestone_reached['reward']}₽ за стрик!"

    return DailyBonusClaimResponse(
        success=True,
        won=True,
        bonus=total_bonus,
        streak=new_streak,
        message=msg,
        next_claim_at=next_midnight.isoformat()
    )


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

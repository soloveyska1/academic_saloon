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
    result = await session.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    streak = getattr(user, 'daily_bonus_streak', 0) or 0
    last_claim = user.last_daily_bonus_at
    is_vip = getattr(user, 'rank', None) and getattr(user.rank, 'is_max', False) if hasattr(user, 'rank') else False

    can_claim = True
    cooldown_remaining = None

    if last_claim:
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)

        next_claim = last_claim + timedelta(hours=DAILY_COOLDOWN_HOURS)
        streak_expires = last_claim + timedelta(hours=DAILY_COOLDOWN_HOURS + STREAK_GRACE_PERIOD_HOURS)

        if now < next_claim:
            can_claim = False
            remaining = next_claim - now
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            cooldown_remaining = f"{hours}ч {minutes}мин" if hours > 0 else f"{minutes}мин"

        # Стрик сбрасывается если прошло больше grace period
        if now > streak_expires:
            streak = 0

    # Текущий день в 7-дневном цикле
    if can_claim:
        current_day = (streak % 7) + 1
    else:
        current_day = ((streak - 1) % 7) + 1 if streak > 0 else 1

    # Базовый бонус
    base_bonus = DAILY_BONUS_AMOUNTS[current_day - 1] if can_claim else (
        DAILY_BONUS_AMOUNTS[current_day % 7] if streak > 0 else DAILY_BONUS_AMOUNTS[0]
    )

    # Применяем VIP множитель
    next_bonus = _calculate_bonus_amount(base_bonus, is_vip)

    return DailyBonusInfoResponse(
        can_claim=can_claim,
        streak=streak,  # Теперь возвращаем общий стрик, а не день цикла
        next_bonus=next_bonus,
        cooldown_remaining=cooldown_remaining,
        bonuses=[_calculate_bonus_amount(b, is_vip) for b in DAILY_BONUS_AMOUNTS]
    )

@router.post("/daily-bonus/claim", response_model=DailyBonusClaimResponse)
async def claim_daily_bonus(
    request: Request,
    tg_user: TelegramUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Получение ежедневного бонуса.

    ГАРАНТИРОВАННЫЙ бонус - если cooldown прошёл, бонус будет начислен 100%.

    Защита от абьюза:
    - FOR UPDATE блокировка для предотвращения race condition
    - Строгая проверка cooldown на стороне сервера
    - Атомарное обновление стрика и баланса

    Бонусные механики:
    - VIP множитель x1.5 для пользователей с максимальным рангом
    - Milestone бонусы за длинные стрики (7, 14, 30, 60, 90, 180, 365 дней)
    - 7-дневный цикл с возрастающими наградами
    """
    # ═══ ЗАЩИТА: FOR UPDATE блокировка для предотвращения параллельных запросов ═══
    result = await session.execute(
        select(User)
        .where(User.telegram_id == tg_user.id)
        .with_for_update()  # Блокируем запись на время транзакции
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    streak = getattr(user, 'daily_bonus_streak', 0) or 0
    last_claim = user.last_daily_bonus_at

    # Определяем VIP статус для множителя
    is_vip = False
    try:
        # Пытаемся получить информацию о ранге
        if hasattr(user, 'rank') and user.rank:
            is_vip = getattr(user.rank, 'is_max', False)
    except Exception:
        pass  # Если rank не загружен, просто игнорируем

    # ═══ ПРОВЕРКА COOLDOWN ═══
    if last_claim:
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)

        next_claim_time = last_claim + timedelta(hours=DAILY_COOLDOWN_HOURS)
        streak_expires = last_claim + timedelta(hours=DAILY_COOLDOWN_HOURS + STREAK_GRACE_PERIOD_HOURS)

        # Cooldown ещё не прошёл
        if now < next_claim_time:
            remaining = next_claim_time - now
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            cooldown_text = f"{hours}ч {minutes}мин" if hours > 0 else f"{minutes}мин"

            logger.warning(
                f"[DailyBonus] Cooldown not passed for user {tg_user.id}. "
                f"Last claim: {last_claim}, Next: {next_claim_time}"
            )

            return DailyBonusClaimResponse(
                success=False,
                won=False,
                bonus=0,
                streak=streak,
                message=f"Бонус уже получен. Следующий через {cooldown_text}",
                next_claim_at=next_claim_time.isoformat()
            )

        # Проверяем, не истёк ли стрик
        if now > streak_expires:
            logger.info(f"[DailyBonus] Streak reset for user {tg_user.id}. Was {streak}, now 0")
            streak = 0

    # ═══ РАСЧЁТ БОНУСА ═══
    current_day_index = streak % 7
    base_bonus = DAILY_BONUS_AMOUNTS[current_day_index]
    bonus_amount = _calculate_bonus_amount(base_bonus, is_vip)

    new_streak = streak + 1
    total_bonus = bonus_amount
    milestone_reached = None

    # ═══ ПРОВЕРКА MILESTONE ═══
    milestone = _check_milestone_reached(new_streak)
    if milestone:
        milestone_day, milestone_reward = milestone
        # VIP множитель применяется и к milestone бонусам
        milestone_bonus = _calculate_bonus_amount(milestone_reward, is_vip)
        total_bonus += milestone_bonus
        milestone_reached = {
            "day": milestone_day,
            "reward": milestone_bonus
        }
        logger.info(
            f"[DailyBonus] User {tg_user.id} reached milestone {milestone_day} days! "
            f"Extra bonus: {milestone_bonus}₽"
        )

    # ═══ АТОМАРНОЕ ОБНОВЛЕНИЕ СТРИКА ═══
    user.daily_bonus_streak = new_streak
    user.last_daily_bonus_at = now

    # ═══ НАЧИСЛЕНИЕ БОНУСА (ГАРАНТИРОВАННОЕ) ═══
    try:
        # Основной дневной бонус
        await BonusService.add_bonus(
            session=session,
            user_id=tg_user.id,
            amount=bonus_amount,
            reason=BonusReason.DAILY_LUCK,
            description=f"Ежедневный бонус (день {new_streak})" + (" 👑 VIP x1.5" if is_vip else ""),
            bot=None,
            auto_commit=False,
        )

        # Milestone бонус если достигнут
        if milestone_reached:
            await BonusService.add_bonus(
                session=session,
                user_id=tg_user.id,
                amount=milestone_reached["reward"],
                reason=BonusReason.DAILY_LUCK,
                description=f"🏆 Milestone бонус: {milestone_reached['day']} дней подряд!",
                bot=None,
                auto_commit=False,
            )

        await session.commit()

        logger.info(
            f"[DailyBonus] User {tg_user.id} claimed daily bonus: "
            f"{bonus_amount}₽ (day {current_day_index + 1}/7), streak: {new_streak}, "
            f"VIP: {is_vip}, milestone: {milestone_reached}"
        )

    except Exception as e:
        await session.rollback()
        logger.error(f"[DailyBonus] Failed to claim bonus for user {tg_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка при начислении бонуса. Попробуйте ещё раз."
        )

    next_claim_at = (now + timedelta(hours=DAILY_COOLDOWN_HOURS)).isoformat()

    # Формируем сообщение
    message_parts = [f"🎁 +{bonus_amount}₽ — ежедневный бонус!"]
    if is_vip:
        message_parts.append("👑 VIP бонус x1.5")
    if milestone_reached:
        message_parts.append(f"🏆 +{milestone_reached['reward']}₽ — {milestone_reached['day']} дней подряд!")

    message = " ".join(message_parts)

    return DailyBonusClaimResponse(
        success=True,
        won=True,  # Теперь всегда True - бонус гарантирован
        bonus=total_bonus,
        streak=new_streak,
        message=message,
        next_claim_at=next_claim_at
    )

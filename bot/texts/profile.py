"""
Profile, rank, and loyalty text templates.
Premium minimalism tone.
"""
from bot.utils.formatting import format_price
from core.ranks import (
    RankTier, LoyaltyTier,
    get_rank_for_spent, get_rank_progress,
    get_loyalty_for_orders, get_loyalty_progress,
)


# ══════════════════════════════════════════════════════════════
#                    PROFILE SUMMARY
# ══════════════════════════════════════════════════════════════

def build_profile_text(
    name: str,
    rank: RankTier,
    loyalty: LoyaltyTier,
    balance: float,
    orders_count: int,
    total_spent: float,
) -> str:
    """Build compact profile summary."""
    return f"""<b>{name}</b>

Статус: {rank.name}
Кешбэк: {rank.cashback_percent}%
Скидка: {loyalty.discount_percent}%

Баланс: {format_price(balance)}
Заказов: {orders_count}
Потрачено: {format_price(total_spent)}"""


# ══════════════════════════════════════════════════════════════
#                    RANK INFO
# ══════════════════════════════════════════════════════════════

def build_rank_text(total_spent: float) -> str:
    """Build rank info with progress to next level."""
    progress = get_rank_progress(total_spent)
    current = progress["current"]

    lines = [
        f"<b>Ваш статус: {current.name}</b>",
        f"Кешбэк: {current.cashback_percent}%",
    ]

    if current.bonus:
        lines.append(f"Бонус: {current.bonus}")

    if progress["has_next"]:
        next_tier = progress["next"]
        lines.extend([
            "",
            f"Следующий: {next_tier.name} ({next_tier.cashback_percent}% кешбэк)",
            f"Осталось потратить: {format_price(progress['spent_to_next'])}",
            f"Прогресс: {progress['progress_percent']}%",
        ])
    else:
        lines.extend(["", "Вы достигли максимального уровня."])

    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
#                    REFERRAL INFO
# ══════════════════════════════════════════════════════════════

def build_referral_text(
    referral_code: str,
    referrals_count: int,
    referral_earnings: float,
    bot_username: str,
) -> str:
    """Build referral info text."""
    link = f"https://t.me/{bot_username}?start=ref{referral_code}"

    return f"""<b>Реферальная программа</b>

Ваша ссылка:
<code>{link}</code>

Приглашено: {referrals_count}
Заработано: {format_price(referral_earnings)}

<i>Поделитесь ссылкой — получайте бонусы с каждого заказа приглашённых.</i>"""


# ══════════════════════════════════════════════════════════════
#                    BALANCE
# ══════════════════════════════════════════════════════════════

def build_balance_text(balance: float, has_expiry_warning: bool = False, expiry_days: int = 0) -> str:
    """Build balance info text."""
    text = f"""<b>Баланс</b>

Доступно: {format_price(balance)}

<i>Бонусы можно использовать при оплате заказов.</i>"""

    if has_expiry_warning and expiry_days > 0:
        text += f"\n\n⚠ Бонусы сгорят через {expiry_days} дн. Используйте их."

    return text

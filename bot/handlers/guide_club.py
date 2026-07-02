"""
Чат-разделы проводника: «Бонусы и клуб», подписка «Салон+»,
вход в поддержку и возврат в меню-проводник.

Ничего не считает заново — только показывает существующие данные
(User.balance, bonus_expiry_info, subscription_service) в понятном виде.
"""

import logging
from urllib.parse import quote

from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.keyboards.guide import get_guide_menu, GUIDE_MENU_TEXT
from core.config import settings

logger = logging.getLogger(__name__)

router = Router()


def _build_ref_link(telegram_id: int) -> str:
    return f"https://t.me/{settings.BOT_USERNAME}?start=ref{telegram_id}"


async def _show_screen(callback: CallbackQuery, text: str, keyboard: InlineKeyboardMarkup):
    """Редактируем текущее сообщение; если нельзя (фото и т.п.) — шлём новое."""
    try:
        await callback.message.edit_text(text, reply_markup=keyboard, disable_web_page_preview=True)
    except Exception:
        try:
            await callback.message.answer(text, reply_markup=keyboard, disable_web_page_preview=True)
        except Exception as e:
            logger.warning(f"[Guide] Failed to show screen: {e}")


# ══════════════════════════════════════════════════════════════
#  ВОЗВРАТ В МЕНЮ-ПРОВОДНИК
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "guide_menu")
async def show_guide_menu(callback: CallbackQuery):
    """Кнопка «← Меню» — возвращает экран проводника."""
    try:
        await callback.answer()
    except Exception:
        pass
    await _show_screen(callback, GUIDE_MENU_TEXT, get_guide_menu())


# ══════════════════════════════════════════════════════════════
#  БОНУСЫ И КЛУБ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "guide_club")
async def show_guide_club(callback: CallbackQuery, session: AsyncSession):
    """Личный экран клуба: баланс, сгорание бонусов, рефералка, подписка."""
    try:
        await callback.answer()
    except Exception:
        pass

    telegram_id = callback.from_user.id
    ref_link = _build_ref_link(telegram_id)

    user = None
    try:
        result = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalar_one_or_none()
    except Exception as e:
        logger.warning(f"[Guide] Failed to load user {telegram_id}: {e}")

    balance = float(user.balance or 0) if user else 0.0

    lines = ["<b>Бонусы и клуб</b>", ""]
    lines.append(f"💎 Ваш баланс: <b>{balance:.0f} бонусов</b> (1 бонус = 1 ₽ скидки)")

    # Сгорание бонусов
    if user:
        try:
            expiry = user.bonus_expiry_info
            if expiry.get("has_expiry") and expiry.get("days_left", 0) > 0:
                lines.append(
                    f"⏳ {expiry['burn_amount']} бонусов сгорят {expiry['expiry_date']} — "
                    f"успейте применить к заказу."
                )
        except Exception as e:
            logger.warning(f"[Guide] Failed to build expiry info for {telegram_id}: {e}")

    # Подписка «Салон+»
    subscription = None
    try:
        from bot.services.subscription_service import MSK_TZ, TIERS, get_active_subscription
        subscription = await get_active_subscription(session, telegram_id)
    except Exception as e:
        logger.warning(f"[Guide] Failed to load subscription for {telegram_id}: {e}")

    lines.append("")
    if subscription:
        _, _, title = TIERS.get(subscription.tier, (0, 0, subscription.tier))
        expires_str = subscription.expires_at.astimezone(MSK_TZ).strftime("%d.%m.%Y")
        lines.append(
            f"⭐️ Подписка «{title}»: скидка −{subscription.discount_percent}% "
            f"до {expires_str}."
        )
    else:
        lines.append("⭐️ Подписки пока нет. «Салон+» даёт скидку до 10% на все заказы.")

    lines.append("")
    lines.append("👥 Приглашайте друзей: вам — 5% с их оплаченных заказов, другу — +200 бонусов.")
    lines.append(f"Ваша ссылка (нажмите, чтобы скопировать):\n<code>{ref_link}</code>")

    share_text = "Академический Салон — помощь с учебными работами. По моей ссылке +200 бонусов на первый заказ:"
    share_url = f"https://t.me/share/url?url={quote(ref_link, safe='')}&text={quote(share_text, safe='')}"

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👥 Пригласить друга — ссылка", url=share_url)],
        [InlineKeyboardButton(text="⭐️ Подписка «Салон+»", callback_data="guide_plus")],
        [InlineKeyboardButton(text="← Меню", callback_data="guide_menu")],
    ])

    await _show_screen(callback, "\n".join(lines), keyboard)


# ══════════════════════════════════════════════════════════════
#  ПОДПИСКА «САЛОН+» (тот же смысл, что /plus, но из кнопки)
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "guide_plus")
async def show_guide_plus(callback: CallbackQuery, session: AsyncSession):
    """Статус подписки «Салон+» или описание тарифов — как /plus."""
    try:
        await callback.answer()
    except Exception:
        pass

    subscription = None
    try:
        from bot.services.subscription_service import MSK_TZ, TIERS, get_active_subscription
        subscription = await get_active_subscription(session, callback.from_user.id)
    except Exception as e:
        logger.warning(f"[Salon+] Не удалось получить подписку {callback.from_user.id}: {e}")

    if subscription:
        _, _, title = TIERS.get(subscription.tier, (0, 0, subscription.tier))
        expires_str = subscription.expires_at.astimezone(MSK_TZ).strftime("%d.%m.%Y")
        text = (
            f"⭐️ <b>Ваша подписка: «{title}»</b>\n\n"
            f"├ Скидка: <b>−{subscription.discount_percent}%</b> на все заказы\n"
            f"└ Действует до: <b>{expires_str}</b>\n\n"
            f"<i>Скидка применяется автоматически при оформлении заказа.</i>"
        )
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="← Меню", callback_data="guide_menu")],
        ])
    else:
        text = (
            "<b>Подписка «Салон+»</b>\n\n"
            "• <b>Салон+</b> — 499 ₽/мес: скидка 5% на все заказы\n"
            "• <b>Салон+ Про</b> — 999 ₽/мес: скидка 10% на все заказы\n\n"
            "Подписка действует 30 дней, автопродления нет.\n"
            "Скидка суммируется с прочими (общая — до 25%).\n\n"
            "<i>Напишите менеджеру — активируем сразу после оплаты.</i>"
        )
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="Оформить подписку",
                url=f"https://t.me/{settings.SUPPORT_USERNAME}",
            )],
            [InlineKeyboardButton(text="← Меню", callback_data="guide_menu")],
        ])

    await _show_screen(callback, text, keyboard)


# ══════════════════════════════════════════════════════════════
#  ЗАДАТЬ ВОПРОС — вход в существующий чат поддержки
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "guide_support")
async def guide_support(callback: CallbackQuery, state: FSMContext):
    """Включает существующий режим поддержки (ChatStates.in_chat + SUPPORT)."""
    from bot.handlers.order_chat import enter_chat_support
    await enter_chat_support(callback, state)

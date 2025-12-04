"""
Сервис прогресса заказа — Live Progress.

Визуальный таймлайн выполнения заказа с уведомлениями по вехам.
"""

import logging
from datetime import datetime
from typing import Optional

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.orders import Order, OrderStatus

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════
#           КОНСТАНТЫ И НАСТРОЙКИ
# ══════════════════════════════════════════════════════════════

# Автоматический прогресс по статусам (базовые значения)
STATUS_PROGRESS = {
    OrderStatus.DRAFT.value: 0,
    OrderStatus.PENDING.value: 5,
    OrderStatus.WAITING_ESTIMATION.value: 5,
    OrderStatus.WAITING_PAYMENT.value: 10,
    OrderStatus.VERIFICATION_PENDING.value: 15,
    OrderStatus.CONFIRMED.value: 10,
    OrderStatus.PAID.value: 20,
    OrderStatus.PAID_FULL.value: 25,
    OrderStatus.IN_PROGRESS.value: 30,  # Админ может увеличивать до 90
    OrderStatus.REVIEW.value: 95,
    OrderStatus.COMPLETED.value: 100,
    OrderStatus.CANCELLED.value: 0,
    OrderStatus.REJECTED.value: 0,
}

# Вехи для уведомлений
PROGRESS_MILESTONES = [25, 50, 75, 100]

# Сообщения для вех
MILESTONE_MESSAGES = {
    25: {
        "emoji": "🚀",
        "title": "Работа началась!",
        "message": "Твой заказ в работе — 25% уже готово.\nСкоро будет больше!",
    },
    50: {
        "emoji": "⚡",
        "title": "Половина пути!",
        "message": "Твой заказ готов на 50%!\nФинишная прямая всё ближе.",
    },
    75: {
        "emoji": "🔥",
        "title": "Почти готово!",
        "message": "75% выполнено — осталось совсем немного.\nГотовься принимать работу!",
    },
    100: {
        "emoji": "✨",
        "title": "Готово!",
        "message": "Твой заказ выполнен на 100%!\nПроверяй и принимай работу.",
    },
}


# ══════════════════════════════════════════════════════════════
#           ВИЗУАЛЬНЫЙ ТАЙМЛАЙН
# ══════════════════════════════════════════════════════════════

def build_progress_bar(progress: int, width: int = 10) -> str:
    """
    Строит красивый прогресс-бар.

    Args:
        progress: Прогресс 0-100
        width: Ширина бара в символах

    Returns:
        Строка прогресс-бара
    """
    progress = max(0, min(100, progress))
    filled = int(width * progress / 100)
    empty = width - filled

    # Разные стили в зависимости от прогресса
    if progress == 0:
        bar = "░" * width
        emoji = "⏳"
    elif progress < 25:
        bar = "▓" * filled + "░" * empty
        emoji = "🌱"
    elif progress < 50:
        bar = "▓" * filled + "░" * empty
        emoji = "🚀"
    elif progress < 75:
        bar = "▓" * filled + "░" * empty
        emoji = "⚡"
    elif progress < 100:
        bar = "▓" * filled + "░" * empty
        emoji = "🔥"
    else:
        bar = "█" * width
        emoji = "✨"

    return f"{emoji} [{bar}] {progress}%"


def build_timeline(order: Order) -> str:
    """
    Строит визуальный таймлайн заказа.

    Args:
        order: Объект заказа

    Returns:
        Строка с таймлайном
    """
    progress = order.progress if hasattr(order, 'progress') and order.progress else 0
    status = order.status

    # Определяем этапы
    stages = [
        ("📝", "Создан", [OrderStatus.DRAFT.value, OrderStatus.PENDING.value, OrderStatus.WAITING_ESTIMATION.value]),
        ("💵", "Оценён", [OrderStatus.WAITING_PAYMENT.value, OrderStatus.CONFIRMED.value]),
        ("💳", "Оплачен", [OrderStatus.PAID.value, OrderStatus.PAID_FULL.value, OrderStatus.VERIFICATION_PENDING.value]),
        ("⚙️", "В работе", [OrderStatus.IN_PROGRESS.value]),
        ("✅", "Готово", [OrderStatus.REVIEW.value, OrderStatus.COMPLETED.value]),
    ]

    # Определяем текущий этап
    current_stage_idx = 0
    for idx, (emoji, label, statuses) in enumerate(stages):
        if status in statuses:
            current_stage_idx = idx
            break
        if status == OrderStatus.COMPLETED.value:
            current_stage_idx = len(stages) - 1

    # Строим визуальный таймлайн
    timeline_parts = []
    for idx, (emoji, label, _) in enumerate(stages):
        if idx < current_stage_idx:
            # Пройденный этап
            timeline_parts.append(f"✅")
        elif idx == current_stage_idx:
            # Текущий этап
            timeline_parts.append(f"🔵")
        else:
            # Будущий этап
            timeline_parts.append(f"⚪")

    timeline_visual = " → ".join(timeline_parts)

    # Собираем блок прогресса
    progress_bar = build_progress_bar(progress)

    # Текстовые метки под таймлайном
    stage_labels = "  ".join([s[0] for s in stages])

    lines = [
        "📊 <b>Прогресс выполнения:</b>",
        "",
        f"   {timeline_visual}",
        f"   {stage_labels}",
        "",
        f"   {progress_bar}",
    ]

    # Добавляем ETA если заказ в работе
    if status == OrderStatus.IN_PROGRESS.value and progress > 0 and progress < 100:
        if order.deadline:
            lines.append(f"   ⏰ Дедлайн: {order.deadline}")

    return "\n".join(lines)


def build_compact_progress(order: Order) -> str:
    """
    Компактный прогресс для списка заказов.

    Args:
        order: Объект заказа

    Returns:
        Однострочный прогресс
    """
    progress = order.progress if hasattr(order, 'progress') and order.progress else 0

    if progress == 0:
        return ""
    elif progress == 100:
        return "✅ 100%"
    else:
        # Мини-бар из 5 символов
        filled = int(5 * progress / 100)
        bar = "▓" * filled + "░" * (5 - filled)
        return f"[{bar}] {progress}%"


# ══════════════════════════════════════════════════════════════
#           УВЕДОМЛЕНИЯ О ПРОГРЕССЕ
# ══════════════════════════════════════════════════════════════

async def notify_progress_milestone(
    bot: Bot,
    order: Order,
    milestone: int,
) -> bool:
    """
    Отправить уведомление о достижении вехи прогресса.

    Args:
        bot: Экземпляр бота
        order: Заказ
        milestone: Достигнутая веха (25, 50, 75, 100)

    Returns:
        True если уведомление отправлено
    """
    template = MILESTONE_MESSAGES.get(milestone)
    if not template:
        return False

    progress_bar = build_progress_bar(milestone)

    text = f"""{template['emoji']} <b>{template['title']}</b>

<b>Заказ #{order.id}</b> · {order.work_type_label}

{template['message']}

{progress_bar}"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📋 Посмотреть заказ",
            callback_data=f"order_detail:{order.id}"
        )],
        [InlineKeyboardButton(
            text="💬 Написать по заказу",
            callback_data=f"enter_chat_order_{order.id}"
        )],
    ])

    try:
        await bot.send_message(
            chat_id=order.user_id,
            text=text,
            reply_markup=keyboard,
        )
        logger.info(f"Progress milestone {milestone}% notification sent for order #{order.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send progress notification for order #{order.id}: {e}")
        return False


async def update_order_progress(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    new_progress: int,
    notify: bool = True,
) -> list[int]:
    """
    Обновить прогресс заказа и отправить уведомления о вехах.

    Args:
        session: Сессия БД
        bot: Экземпляр бота
        order: Заказ
        new_progress: Новый прогресс (0-100)
        notify: Отправлять ли уведомления

    Returns:
        Список достигнутых вех
    """
    new_progress = max(0, min(100, new_progress))
    old_progress = order.progress if hasattr(order, 'progress') and order.progress else 0

    # Если прогресс не изменился
    if new_progress == old_progress:
        return []

    # Обновляем прогресс
    order.progress = new_progress
    order.progress_updated_at = datetime.now()
    await session.commit()

    # ═══ WEBSOCKET REAL-TIME УВЕДОМЛЕНИЕ В MINI APP ═══
    if notify and new_progress > old_progress:
        try:
            from bot.services.realtime_notifications import send_progress_notification

            # Определяем сообщение для вехи
            milestone_msg = None
            for milestone in PROGRESS_MILESTONES:
                if old_progress < milestone <= new_progress:
                    if milestone in MILESTONE_MESSAGES:
                        milestone_msg = MILESTONE_MESSAGES[milestone]["message"]
                        break

            await send_progress_notification(
                telegram_id=order.user_id,
                order_id=order.id,
                progress=new_progress,
                custom_message=milestone_msg
            )
            logger.info(f"[WS] Sent progress notification to user {order.user_id}: {new_progress}%")
        except Exception as e:
            logger.warning(f"[WS] Failed to send progress notification: {e}")

    # Проверяем достигнутые вехи (отправка в бота)
    reached_milestones = []
    if notify and new_progress > old_progress:
        for milestone in PROGRESS_MILESTONES:
            if old_progress < milestone <= new_progress:
                reached_milestones.append(milestone)
                await notify_progress_milestone(bot, order, milestone)

    logger.info(f"Order #{order.id} progress updated: {old_progress}% → {new_progress}%")

    return reached_milestones


def get_auto_progress(status: str) -> int:
    """
    Получить автоматический прогресс по статусу.

    Args:
        status: Статус заказа

    Returns:
        Процент прогресса
    """
    return STATUS_PROGRESS.get(status, 0)


async def sync_progress_with_status(
    session: AsyncSession,
    bot: Bot,
    order: Order,
    notify: bool = True,
) -> None:
    """
    Синхронизировать прогресс со статусом.
    Вызывается при изменении статуса заказа.

    Args:
        session: Сессия БД
        bot: Экземпляр бота
        order: Заказ
        notify: Отправлять ли уведомления
    """
    auto_progress = get_auto_progress(order.status)
    current_progress = order.progress if hasattr(order, 'progress') and order.progress else 0

    # Прогресс не должен уменьшаться (кроме отмены)
    if order.status in [OrderStatus.CANCELLED.value, OrderStatus.REJECTED.value]:
        new_progress = 0
    else:
        new_progress = max(current_progress, auto_progress)

    if new_progress != current_progress:
        await update_order_progress(session, bot, order, new_progress, notify)


# ══════════════════════════════════════════════════════════════
#           КЛАВИАТУРЫ ДЛЯ АДМИНКИ
# ══════════════════════════════════════════════════════════════

def get_progress_keyboard(order_id: int, current_progress: int) -> InlineKeyboardMarkup:
    """
    Клавиатура для установки прогресса в админке.

    Args:
        order_id: ID заказа
        current_progress: Текущий прогресс

    Returns:
        Клавиатура с кнопками прогресса
    """
    buttons = []

    # Пресеты прогресса
    presets = [25, 50, 75, 90, 100]
    row = []
    for p in presets:
        marker = "✓ " if p == current_progress else ""
        row.append(InlineKeyboardButton(
            text=f"{marker}{p}%",
            callback_data=f"admin_set_progress:{order_id}:{p}"
        ))
        if len(row) == 3:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    # Кнопки +10 / -10
    buttons.append([
        InlineKeyboardButton(
            text="➖ 10%",
            callback_data=f"admin_progress_dec:{order_id}"
        ),
        InlineKeyboardButton(
            text="➕ 10%",
            callback_data=f"admin_progress_inc:{order_id}"
        ),
    ])

    # Назад
    buttons.append([
        InlineKeyboardButton(
            text="◀️ Назад к заказу",
            callback_data=f"admin_order_detail:{order_id}"
        ),
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)

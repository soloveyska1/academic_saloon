"""
Premium Real-Time Notification System
Умные контекстные уведомления для каждого этапа заказа
"""

from __future__ import annotations

import logging
from datetime import datetime
from enum import Enum
from typing import Any
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)
MSK_TZ = ZoneInfo("Europe/Moscow")
LEGACY_ORDER_STATUS_ALIASES = {
    "confirmed": "waiting_payment",
}


class NotificationType(str, Enum):  # noqa: UP042
    """Типы уведомлений"""
    ORDER_CREATED = "order_created"
    ORDER_PENDING = "order_pending"
    ORDER_REJECTED = "order_rejected"
    PRICE_SET = "price_set"
    WAITING_PAYMENT = "waiting_payment"
    PAYMENT_PENDING = "payment_pending"
    PAYMENT_CONFIRMED = "payment_confirmed"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    PROGRESS_UPDATE = "progress_update"
    REVIEW = "review"
    REVISION = "revision"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BONUS_EARNED = "bonus_earned"
    BONUS_SPENT = "bonus_spent"


# ═══════════════════════════════════════════════════════════════════════════
#  КОНФИГУРАЦИЯ УВЕДОМЛЕНИЙ ПО СТАТУСАМ
# ═══════════════════════════════════════════════════════════════════════════

ORDER_STATUS_NOTIFICATIONS = {
    # Заказ принят и передан на оценку
    "pending": {
        "type": NotificationType.ORDER_PENDING,
        "title": "Заявка принята",
        "message": "Менеджер изучает вводные и готовит расчёт",
        "icon": "clock",
        "color": "#d4af37",
        "priority": "normal",
    },

    # Заказ создан
    "waiting_estimation": {
        "type": NotificationType.ORDER_CREATED,
        "title": "Заказ принят!",
        "message": "Менеджер рассчитает стоимость в ближайшее время",
        "icon": "sparkles",  # для фронтенда
        "color": "#d4af37",
        "priority": "normal",
    },

    # Цена назначена, ожидание оплаты
    "waiting_payment": {
        "type": NotificationType.PRICE_SET,
        "title": "Расчёт готов",
        "message": "Проверьте сумму и переходите к оплате",
        "icon": "check-circle",
        "color": "#d4af37",  # Золотой для премиальности
        "priority": "high",
        "action": "view_order",  # кнопка действия
    },

    # Ожидание подтверждения оплаты
    "verification_pending": {
        "type": NotificationType.PAYMENT_PENDING,
        "title": "Проверяем оплату",
        "message": "Обычно это занимает 5-15 минут",
        "icon": "clock",
        "color": "#8b5cf6",
        "priority": "normal",
    },

    # Оплата подтверждена
    "paid": {
        "type": NotificationType.PAYMENT_CONFIRMED,
        "title": "Оплата подтверждена",
        "message": "Заказ принят в работу. Дальше обновления придут автоматически",
        "icon": "check-circle",
        "color": "#22c55e",
        "priority": "high",
        "celebration": True,
    },

    "paid_full": {
        "type": NotificationType.PAYMENT_CONFIRMED,
        "title": "Оплата подтверждена",
        "message": "Заказ полностью оплачен. Дальше обновления придут автоматически",
        "icon": "check-circle",
        "color": "#22c55e",
        "priority": "high",
        "celebration": True,
    },

    # В работе
    "in_progress": {
        "type": NotificationType.IN_PROGRESS,
        "title": "Работа идёт",
        "message": "Автор активно работает над заказом",
        "icon": "edit",
        "color": "#3b82f6",
        "priority": "normal",
    },

    "paused": {
        "type": NotificationType.PAUSED,
        "title": "Заморозка активирована",
        "message": "Заказ поставлен на паузу. Возобновить его можно раньше срока.",
        "icon": "clock",
        "color": "#d4af37",
        "priority": "high",
        "action": "view_order",
    },

    # На проверке
    "review": {
        "type": NotificationType.REVIEW,
        "title": "Работа готова",
        "message": "Проверьте результат и подтвердите выполнение",
        "icon": "eye",
        "color": "#a855f7",
        "priority": "high",
        "action": "view_order",
        "celebration": True,
    },

    # Доработка
    "revision": {
        "type": NotificationType.REVISION,
        "title": "Вносим правки",
        "message": "Ваши замечания приняты, дорабатываем",
        "icon": "refresh",
        "color": "#f59e0b",
        "priority": "normal",
    },

    # Выполнен
    "completed": {
        "type": NotificationType.COMPLETED,
        "title": "Заказ выполнен",
        "message": "Спасибо за доверие! Будем рады видеть вас снова",
        "icon": "trophy",
        "color": "#22c55e",
        "priority": "high",
        "celebration": True,
        "confetti": True,
    },

    # Отменён
    "cancelled": {
        "type": NotificationType.CANCELLED,
        "title": "Заказ отменён",
        "message": "Заказ был отменён",
        "icon": "x-circle",
        "color": "#ef4444",
        "priority": "normal",
    },

    "rejected": {
        "type": NotificationType.ORDER_REJECTED,
        "title": "Заказ отклонён",
        "message": "Мы не можем взять этот заказ в работу. Поддержка поможет подобрать альтернативу.",
        "icon": "x-circle",
        "color": "#ef4444",
        "priority": "high",
    },
}


def canonicalize_order_status_for_notifications(status: str | None) -> str | None:
    """Collapse legacy outward-facing aliases to one client-visible status."""
    if status is None:
        return None
    return LEGACY_ORDER_STATUS_ALIASES.get(status, status)


# ═══════════════════════════════════════════════════════════════════════════
#  УВЕДОМЛЕНИЯ О ПРОГРЕССЕ
# ═══════════════════════════════════════════════════════════════════════════

PROGRESS_MILESTONES = {
    10: {
        "title": "Работа начата",
        "message": "Автор приступил к выполнению",
        "emoji": "🚀",
    },
    25: {
        "title": "Четверть готово",
        "message": "Работа идёт по плану",
        "emoji": "📝",
    },
    50: {
        "title": "Половина готово!",
        "message": "Уже на полпути к результату",
        "emoji": "⚡",
    },
    75: {
        "title": "Почти готово",
        "message": "Финальный этап работы",
        "emoji": "🎯",
    },
    90: {
        "title": "Финишная прямая",
        "message": "Завершаем и проверяем работу",
        "emoji": "✨",
    },
    100: {
        "title": "Работа завершена!",
        "message": "Готово к проверке",
        "emoji": "🎉",
    },
}


# ═══════════════════════════════════════════════════════════════════════════
#  УВЕДОМЛЕНИЯ О БОНУСАХ
# ═══════════════════════════════════════════════════════════════════════════

BALANCE_NOTIFICATIONS = {
    "order_created": {
        "positive": {
            "title": "Бонус за заказ!",
            "message": "+{amount}₽ на ваш баланс",
        },
    },
    "referral_bonus": {
        "positive": {
            "title": "Реферальный бонус!",
            "message": "Ваш друг сделал заказ: +{amount}₽",
        },
    },
    "admin_adjustment": {
        "positive": {
            "title": "Бонус начислен",
            "message": "+{amount}₽ от администрации",
        },
        "negative": {
            "title": "Корректировка баланса",
            "message": "-{amount}₽ списано",
        },
    },
    "order_discount": {
        "negative": {
            "title": "Бонусы применены",
            "message": "Скидка {amount}₽ на заказ",
        },
    },
    "compensation": {
        "positive": {
            "title": "Компенсация",
            "message": "+{amount}₽ зачислено на баланс",
        },
    },
    "bonus_return": {
        "positive": {
            "title": "Бонусы возвращены",
            "message": "+{amount}₽ за отменённый заказ",
        },
    },
    "order_cashback": {
        "positive": {
            "title": "Кэшбэк за заказ",
            "message": "+{amount}₽ начислено на баланс",
        },
    },
    "daily_luck": {
        "positive": {
            "title": "Ежедневный бонус",
            "message": "+{amount}₽ зачислено в серию дня",
        },
    },
    "achievement": {
        "positive": {
            "title": "Награда за достижение",
            "message": "+{amount}₽ зачислено на бонусный баланс",
        },
    },
    "streak_freeze": {
        "negative": {
            "title": "Защита серии активирована",
            "message": "-{amount}₽ списано за защиту пропуска",
        },
    },
}


# ═══════════════════════════════════════════════════════════════════════════
#  ФУНКЦИИ ОТПРАВКИ УВЕДОМЛЕНИЙ
# ═══════════════════════════════════════════════════════════════════════════

async def send_order_status_notification(
    telegram_id: int,
    order_id: int,
    new_status: str,
    old_status: str = None,
    extra_data: dict[str, Any] = None
) -> bool:
    """
    Отправить умное уведомление о смене статуса заказа
    """
    try:
        from bot.api.websocket import manager

        canonical_new_status = canonicalize_order_status_for_notifications(new_status)
        canonical_old_status = canonicalize_order_status_for_notifications(old_status)

        # Получаем конфигурацию уведомления
        config = ORDER_STATUS_NOTIFICATIONS.get(canonical_new_status)
        if not config:
            logger.warning(f"[Notify] No notification config for status: {canonical_new_status}")
            return False

        # Динамически формируем сообщение с ценой для waiting_payment
        msg_text = config["message"]
        title_text = config["title"]

        if extra_data and canonical_new_status == "waiting_payment":
            final_price = extra_data.get("final_price")
            bonus_used = extra_data.get("bonus_used", 0)
            if final_price:
                # Форматируем цену с пробелами для читаемости
                from bot.utils.formatting import format_price
                msg_text = f"К оплате: {format_price(final_price)}"
                if bonus_used > 0:
                    msg_text += f" (бонусы: −{format_price(bonus_used)})"
        elif extra_data and canonical_new_status == "paused":
            pause_until = extra_data.get("pause_until")
            if isinstance(pause_until, str) and pause_until.strip():
                try:
                    pause_until_dt = datetime.fromisoformat(pause_until.replace("Z", "+00:00")).astimezone(MSK_TZ)
                    msg_text = f"Заморозка активна до {pause_until_dt.strftime('%d.%m.%Y %H:%M МСК')}"
                except ValueError:
                    msg_text = "Заморозка активирована на 7 дней"

        # Формируем сообщение
        message = {
            "type": "order_update",
            "notification_type": config["type"].value,
            "order_id": order_id,
            "status": canonical_new_status,
            "old_status": canonical_old_status,
            "title": title_text,
            "message": msg_text,
            "icon": config.get("icon", "package"),
            "color": config.get("color", "#d4af37"),
            "priority": config.get("priority", "normal"),
            "action": config.get("action"),
            "celebration": config.get("celebration", False),
            "confetti": config.get("confetti", False),
            "data": extra_data or {},
        }

        await manager.send_to_user(telegram_id, message)
        logger.info(f"[Notify] Sent {canonical_new_status} notification to user {telegram_id} for order #{order_id}")
        return True

    except Exception as e:
        logger.error(f"[Notify] Failed to send status notification: {e}")
        return False


async def send_progress_notification(
    telegram_id: int,
    order_id: int,
    progress: int,
    custom_message: str = None
) -> bool:
    """
    Отправить уведомление о прогрессе выполнения
    """
    try:
        from bot.api.websocket import manager

        # Ищем ближайший milestone
        milestone = None
        for threshold in sorted(PROGRESS_MILESTONES.keys()):
            if progress >= threshold:
                milestone = PROGRESS_MILESTONES[threshold]

        if not milestone and progress < 10:
            return False  # Не отправляем если прогресс < 10%

        message = {
            "type": "progress_update",
            "order_id": order_id,
            "progress": progress,
            "title": milestone["title"] if milestone else f"Прогресс: {progress}%",
            "message": custom_message or (milestone["message"] if milestone else ""),
            "emoji": milestone.get("emoji", "📊") if milestone else "📊",
            "icon": "trending-up",
            "color": "#3b82f6",
        }

        await manager.send_to_user(telegram_id, message)
        logger.info(f"[Notify] Sent progress {progress}% notification to user {telegram_id}")
        return True

    except Exception as e:
        logger.error(f"[Notify] Failed to send progress notification: {e}")
        return False


async def send_balance_notification(
    telegram_id: int,
    change: float,
    new_balance: float,
    reason: str,
    reason_key: str = None
) -> bool:
    """
    Отправить уведомление об изменении баланса
    """
    try:
        from bot.api.websocket import manager

        is_positive = change > 0

        # Получаем конфигурацию
        config = None
        if reason_key and reason_key in BALANCE_NOTIFICATIONS:
            key = "positive" if is_positive else "negative"
            config = BALANCE_NOTIFICATIONS[reason_key].get(key)

        if config:
            title = config["title"]
            msg = config["message"].format(amount=abs(change))
        else:
            title = "Баланс пополнен!" if is_positive else "Списание"
            msg = f"{'+' if is_positive else '-'}{abs(change):.0f}₽"

        message = {
            "type": "balance_update",
            "balance": new_balance,
            "change": change,
            "title": title,
            "message": msg,
            "reason": reason,
            "icon": "trending-up" if is_positive else "trending-down",
            "color": "#22c55e" if is_positive else "#ef4444",
            "celebration": is_positive and abs(change) >= 100,
        }

        await manager.send_to_user(telegram_id, message)
        logger.info(f"[Notify] Sent balance notification to user {telegram_id}: {change:+.0f}₽")
        return True

    except Exception as e:
        logger.error(f"[Notify] Failed to send balance notification: {e}")
        return False


async def send_custom_notification(
    telegram_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    icon: str = "bell",
    color: str = "#d4af37",
    action: str = None,
    celebration: bool = False,
    confetti: bool = False,
    data: dict[str, Any] = None
) -> bool:
    """
    Отправить кастомное уведомление
    """
    try:
        from bot.api.websocket import manager

        msg = {
            "type": "notification",
            "notification_type": notification_type,
            "title": title,
            "message": message,
            "icon": icon,
            "color": color,
            "action": action,
            "celebration": celebration,
            "confetti": confetti,
            "data": data or {},
        }

        await manager.send_to_user(telegram_id, msg)
        logger.info(f"[Notify] Sent custom notification to user {telegram_id}: {title}")
        return True

    except Exception as e:
        logger.error(f"[Notify] Failed to send custom notification: {e}")
        return False


async def notify_new_chat_message(
    telegram_id: int,
    order_id: int,
    sender_name: str,
    message_preview: str,
    file_type: str | None = None,
) -> bool:
    """
    Send WebSocket notification about new chat message.
    Used when admin sends message to client in mini-app chat.
    """
    try:
        from bot.api.websocket import manager

        # Determine message content preview
        if file_type:
            file_icons = {
                "photo": "🖼 Фото",
                "video": "🎬 Видео",
                "document": "📎 Документ",
                "voice": "🎤 Голосовое",
                "audio": "🎵 Аудио",
            }
            content = file_icons.get(file_type, "📎 Файл")
        else:
            content = message_preview[:100] if message_preview else "Новое сообщение"

        message = {
            "type": "chat_message",
            "order_id": order_id,
            "title": f"💬 {sender_name}",
            "message": content,
            "timestamp": datetime.now().isoformat(),
        }

        await manager.send_to_user(telegram_id, message)
        logger.info(f"[Notify] Sent chat message notification to user {telegram_id} for order #{order_id}")
        return True

    except Exception as e:
        logger.error(f"[Notify] Failed to send chat message notification: {e}")
        return False

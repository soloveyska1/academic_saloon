from __future__ import annotations

from datetime import datetime, timedelta
from html import escape
from typing import Iterable

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from bot.utils.formatting import format_price
from core.config import settings
from database.models.orders import (
    WORK_TYPE_LABELS,
    Order,
    OrderStatus,
    WorkType,
    get_status_meta,
)


DEADLINE_LABELS = {
    "today": "Сегодня",
    "tomorrow": "Завтра",
    "3days": "2-3 дня",
    "3_days": "2-3 дня",
    "week": "Неделя",
    "2weeks": "2 недели",
    "2_weeks": "2 недели",
    "month": "Месяц+",
    "flexible": "Гибкий срок",
}


def format_money(amount: float | int | None) -> str:
    return format_price(float(amount or 0))


def format_plain_text(value: str | None, fallback: str = "—") -> str:
    if not value:
        return fallback
    stripped = value.strip()
    return escape(stripped) if stripped else fallback


def format_deadline_label(deadline: str | None, fallback: str = "Срок уточняется") -> str:
    if not deadline:
        return fallback

    normalized = deadline.strip().lower()
    if normalized in DEADLINE_LABELS:
        return DEADLINE_LABELS[normalized]

    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(deadline.strip(), fmt)
            return parsed.strftime("%d.%m.%Y")
        except ValueError:
            continue

    return escape(deadline.strip())


def format_deadline_for_admin(deadline: str | None) -> str:
    label = format_deadline_label(deadline)
    if label == "Срок уточняется":
        return label
    return f"до {label}"


def get_work_label(work_type: str | None) -> str:
    if not work_type:
        return "Заказ"
    try:
        return WORK_TYPE_LABELS.get(WorkType(work_type), work_type)
    except ValueError:
        return work_type


def get_order_work_label(order: Order) -> str:
    return get_work_label(order.work_type)


def get_status_label(status: str | OrderStatus) -> str:
    meta = get_status_meta(status)
    return meta.get("label", "Ожидает оценки")


def build_order_webapp_url(order_id: int) -> str:
    return f"{settings.WEBAPP_URL}/order/{order_id}"


def build_orders_webapp_url() -> str:
    return f"{settings.WEBAPP_URL}/orders"


def build_support_url() -> str:
    return f"https://t.me/{settings.SUPPORT_USERNAME}"


def build_order_keyboard(
    order_id: int,
    primary_text: str = "Открыть заказ",
    chat_callback: str | None = None,
    chat_text: str = "Написать менеджеру",
) -> InlineKeyboardMarkup:
    rows = [[
        InlineKeyboardButton(
            text=primary_text,
            web_app=WebAppInfo(url=build_order_webapp_url(order_id)),
        )
    ]]

    if chat_callback:
        rows.append([InlineKeyboardButton(text=chat_text, callback_data=chat_callback)])

    return InlineKeyboardMarkup(inline_keyboard=rows)


def build_payment_keyboard(
    order_id: int,
    chat_callback: str | None = None,
    primary_text: str = "Открыть оплату",
) -> InlineKeyboardMarkup:
    return build_order_keyboard(
        order_id=order_id,
        primary_text=primary_text,
        chat_callback=chat_callback,
        chat_text="Обсудить условия",
    )


def build_issue_keyboard(order_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть заказ",
                    web_app=WebAppInfo(url=build_order_webapp_url(order_id)),
                )
            ],
            [
                InlineKeyboardButton(
                    text=f"Поддержка @{settings.SUPPORT_USERNAME}",
                    url=build_support_url(),
                )
            ],
        ]
    )


def build_support_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=f"Написать в поддержку @{settings.SUPPORT_USERNAME}",
                    url=build_support_url(),
                )
            ]
        ]
    )


def build_price_breakdown_lines(order: Order) -> list[str]:
    if (order.price or 0) <= 0:
        return []

    lines = [f"Базовая стоимость: <b>{format_money(order.price)}</b>"]

    if (order.discount or 0) > 0:
        lines.append(f"Скидка статуса: −{int(round(order.discount or 0))}%")

    if getattr(order, "promo_code", None):
        promo_code = format_plain_text(order.promo_code)
        promo_discount = int(round(getattr(order, "promo_discount", 0) or 0))
        lines.append(f"Промокод <code>{promo_code}</code>: −{promo_discount}%")

    if (order.bonus_used or 0) > 0:
        lines.append(f"Списано бонусов: −{format_money(order.bonus_used)}")

    lines.append(f"К оплате: <b>{format_money(order.final_price)}</b>")

    if (order.paid_amount or 0) > 0:
        lines.append(f"Оплачено: {format_money(order.paid_amount)}")
        remaining = max(float(order.final_price or 0) - float(order.paid_amount or 0), 0)
        if remaining > 0:
            lines.append(f"Осталось получить: {format_money(remaining)}")

    return lines


def join_lines(lines: Iterable[str]) -> str:
    return "\n".join(line for line in lines if line)


def build_client_order_created_text(
    order: Order,
    subject: str | None = None,
    promo_code: str | None = None,
    promo_discount: float | None = None,
) -> str:
    lines = [
        "<b>Заявка принята</b>",
        "",
        f"Заказ <code>#{order.id}</code> · {format_plain_text(get_order_work_label(order))}",
    ]

    topic_text = subject or order.subject
    if topic_text:
        lines.append(f"Тема: {format_plain_text(topic_text)}")

    if order.deadline:
        lines.append(f"Срок: {format_deadline_label(order.deadline)}")

    if promo_code:
        lines.append(
            f"Промокод: <code>{format_plain_text(promo_code)}</code> · −{int(round(promo_discount or 0))}%"
        )

    lines.extend(
        [
            "",
            "Менеджер изучит детали и вернётся с точной стоимостью.",
        ]
    )
    return join_lines(lines)


def build_client_price_ready_text(order: Order) -> str:
    lines = [
        "<b>Стоимость готова</b>",
        "",
        f"Заказ <code>#{order.id}</code> · {format_plain_text(get_order_work_label(order))}",
    ]

    if order.deadline:
        lines.append(f"Срок: {format_deadline_label(order.deadline)}")

    lines.append("")
    lines.extend(build_price_breakdown_lines(order))
    lines.extend(
        [
            "",
            "Откройте заказ, чтобы выбрать способ оплаты или задать вопрос по условиям.",
        ]
    )
    return join_lines(lines)


def build_client_payment_rejected_text(order_id: int, reason: str) -> str:
    return join_lines(
        [
            "<b>Платёж пока не подтверждён</b>",
            "",
            f"Заказ <code>#{order_id}</code>",
            f"Причина: {format_plain_text(reason)}",
            "",
            "Проверьте перевод. Если деньги уже списались, откройте заказ или напишите в поддержку.",
        ]
    )


def build_status_notification_text(
    order: Order,
    title: str,
    message: str,
    show_price: bool = False,
) -> str:
    lines = [
        f"<b>{format_plain_text(title)}</b>",
        "",
        f"Заказ <code>#{order.id}</code> · {format_plain_text(get_order_work_label(order))}",
    ]

    if order.deadline:
        lines.append(f"Срок: {format_deadline_label(order.deadline)}")

    if show_price:
        lines.append("")
        lines.extend(build_price_breakdown_lines(order))

    lines.extend(["", format_plain_text(message)])
    return join_lines(lines)


def build_admin_topic_header_text(
    *,
    order: Order | None,
    client_name: str,
    client_username: str | None,
    user_id: int,
) -> str:
    lines = [
        "<b>Диалог с клиентом</b>",
        "",
        f"Клиент: {format_plain_text(client_name)}",
        f"Telegram: @{format_plain_text(client_username, 'нет username')}" if client_username else "Telegram: нет username",
        f"ID: <code>{user_id}</code>",
    ]

    if order:
        lines.extend(
            [
                "",
                f"Заказ: <code>#{order.id}</code>",
                f"Формат: {format_plain_text(get_order_work_label(order))}",
                f"Тема: {format_plain_text(order.subject, 'Не указана')}",
                f"Срок: {format_deadline_for_admin(order.deadline)}",
                f"Статус: {format_plain_text(get_status_label(order.status))}",
                (
                    f"Стоимость: {format_money(order.final_price)}"
                    if (order.price or 0) > 0
                    else "Стоимость: ещё не назначена"
                ),
            ]
        )

    lines.extend(
        [
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "<i>Сообщения в этом топике уходят клиенту.</i>",
            "<i>Сообщение с точки <code>.</code> остаётся внутренним комментарием.</i>",
        ]
    )
    return join_lines(lines)

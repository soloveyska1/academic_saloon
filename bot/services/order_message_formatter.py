from __future__ import annotations

from collections.abc import Iterable
from contextlib import suppress
from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from bot.services.payment_accounting import (
    get_order_remaining_amount,
    get_requested_payment_amount,
    get_requested_payment_label,
    is_followup_payment,
)
from bot.utils.formatting import format_price
from core.config import settings
from database.models.orders import (
    WORK_TYPE_LABELS,
    Order,
    OrderStatus,
    WorkType,
    get_status_meta,
)

MSK_TZ = ZoneInfo("Europe/Moscow")


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


def format_admin_datetime(value: datetime | None, fallback: str = "—") -> str:
    if value is None:
        return fallback
    if value.tzinfo is None:
        return value.strftime("%d.%m.%Y %H:%M")
    return value.astimezone(MSK_TZ).strftime("%d.%m.%Y %H:%M")


def format_compact_text(value: str | None, fallback: str = "—", limit: int = 180) -> str:
    if not value:
        return fallback
    normalized = " ".join(str(value).split())
    if not normalized:
        return fallback
    if len(normalized) > limit:
        normalized = f"{normalized[: limit - 1].rstrip()}…"
    return escape(normalized)


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
    activity_snapshot_lines: Iterable[str] | None = None,
    latest_delivery: dict[str, object] | None = None,
    draft_delivery: dict[str, object] | None = None,
    operational_lines: Iterable[str] | None = None,
) -> str:
    lines = [
        "<b>Диалог с клиентом</b>",
        "",
        f"Клиент: {format_plain_text(client_name)}",
        f"Telegram: @{format_plain_text(client_username, 'нет username')}" if client_username else "Telegram: нет username",
        f"ID: <code>{user_id}</code>",
    ]

    if order:
        paid_amount = float(order.paid_amount or 0)
        final_price = float(order.final_price or 0)
        remaining = max(final_price - paid_amount, 0)
        requested_payment_amount = float(get_requested_payment_amount(order, getattr(order, "payment_scheme", None)) or 0)
        requested_payment_label = get_requested_payment_label(order, getattr(order, "payment_scheme", None))
        requested_payment_text = {
            "Доплата": "доплату",
            "Оплата": "оплату",
            "Аванс": "аванс",
        }.get(requested_payment_label, requested_payment_label.lower())
        subject_or_topic = order.subject or getattr(order, "topic", None)
        lines.extend(
            [
                "",
                f"Заказ: <code>#{order.id}</code>",
                f"Формат: {format_plain_text(get_order_work_label(order))}",
                f"Тема: {format_plain_text(subject_or_topic, 'Не указана')}",
                f"Срок: {format_deadline_for_admin(order.deadline)}",
                f"Статус: {format_plain_text(get_status_label(order.status))}",
            ]
        )
        if (order.price or 0) > 0:
            lines.extend(
                [
                    f"Итого: {format_money(order.final_price)}",
                    f"Оплачено: {format_money(paid_amount)}",
                ]
            )
            if remaining > 0:
                lines.append(f"Осталось: {format_money(remaining)}")
        else:
            lines.append("Стоимость: ещё не назначена")

        if final_price > 0:
            if remaining <= 0:
                payment_state = "Платёж: оплачен полностью"
            elif getattr(order, "status", None) == OrderStatus.VERIFICATION_PENDING.value:
                payment_state = f"Платёж: на проверке ({requested_payment_text} {format_money(requested_payment_amount)})"
            else:
                payment_state = f"Платёж: ждём {requested_payment_text} {format_money(requested_payment_amount)}"
            lines.append(payment_state)

        lines.extend(
            [
                f"Кругов правок: {int(order.revision_count or 0)}",
                f"Папка: {'подключена' if order.files_url else 'ещё не создана'}",
            ]
        )
        if latest_delivery:
            latest_version = latest_delivery.get("version_number")
            latest_sent_at = latest_delivery.get("sent_at")
            latest_comment = str(latest_delivery.get("manager_comment") or "").strip()
            latest_files = int(latest_delivery.get("file_count") or 0)
            version_label = f"Версия {latest_version}" if latest_version else "Последняя версия"
            lines.append(
                f"{version_label}: {format_admin_datetime(datetime.fromisoformat(str(latest_sent_at))) if latest_sent_at else format_admin_datetime(order.delivered_at)}"
            )
            if latest_files > 0:
                lines.append(f"Выдано файлов: {latest_files}")
            if latest_comment:
                lines.append(f"Комментарий к версии: {format_compact_text(latest_comment, limit=160)}")
        else:
            lines.append(f"Последняя выдача: {format_admin_datetime(order.delivered_at)}")

        if draft_delivery:
            draft_files = int(draft_delivery.get("file_count") or 0)
            draft_comment = str(draft_delivery.get("manager_comment") or "").strip()
            draft_created_at = draft_delivery.get("created_at")
            draft_summary = f"Черновик выдачи: {draft_files} файл(ов)"
            if draft_created_at:
                with suppress(ValueError, TypeError):
                    draft_summary = f"{draft_summary} · {format_admin_datetime(datetime.fromisoformat(str(draft_created_at)))}"
            lines.append(draft_summary)
            if draft_comment:
                lines.append(f"Черновой комментарий: {format_compact_text(draft_comment, limit=160)}")

        if order.admin_notes:
            lines.append(f"Заметка: {format_compact_text(order.admin_notes, limit=160)}")
        if operational_lines:
            lines.append("Операционно:")
            for item in operational_lines:
                lines.append(f"• {format_plain_text(str(item))}")
        if activity_snapshot_lines:
            lines.append("Последние события:")
            for item in activity_snapshot_lines:
                lines.append(f"• {format_plain_text(str(item))}")

    lines.extend(
        [
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "<i>Текстовые сообщения в этом топике уходят клиенту.</i>",
            "<i>Файлы, фото и голосовые попадают в черновик выдачи и отправляются только через <code>/deliver</code>.</i>",
            "<i>Сообщение с точки <code>.</code> остаётся внутренним комментарием.</i>",
            "<i>Быстрые команды: /summary /history /note /folder /deliver /pay /paid /review /done /card /price</i>",
        ]
    )
    return join_lines(lines)


def build_admin_topic_header_keyboard(
    order: Order | None,
    *,
    has_delivery_draft: bool = False,
    latest_delivery_url: str | None = None,
) -> InlineKeyboardMarkup | None:
    if not order:
        return None

    delivery_button = InlineKeyboardButton(
        text="📦 Отправить версию" if has_delivery_draft else "📎 Сначала файлы",
        callback_data=f"topic_action:deliver:{order.id}" if has_delivery_draft else f"topic_action:delivery_help:{order.id}",
    )

    rows = [
        [
            InlineKeyboardButton(text="📊 Сводка", callback_data=f"topic_action:summary:{order.id}"),
            InlineKeyboardButton(text="🕘 История", callback_data=f"topic_action:history:{order.id}"),
            InlineKeyboardButton(text="📝 Заметка", callback_data=f"topic_action:note:{order.id}"),
        ],
        [
            InlineKeyboardButton(text="📋 Карточка", callback_data=f"topic_action:card:{order.id}"),
            delivery_button,
            InlineKeyboardButton(text="↩️ На проверку", callback_data=f"topic_action:review:{order.id}"),
        ],
        [
            InlineKeyboardButton(text="✅ Закрыть", callback_data=f"topic_action:complete:{order.id}"),
        ],
    ]

    if has_delivery_draft:
        rows.append(
            [
                InlineKeyboardButton(text="🧹 Очистить черновик", callback_data=f"topic_action:clear_delivery:{order.id}"),
            ]
        )

    remaining_amount = get_order_remaining_amount(order)
    if remaining_amount > 0 and (order.price or 0) > 0:
        if getattr(order, "status", None) == OrderStatus.VERIFICATION_PENDING.value:
            rows.append(
                [
                    InlineKeyboardButton(text="✅ Подтвердить оплату", callback_data=f"topic_action:paid:{order.id}"),
                ]
            )
        else:
            invoice_text = "💰 Доплата" if is_followup_payment(order) else "💳 Счёт"
            confirm_text = "✅ Доплата" if is_followup_payment(order) else "✅ Оплачено"
            rows.append(
                [
                    InlineKeyboardButton(text=invoice_text, callback_data=f"topic_action:invoice:{order.id}"),
                    InlineKeyboardButton(text=confirm_text, callback_data=f"topic_action:paid:{order.id}"),
                ]
            )

    file_links: list[InlineKeyboardButton] = []
    if latest_delivery_url:
        file_links.append(InlineKeyboardButton(text="📂 Последняя версия", url=latest_delivery_url))
    if order.files_url:
        file_links.append(InlineKeyboardButton(text="🗂 Папка заказа", url=order.files_url))
    if file_links:
        rows.append(file_links)

    return InlineKeyboardMarkup(inline_keyboard=rows)

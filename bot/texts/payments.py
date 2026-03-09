"""
Payment-related text templates.
Premium minimalism tone.
"""
from bot.utils.formatting import format_price


# ══════════════════════════════════════════════════════════════
#                    PAYMENT INSTRUCTIONS
# ══════════════════════════════════════════════════════════════

def build_payment_details(
    order_id: int,
    amount: float,
    payment_card: str = "",
    payment_phone: str = "",
    payment_banks: str = "",
    payment_name: str = "",
) -> str:
    """Build unified payment instructions text."""
    lines = [
        f"<b>Оплата заказа #{order_id}</b>",
        "",
        f"Сумма: <b>{format_price(amount)}</b>",
        "",
    ]

    if payment_card:
        lines.append(f"Карта: <code>{payment_card}</code>")
    if payment_phone:
        lines.append(f"СБП: <code>{payment_phone}</code>")
    if payment_banks:
        lines.append(f"Банки: {payment_banks}")
    if payment_name:
        lines.append(f"Получатель: {payment_name}")

    lines.extend([
        "",
        "<i>После оплаты отправьте скриншот чека.</i>",
    ])

    return "\n".join(lines)


def payment_scheme_text(scheme: str, price: float) -> str:
    """Explain payment scheme."""
    if scheme == "half":
        half = price / 2
        return f"""<b>Схема оплаты: 50/50</b>

Аванс: {format_price(half)}
Остаток после проверки: {format_price(half)}"""
    else:
        return f"""<b>Полная оплата</b>

Сумма: {format_price(price)}"""


# ══════════════════════════════════════════════════════════════
#                    PAYMENT STATUS
# ══════════════════════════════════════════════════════════════

PAYMENT_RECEIPT_RECEIVED = """<b>Чек получен</b>

Проверяем оплату. Обычно это занимает не более 15 минут."""

PAYMENT_CONFIRMED = """<b>Оплата подтверждена</b>

Приступаем к выполнению вашего заказа."""

PAYMENT_REJECTED = """<b>Оплата не подтверждена</b>

Причина: {reason}

Если считаете это ошибкой — обратитесь в поддержку."""

PAYMENT_REMINDER_2H = """<b>Напоминание об оплате</b>

По заказу #{order_id} ожидается оплата.

<i>Если возникли вопросы — напишите в поддержку.</i>"""

PAYMENT_REMINDER_24H = """<b>Оплата ожидается</b>

Заказ #{order_id} ожидает оплаты уже сутки.

<i>Нужна помощь с оплатой?</i>"""

PAYMENT_REMINDER_3D = """<b>Последнее напоминание</b>

Заказ #{order_id} будет автоматически отменён, если оплата не поступит в ближайшее время."""


# ══════════════════════════════════════════════════════════════
#                    DIGITAL RECEIPT
# ══════════════════════════════════════════════════════════════

def build_receipt(order_id: int, amount: float, method: str, work_type: str) -> str:
    """Generate digital receipt text."""
    from datetime import datetime
    now = datetime.now().strftime("%d.%m.%Y %H:%M")

    return f"""<b>Academic Saloon — Чек</b>

Заказ: #{order_id}
Дата: {now}
Услуга: {work_type}
Сумма: {format_price(amount)}
Способ: {method}
Статус: Оплачено"""

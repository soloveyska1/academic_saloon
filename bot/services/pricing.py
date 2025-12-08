"""
Сервис автоматического расчёта цены заказа.
"Money While Sleeping" Engine - Шериф считает смету без участия админа.
"""
import logging
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from database.models.orders import WorkType

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════
#                    КОНФИГУРАЦИЯ ЦЕН (Легко менять)
# ══════════════════════════════════════════════════════════════

# Базовые цены по типам работ (в рублях)
# Можно вынести в Redis/DB для динамического обновления
BASE_PRICES: dict[str, int] = {
    # Мелкие работы (Simple)
    WorkType.ESSAY.value: 2500,
    WorkType.REPORT.value: 2500,
    WorkType.PRESENTATION.value: 2500,
    WorkType.CONTROL.value: 3000,
    WorkType.INDEPENDENT.value: 3500,

    # Средние работы
    WorkType.PRACTICE.value: 8000,           # Отчёт по практике
    WorkType.COURSEWORK.value: 14000,        # Курсовая (теория)
    # TODO: Добавить различие курсовая теория/эмпирика = 16000

    # Крупные работы
    WorkType.DIPLOMA.value: 40000,           # Диплом (ВКР)
    WorkType.MASTERS.value: 50000,           # Магистерская

    # Спецзаказы
    WorkType.OTHER.value: 5000,              # База для спецзаказа (ручная оценка)
    WorkType.PHOTO_TASK.value: 3000,         # Фото задания (срочный)
}

# Множители срочности (поддерживаем оба формата: с underscore для бота, без - для mini app API)
URGENCY_MULTIPLIERS: dict[str, float] = {
    "month": 1.0,       # Месяц / На расслабоне
    "2weeks": 1.1,      # 2 недели (mini app формат)
    "2_weeks": 1.1,     # 2 недели (bot формат)
    "week": 1.2,        # Неделя
    "3days": 1.4,       # 2-3 дня (mini app формат)
    "3_days": 1.4,      # 2-3 дня (bot формат)
    "tomorrow": 1.7,    # Завтра
    "today": 2.0,       # Сегодня (ГОРИТ!)
    "asap": 1.5,        # Как можно скорее (средний)
    "custom": 1.0,      # Своя дата (без наценки)
}

# Человекочитаемые названия сроков для UI (оба формата)
DEADLINE_LABELS: dict[str, str] = {
    "today": "🔥 Сегодня (x2.0)",
    "tomorrow": "⚡ Завтра (x1.7)",
    "3days": "🏎 2-3 дня (x1.4)",
    "3_days": "🏎 2-3 дня (x1.4)",
    "week": "📅 Неделя (x1.2)",
    "2weeks": "🐢 2 недели (x1.1)",
    "2_weeks": "🐢 2 недели (x1.1)",
    "month": "🐌 Месяц (x1.0)",
    "asap": "⚡ ASAP (x1.5)",
    "custom": "📝 Своя дата",
}


@dataclass
class PriceCalculation:
    """Результат расчёта цены"""
    base_price: int
    urgency_multiplier: float
    final_price: int
    discount_percent: int = 0
    discount_amount: int = 0
    price_after_discount: int = 0
    is_manual_required: bool = False  # True для спецзаказов

    @property
    def urgency_label(self) -> str:
        """Человекочитаемый множитель"""
        return f"x{self.urgency_multiplier}"


def round_to_nearest(value: float, nearest: int = 10) -> int:
    """Округляет до ближайшего значения (по умолчанию до 10)"""
    return int(nearest * round(value / nearest))


def calculate_price(
    work_type: str,
    deadline_key: str,
    discount_percent: int = 0,
    custom_base_price: Optional[int] = None,
) -> PriceCalculation:
    """
    Рассчитывает цену заказа.

    Args:
        work_type: Тип работы (значение WorkType enum)
        deadline_key: Ключ срочности (today, tomorrow, week, etc.)
        discount_percent: Процент скидки пользователя (0-100)
        custom_base_price: Кастомная базовая цена (для ручной установки админом)

    Returns:
        PriceCalculation с деталями расчёта
    """
    # Проверяем, требуется ли ручная оценка (спецзаказ)
    is_special = work_type == WorkType.OTHER.value

    # Базовая цена
    if custom_base_price is not None:
        base_price = custom_base_price
    else:
        base_price = BASE_PRICES.get(work_type, 5000)  # Default 5000 для неизвестных

    # Множитель срочности
    urgency_multiplier = URGENCY_MULTIPLIERS.get(deadline_key, 1.0)

    # Расчёт финальной цены
    raw_price = base_price * urgency_multiplier
    final_price = round_to_nearest(raw_price, 10)

    # Применяем скидку
    discount_amount = 0
    price_after_discount = final_price

    if discount_percent > 0:
        discount_amount = round_to_nearest(final_price * (discount_percent / 100), 10)
        price_after_discount = final_price - discount_amount

    return PriceCalculation(
        base_price=base_price,
        urgency_multiplier=urgency_multiplier,
        final_price=final_price,
        discount_percent=discount_percent,
        discount_amount=discount_amount,
        price_after_discount=price_after_discount,
        is_manual_required=is_special,
    )


def format_price_breakdown(calc: PriceCalculation, work_label: str, deadline_label: str) -> str:
    """
    Форматирует детализацию цены для пользователя.

    Returns:
        Красиво отформатированная строка с breakdown'ом цены
    """
    lines = [
        f"📂 <b>Тип:</b> {work_label}",
        f"⏳ <b>Срок:</b> {deadline_label}",
        "",
        f"💵 <b>База:</b> {calc.base_price:,} ₽".replace(",", " "),
        f"⚡ <b>Срочность:</b> {calc.urgency_label}",
    ]

    if calc.discount_percent > 0:
        lines.extend([
            f"🎁 <b>Скидка:</b> −{calc.discount_percent}% (−{calc.discount_amount:,} ₽)".replace(",", " "),
            "",
            f"💰 <b>ИТОГО:</b> <code>{calc.price_after_discount:,} ₽</code>".replace(",", " "),
        ])
    else:
        lines.extend([
            "",
            f"💰 <b>ИТОГО:</b> <code>{calc.final_price:,} ₽</code>".replace(",", " "),
        ])

    return "\n".join(lines)


def get_invoice_text(
    calc: PriceCalculation,
    work_label: str,
    deadline_label: str,
    order_id: Optional[int] = None,
) -> str:
    """
    Генерирует текст инвойса для отправки пользователю.
    """
    order_line = f"📋 <b>Заказ:</b> #{order_id}\n" if order_id else ""

    final_amount = calc.price_after_discount if calc.discount_percent > 0 else calc.final_price

    # Breakdown
    breakdown = format_price_breakdown(calc, work_label, deadline_label)

    text = f"""⚖️ <b>СМЕТА ГОТОВА</b>

{order_line}{breakdown}

<i>Цена рассчитана автоматически. Шериф может скорректировать для сложных случаев.</i>"""

    return text


def get_special_order_text() -> str:
    """Текст для спецзаказа (ручная оценка)"""
    return """🦄 <b>СПЕЦЗАКАЗ ПРИНЯТ</b>

Это задача для спецназа. Тут нужен индивидуальный подход.

Шериф лично изучит материалы и вернётся с ценой.
Обычно это занимает <b>до 2 часов</b> (в рабочее время).

<i>Статус: ожидает оценки 🔍</i>"""


# ══════════════════════════════════════════════════════════════
#                    ADMIN: Ручное изменение цены
# ══════════════════════════════════════════════════════════════

def format_price_update_notification(
    old_price: int,
    new_price: int,
    reason: Optional[str] = None,
) -> str:
    """
    Форматирует уведомление для пользователя об изменении цены админом.
    """
    diff = new_price - old_price
    diff_sign = "+" if diff > 0 else ""

    reason_line = f"\n\n<i>Причина: {reason}</i>" if reason else ""

    return f"""⚠️ <b>Шериф уточнил сложность работы</b>

Была: <s>{old_price:,} ₽</s>
Стала: <b>{new_price:,} ₽</b> ({diff_sign}{diff:,} ₽){reason_line}

<i>Обновлённая смета уже в твоём заказе.</i>""".replace(",", " ")


# ══════════════════════════════════════════════════════════════
#                    УТИЛИТЫ
# ══════════════════════════════════════════════════════════════

def get_base_price(work_type: str) -> int:
    """Получить базовую цену для типа работы"""
    return BASE_PRICES.get(work_type, 5000)


def get_urgency_multiplier(deadline_key: str) -> float:
    """Получить множитель срочности"""
    return URGENCY_MULTIPLIERS.get(deadline_key, 1.0)


def update_base_price(work_type: str, new_price: int) -> None:
    """
    Обновить базовую цену для типа работы.
    В будущем можно переключить на Redis/DB.
    """
    BASE_PRICES[work_type] = new_price
    logger.info(f"Base price updated: {work_type} = {new_price}")


def update_urgency_multiplier(deadline_key: str, new_multiplier: float) -> None:
    """
    Обновить множитель срочности.
    В будущем можно переключить на Redis/DB.
    """
    URGENCY_MULTIPLIERS[deadline_key] = new_multiplier
    logger.info(f"Urgency multiplier updated: {deadline_key} = {new_multiplier}")

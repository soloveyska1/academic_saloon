"""
AI Assistant — FAQ matching + complexity estimation.

Keyword-based FAQ engine with confidence scoring.
Rule-based complexity estimator: work_type × deadline → difficulty.
No LLM dependency — works fully offline.
"""

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════
#  FAQ KNOWLEDGE BASE
# ══════════════════════════════════════════════════════════════

@dataclass
class FaqEntry:
    id: str
    question: str
    answer: str
    keywords: list[str]
    category: str = "general"
    priority: int = 0  # higher = shown first on ties


FAQ_DATABASE: list[FaqEntry] = [
    # ─── Оплата ───
    FaqEntry(
        id="payment_methods",
        question="Какие способы оплаты доступны?",
        answer=(
            "Доступно три способа:\n"
            "• Онлайн-оплата (ЮKassa) — моментальное подтверждение\n"
            "• Перевод на карту — подтверждение за 5-15 минут\n"
            "• СБП (по номеру телефона) — подтверждение за 5-15 минут\n\n"
            "После оплаты заказ сразу переходит в работу."
        ),
        keywords=["оплат", "оплачива", "заплатить", "платёж", "платеж", "перевод",
                  "способ", "карт", "сбп", "sbp", "юкасса", "yookassa", "онлайн"],
        category="payment",
        priority=10,
    ),
    FaqEntry(
        id="payment_half",
        question="Можно ли оплатить частями?",
        answer=(
            "Да, доступна оплата 50/50:\n"
            "• 50% — при оформлении (заказ берётся в работу)\n"
            "• 50% — после выполнения, перед получением результата\n\n"
            "Схему можно выбрать на экране оплаты."
        ),
        keywords=["частям", "часть", "половин", "50", "аванс", "предоплат",
                  "рассрочк", "доплат"],
        category="payment",
        priority=8,
    ),
    FaqEntry(
        id="payment_time",
        question="Сколько ждать подтверждение оплаты?",
        answer=(
            "Зависит от способа:\n"
            "• Онлайн (ЮKassa) — моментально, автоматически\n"
            "• Перевод на карту / СБП — 5-15 минут, проверяет менеджер\n\n"
            "После подтверждения статус заказа обновится автоматически."
        ),
        keywords=["подтвержден", "проверк", "проверя", "сколько ждать",
                  "когда подтвер", "долго"],
        category="payment",
        priority=5,
    ),
    FaqEntry(
        id="refund",
        question="Можно ли вернуть деньги?",
        answer=(
            "Гарантия возврата 100% — если работа не начата.\n"
            "Частичный возврат — если работа на ранней стадии.\n\n"
            "Напишите менеджеру в чат заказа для оформления возврата."
        ),
        keywords=["возврат", "вернуть", "деньги назад", "отмен", "отказ",
                  "обратно"],
        category="payment",
        priority=7,
    ),

    # ─── Сроки и дедлайны ───
    FaqEntry(
        id="deadline_urgent",
        question="Что делать, если сроки горят?",
        answer=(
            "Для срочных заказов:\n"
            "1. Укажите реальный дедлайн при оформлении\n"
            "2. Срочность учитывается в цене (коэффициент до x2)\n"
            "3. Минимальный срок — от 1 дня для простых работ\n\n"
            "Для максимально быстрого результата напишите менеджеру."
        ),
        keywords=["срочн", "горит", "горящ", "дедлайн", "deadline", "быстр",
                  "завтра", "сегодня", "срок"],
        category="deadlines",
        priority=9,
    ),
    FaqEntry(
        id="deadline_typical",
        question="Сколько обычно занимает выполнение?",
        answer=(
            "Средние сроки:\n"
            "• Эссе, реферат, контрольная — 2-5 дней\n"
            "• Курсовая — 7-14 дней\n"
            "• Диплом (ВКР) — 14-30 дней\n"
            "• Магистерская — 21-45 дней\n\n"
            "Точные сроки зависят от сложности и объёма."
        ),
        keywords=["сколько дней", "сколько времен", "как долго", "занима",
                  "продолжительн", "длительн", "сроки выполнен"],
        category="deadlines",
        priority=6,
    ),
    FaqEntry(
        id="deadline_extension",
        question="Можно ли продлить дедлайн?",
        answer=(
            "Если работа уже в процессе, напишите менеджеру в чат заказа.\n"
            "В большинстве случаев продление возможно без доплаты.\n"
            "Изменение срока не влияет на уже рассчитанную стоимость."
        ),
        keywords=["продлить", "перенест", "отложить", "позже", "подвину",
                  "изменить срок"],
        category="deadlines",
        priority=4,
    ),

    # ─── Правки и гарантии ───
    FaqEntry(
        id="revisions",
        question="Сколько правок входит в заказ?",
        answer=(
            "В каждый заказ включено 3 бесплатных круга правок.\n"
            "Правки принимаются в течение 14 дней после сдачи.\n\n"
            "Дополнительные правки — по договорённости с менеджером."
        ),
        keywords=["правк", "корректировк", "исправ", "доработк", "перепис",
                  "переделк", "круг правок"],
        category="guarantees",
        priority=9,
    ),
    FaqEntry(
        id="plagiarism",
        question="Какой процент уникальности?",
        answer=(
            "Стандарт — от 70% оригинальности.\n"
            "Для дипломных и магистерских — от 75-80%.\n"
            "Точный порог согласовывается при оформлении.\n\n"
            "Все работы пишутся с нуля — высокая уникальность гарантирована."
        ),
        keywords=["антиплагиат", "плагиат", "оригинальн", "уникальн",
                  "проверк.*на.*плагиат", "процент"],
        category="guarantees",
        priority=8,
    ),
    FaqEntry(
        id="quality_guarantee",
        question="Есть ли гарантия качества?",
        answer=(
            "Да, полная гарантия:\n"
            "• 3 круга бесплатных правок\n"
            "• Возврат 100% если работа не начата\n"
            "• Уникальность не ниже заявленного порога\n"
            "• Сдача точно в согласованный срок\n\n"
            "Подробности — в условиях сервиса."
        ),
        keywords=["гарант", "качеств", "надёжн", "надежн", "обманут",
                  "доверя", "можно ли верить"],
        category="guarantees",
        priority=7,
    ),
    FaqEntry(
        id="confidentiality",
        question="Мои данные в безопасности?",
        answer=(
            "Полная конфиденциальность:\n"
            "• Мы не передаём данные третьим лицам\n"
            "• Работы не публикуются и не перепродаются\n"
            "• Переписка хранится в зашифрованном виде\n"
            "• После завершения заказа — удаление по запросу"
        ),
        keywords=["конфиденциальн", "безопасн", "данные", "личн",
                  "персональн", "никто не узнает", "секрет"],
        category="guarantees",
        priority=5,
    ),

    # ─── Цены ───
    FaqEntry(
        id="pricing_general",
        question="Сколько стоят работы?",
        answer=(
            "Ориентировочные цены:\n"
            "• Эссе, реферат — от 2 500 ₽\n"
            "• Контрольная — от 3 000 ₽\n"
            "• Курсовая — от 14 000 ₽\n"
            "• Отчёт по практике — от 8 000 ₽\n"
            "• Диплом (ВКР) — от 40 000 ₽\n"
            "• Магистерская — от 50 000 ₽\n\n"
            "Точная цена зависит от требований, объёма и сроков."
        ),
        keywords=["цен", "стоимост", "сколько стоит", "прайс", "расценк",
                  "прейскурант", "тариф", "дорого", "дёшево", "дешево",
                  "бюджет"],
        category="pricing",
        priority=10,
    ),
    FaqEntry(
        id="pricing_urgency",
        question="Сколько стоит срочная работа?",
        answer=(
            "Коэффициент срочности:\n"
            "• Месяц — без наценки (x1.0)\n"
            "• 2 недели — +10% (x1.1)\n"
            "• Неделя — +20% (x1.2)\n"
            "• 2-3 дня — +40% (x1.4)\n"
            "• Завтра — +70% (x1.7)\n"
            "• Сегодня — +100% (x2.0)\n\n"
            "Срочность рассчитывается автоматически при оформлении."
        ),
        keywords=["срочн.*цен", "срочн.*стоит", "наценк", "коэффициент",
                  "множител", "дополнительн.*оплат", "доплат.*срочн"],
        category="pricing",
        priority=8,
    ),
    FaqEntry(
        id="pricing_discount",
        question="Есть ли скидки?",
        answer=(
            "Да, система лояльности:\n"
            "• Резидент (от 0 ₽) — кэшбэк 3%\n"
            "• Партнёр (от 5 000 ₽) — кэшбэк 5%\n"
            "• Приоритет (от 15 000 ₽) — кэшбэк 7%\n"
            "• Премиум клуб (от 50 000 ₽) — кэшбэк 10%\n\n"
            "Также есть промокоды и реферальная программа."
        ),
        keywords=["скидк", "акци", "промо", "промокод", "кэшбэк", "кешбек",
                  "кешбэк", "бонус", "лояльн"],
        category="pricing",
        priority=7,
    ),

    # ─── Типы работ ───
    FaqEntry(
        id="work_types",
        question="Какие виды работ вы делаете?",
        answer=(
            "Более 10 видов:\n"
            "• Курсовые работы (теория и эмпирика)\n"
            "• Дипломные работы (ВКР, магистерские)\n"
            "• Рефераты, эссе, контрольные\n"
            "• Отчёты по практике\n"
            "• Презентации\n"
            "• Самостоятельные работы\n"
            "• И другие виды по запросу\n\n"
            "Нестандартные заказы обсуждаются с менеджером."
        ),
        keywords=["виды работ", "тип.*работ", "какие работы", "что делает",
                  "что вы делает", "что можете", "предмет", "направлен",
                  "специализац"],
        category="services",
        priority=9,
    ),
    FaqEntry(
        id="custom_orders",
        question="Можно заказать нестандартную работу?",
        answer=(
            "Да, принимаем любые нестандартные заказы:\n"
            "• Просто опишите задачу при оформлении\n"
            "• Прикрепите методичку или пример\n"
            "• Менеджер оценит стоимость и сроки\n\n"
            "Выберите тип «Другое» при создании заказа."
        ),
        keywords=["нестандартн", "необычн", "особ", "индивидуальн",
                  "специальн", "кастом", "другое"],
        category="services",
        priority=5,
    ),

    # ─── Процесс заказа ───
    FaqEntry(
        id="order_process",
        question="Как оформить заказ?",
        answer=(
            "3 простых шага:\n"
            "1. Нажмите «Узнать стоимость» на главной\n"
            "2. Выберите тип работы, предмет и дедлайн\n"
            "3. Оплатите удобным способом\n\n"
            "После оплаты заказ автоматически берётся в работу."
        ),
        keywords=["оформить", "заказать", "как заказать", "создать заказ",
                  "новый заказ", "начать", "как начать", "шаг"],
        category="process",
        priority=10,
    ),
    FaqEntry(
        id="order_status",
        question="Как узнать статус заказа?",
        answer=(
            "Несколько способов:\n"
            "• В приложении: вкладка «Заказы»\n"
            "• В боте: команда /status\n"
            "• Push-уведомления при смене статуса\n\n"
            "Статусы: создан → на оценке → к оплате → в работе → на проверке → выполнен"
        ),
        keywords=["статус", "отслеж", "где заказ", "что с заказ",
                  "как узнать", "прогресс", "готов"],
        category="process",
        priority=8,
    ),
    FaqEntry(
        id="order_files",
        question="Куда прикрепить файлы и методичку?",
        answer=(
            "Файлы можно добавить:\n"
            "• При оформлении заказа (на шаге описания)\n"
            "• В чат заказа — после создания\n\n"
            "Принимаем: PDF, DOC, DOCX, фото, архивы до 20 МБ."
        ),
        keywords=["файл", "методичк", "прикрепит", "прикреплен", "загруз",
                  "отправить", "документ", "фото", "скан"],
        category="process",
        priority=6,
    ),
    FaqEntry(
        id="order_chat",
        question="Как связаться по заказу?",
        answer=(
            "В каждом заказе есть встроенный чат.\n"
            "Откройте заказ → кнопка «Чат» внизу экрана.\n\n"
            "Менеджер отвечает в течение 15 минут в рабочее время."
        ),
        keywords=["связ", "написать", "чат", "сообщен", "вопрос по заказ",
                  "общаться", "менеджер"],
        category="process",
        priority=6,
    ),

    # ─── Реферальная программа ───
    FaqEntry(
        id="referral_program",
        question="Как работает реферальная программа?",
        answer=(
            "Программа «Внутренний круг»:\n"
            "• 1-2 друга → бонус 5% от их заказов\n"
            "• 3-5 друзей → бонус 7%\n"
            "• 6+ друзей → бонус 10%\n\n"
            "Бонусы начисляются автоматически при оплате заказа другом.\n"
            "Ссылку для приглашения найдёте в профиле."
        ),
        keywords=["реферал", "пригласить", "друг", "друзей", "приглашен",
                  "внутренний круг", "бонус.*друг", "ссылк"],
        category="referral",
        priority=7,
    ),

    # ─── Поддержка ───
    FaqEntry(
        id="support_contact",
        question="Как связаться с поддержкой?",
        answer=(
            "Несколько способов:\n"
            "• Чат в приложении (вкладка «Поддержка»)\n"
            "• Команда /support в боте\n"
            "• Прямое сообщение менеджеру @Thisissaymoon\n\n"
            "Время ответа — до 15 минут."
        ),
        keywords=["поддержк", "support", "помощь", "помогите", "обратная связь",
                  "жалоб", "проблем"],
        category="support",
        priority=6,
    ),
    FaqEntry(
        id="working_hours",
        question="В какое время вы работаете?",
        answer=(
            "Мы на связи 24/7.\n"
            "Менеджер отвечает в среднем за 15 минут.\n"
            "Ночью и в выходные ответ может занять до часа."
        ),
        keywords=["график", "рабоч.*врем", "часы работ", "когда работ",
                  "24/7", "круглосуточн", "выходн", "ночь"],
        category="support",
        priority=4,
    ),
]


# ══════════════════════════════════════════════════════════════
#  FAQ MATCHING ENGINE
# ══════════════════════════════════════════════════════════════

@dataclass
class FaqMatch:
    entry: FaqEntry
    score: float  # 0.0 - 1.0


def search_faq(query: str, limit: int = 3, min_score: float = 0.15) -> list[FaqMatch]:
    """Search FAQ entries by keyword matching with scoring."""
    if not query or not query.strip():
        return []

    query_lower = query.lower().strip()
    query_words = set(re.split(r'\s+', query_lower))
    results: list[FaqMatch] = []

    for entry in FAQ_DATABASE:
        score = _calculate_match_score(query_lower, query_words, entry)
        if score >= min_score:
            results.append(FaqMatch(entry=entry, score=score))

    # Sort by score (desc), then priority (desc)
    results.sort(key=lambda m: (m.score, m.entry.priority), reverse=True)
    return results[:limit]


def _calculate_match_score(
    query_lower: str,
    query_words: set[str],
    entry: FaqEntry,
) -> float:
    """Calculate relevance score for a FAQ entry against a query."""
    score = 0.0
    matched_keywords = 0

    for keyword in entry.keywords:
        # Check if keyword is a regex pattern (contains .*)
        if ".*" in keyword or "(" in keyword:
            try:
                if re.search(keyword, query_lower):
                    score += 0.35
                    matched_keywords += 1
            except re.error:
                pass
        # Substring match
        elif keyword in query_lower:
            score += 0.3
            matched_keywords += 1
        # Check if any query word starts with the keyword root
        else:
            keyword_root = keyword[:4] if len(keyword) >= 4 else keyword
            for word in query_words:
                if word.startswith(keyword_root) or keyword_root in word:
                    score += 0.15
                    matched_keywords += 1
                    break

    # Bonus for multiple keyword matches
    if matched_keywords >= 3:
        score += 0.2
    elif matched_keywords >= 2:
        score += 0.1

    # Check question similarity (bonus)
    question_words = set(re.split(r'\s+', entry.question.lower()))
    overlap = query_words & question_words
    if len(overlap) >= 2:
        score += 0.15

    # Normalize to 0-1 range
    return min(score, 1.0)


def get_faq_by_category(category: str) -> list[FaqEntry]:
    """Get all FAQ entries for a given category."""
    return [e for e in FAQ_DATABASE if e.category == category]


def get_all_faq_categories() -> list[str]:
    """Get unique categories."""
    seen: set[str] = set()
    cats: list[str] = []
    for e in FAQ_DATABASE:
        if e.category not in seen:
            seen.add(e.category)
            cats.append(e.category)
    return cats


# ══════════════════════════════════════════════════════════════
#  COMPLEXITY ESTIMATOR
# ══════════════════════════════════════════════════════════════

@dataclass
class ComplexityEstimate:
    """Result of complexity estimation."""
    level: str  # "simple", "medium", "complex", "expert"
    score: int  # 1-10
    price_range: str  # "2 500 – 5 000 ₽"
    typical_deadline: str  # "3-7 дней"
    recommendation: str  # Human-readable advice


# Work type complexity weights (base score 1-10)
WORK_TYPE_COMPLEXITY: dict[str, int] = {
    "essay": 2,
    "report": 2,
    "presentation": 2,
    "control": 3,
    "independent": 3,
    "photo_task": 2,
    "practice": 5,
    "coursework": 6,
    "diploma": 8,
    "masters": 9,
    "other": 5,
}

# Price ranges by work type
PRICE_RANGES: dict[str, str] = {
    "essay": "2 500 – 5 000 ₽",
    "report": "2 500 – 5 000 ₽",
    "presentation": "2 500 – 4 000 ₽",
    "control": "3 000 – 6 000 ₽",
    "independent": "3 500 – 6 000 ₽",
    "photo_task": "3 000 – 5 000 ₽",
    "practice": "8 000 – 15 000 ₽",
    "coursework": "14 000 – 25 000 ₽",
    "diploma": "40 000 – 70 000 ₽",
    "masters": "50 000 – 90 000 ₽",
    "other": "от 5 000 ₽",
}

# Typical deadlines by work type
TYPICAL_DEADLINES: dict[str, str] = {
    "essay": "2-5 дней",
    "report": "2-5 дней",
    "presentation": "1-3 дня",
    "control": "1-3 дня",
    "independent": "2-5 дней",
    "photo_task": "1-2 дня",
    "practice": "5-10 дней",
    "coursework": "7-14 дней",
    "diploma": "14-30 дней",
    "masters": "21-45 дней",
    "other": "3-14 дней",
}


def estimate_complexity(
    work_type: str,
    deadline_key: str | None = None,
    pages: int | None = None,
) -> ComplexityEstimate:
    """Estimate order complexity based on work type, deadline, and volume."""
    base_score = WORK_TYPE_COMPLEXITY.get(work_type, 5)

    # Deadline modifier
    deadline_mod = 0
    if deadline_key in ("today", "tomorrow"):
        deadline_mod = 3
    elif deadline_key in ("3days", "3_days"):
        deadline_mod = 2
    elif deadline_key == "week":
        deadline_mod = 1

    # Volume modifier
    volume_mod = 0
    if pages:
        if pages > 80:
            volume_mod = 2
        elif pages > 40:
            volume_mod = 1

    total_score = min(base_score + deadline_mod + volume_mod, 10)

    # Determine level
    if total_score <= 3:
        level = "simple"
        recommendation = "Стандартный заказ. Оформляйте — выполним в срок."
    elif total_score <= 5:
        level = "medium"
        recommendation = "Заказ средней сложности. Рекомендуем не затягивать с оформлением."
    elif total_score <= 7:
        level = "complex"
        recommendation = "Сложный заказ. Рекомендуем обсудить детали с менеджером перед оформлением."
    else:
        level = "expert"
        recommendation = "Экспертный уровень. Обязательно обсудите с менеджером — подберём лучшего специалиста."

    return ComplexityEstimate(
        level=level,
        score=total_score,
        price_range=PRICE_RANGES.get(work_type, "По запросу"),
        typical_deadline=TYPICAL_DEADLINES.get(work_type, "Индивидуально"),
        recommendation=recommendation,
    )


# ══════════════════════════════════════════════════════════════
#  QUICK ANSWER (combined entry point)
# ══════════════════════════════════════════════════════════════

@dataclass
class AssistantResponse:
    """Combined response from the AI assistant."""
    found: bool
    answer: str | None = None
    faq_matches: list[FaqMatch] = field(default_factory=list)
    confidence: float = 0.0
    suggest_human: bool = False


def ask_assistant(query: str) -> AssistantResponse:
    """
    Main entry point: try to answer a user question.
    Returns the best FAQ match or suggests contacting a human.
    """
    matches = search_faq(query, limit=3, min_score=0.15)

    if not matches:
        return AssistantResponse(
            found=False,
            answer=None,
            suggest_human=True,
            confidence=0.0,
        )

    best = matches[0]

    # High confidence — return direct answer
    if best.score >= 0.4:
        return AssistantResponse(
            found=True,
            answer=best.entry.answer,
            faq_matches=matches,
            confidence=best.score,
            suggest_human=False,
        )

    # Medium confidence — return answer but suggest human too
    return AssistantResponse(
        found=True,
        answer=best.entry.answer,
        faq_matches=matches,
        confidence=best.score,
        suggest_human=True,
    )

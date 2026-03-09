"""
AI Assistant API — FAQ search + complexity estimation.
"""

import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from bot.api.auth import TelegramUser, get_current_user
from bot.services.ai_assistant import (
    ask_assistant,
    search_faq,
    estimate_complexity,
    get_all_faq_categories,
    get_faq_by_category,
    FAQ_DATABASE,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["assistant"])


# ══════════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════════

class AskRequest(BaseModel):
    query: str


class FaqItem(BaseModel):
    id: str
    question: str
    answer: str
    category: str


class AskResponse(BaseModel):
    found: bool
    answer: str | None = None
    confidence: float = 0.0
    suggest_human: bool = False
    related: list[FaqItem] = []


class ComplexityRequest(BaseModel):
    work_type: str
    deadline: str | None = None
    pages: int | None = None


class ComplexityResponse(BaseModel):
    level: str
    score: int
    price_range: str
    typical_deadline: str
    recommendation: str


class FaqListResponse(BaseModel):
    categories: list[str]
    items: list[FaqItem]


# ══════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.post("/assistant/ask", response_model=AskResponse)
async def assistant_ask(
    body: AskRequest,
    tg_user: TelegramUser = Depends(get_current_user),
):
    """Ask the AI assistant a question. Returns FAQ match or suggests human support."""
    result = ask_assistant(body.query.strip())

    related = [
        FaqItem(
            id=m.entry.id,
            question=m.entry.question,
            answer=m.entry.answer,
            category=m.entry.category,
        )
        for m in result.faq_matches[1:]  # exclude first (it's the main answer)
    ]

    return AskResponse(
        found=result.found,
        answer=result.answer,
        confidence=result.confidence,
        suggest_human=result.suggest_human,
        related=related,
    )


@router.post("/assistant/complexity", response_model=ComplexityResponse)
async def assistant_complexity(
    body: ComplexityRequest,
    tg_user: TelegramUser = Depends(get_current_user),
):
    """Estimate order complexity based on work type, deadline, and volume."""
    est = estimate_complexity(
        work_type=body.work_type,
        deadline_key=body.deadline,
        pages=body.pages,
    )
    return ComplexityResponse(
        level=est.level,
        score=est.score,
        price_range=est.price_range,
        typical_deadline=est.typical_deadline,
        recommendation=est.recommendation,
    )


@router.get("/assistant/faq", response_model=FaqListResponse)
async def assistant_faq_list(
    tg_user: TelegramUser = Depends(get_current_user),
):
    """Get full FAQ list grouped by categories."""
    items = [
        FaqItem(
            id=e.id,
            question=e.question,
            answer=e.answer,
            category=e.category,
        )
        for e in FAQ_DATABASE
    ]
    return FaqListResponse(
        categories=get_all_faq_categories(),
        items=items,
    )

"""
Cache module for frequently accessed but rarely changed data.
Reduces database queries by caching rank_levels and loyalty_levels.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.levels import RankLevel, LoyaltyLevel

logger = logging.getLogger(__name__)

# Simple in-memory cache with TTL
class SimpleCache:
    """Simple in-memory cache with time-to-live (TTL) support"""

    def __init__(self):
        self._cache: dict[str, tuple[Any, datetime]] = {}

    def get(self, key: str, ttl_seconds: int = 300) -> Optional[Any]:
        """Get value from cache if not expired (default TTL: 5 minutes)"""
        if key not in self._cache:
            return None

        value, cached_at = self._cache[key]
        if datetime.now() - cached_at > timedelta(seconds=ttl_seconds):
            # Cache expired, remove it
            del self._cache[key]
            return None

        return value

    def set(self, key: str, value: Any):
        """Set value in cache with current timestamp"""
        self._cache[key] = (value, datetime.now())

    def clear(self, key: Optional[str] = None):
        """Clear specific key or entire cache"""
        if key:
            self._cache.pop(key, None)
        else:
            self._cache.clear()


# Global cache instance
_cache = SimpleCache()


async def get_cached_rank_levels(session: AsyncSession) -> list[RankLevel]:
    """
    Get rank levels with caching (5 minute TTL).
    These levels rarely change, so caching significantly reduces DB load.
    """
    cache_key = "rank_levels"
    cached = _cache.get(cache_key, ttl_seconds=300)  # 5 minutes

    if cached is not None:
        logger.debug(f"[Cache HIT] {cache_key}")
        return cached

    logger.debug(f"[Cache MISS] {cache_key} - fetching from DB")
    result = await session.execute(select(RankLevel).order_by(RankLevel.min_spent))
    levels = result.scalars().all()

    _cache.set(cache_key, levels)
    return levels


async def get_cached_loyalty_levels(session: AsyncSession) -> list[LoyaltyLevel]:
    """
    Get loyalty levels with caching (5 minute TTL).
    These levels rarely change, so caching significantly reduces DB load.
    """
    cache_key = "loyalty_levels"
    cached = _cache.get(cache_key, ttl_seconds=300)  # 5 minutes

    if cached is not None:
        logger.debug(f"[Cache HIT] {cache_key}")
        return cached

    logger.debug(f"[Cache MISS] {cache_key} - fetching from DB")
    result = await session.execute(select(LoyaltyLevel).order_by(LoyaltyLevel.min_orders))
    levels = result.scalars().all()

    _cache.set(cache_key, levels)
    return levels


def clear_levels_cache():
    """
    Clear cached levels data.
    Call this when rank_levels or loyalty_levels are modified in DB.
    """
    _cache.clear("rank_levels")
    _cache.clear("loyalty_levels")
    logger.info("[Cache] Cleared rank_levels and loyalty_levels cache")

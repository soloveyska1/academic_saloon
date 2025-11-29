"""
Единый пул Redis соединений для всего приложения.
Исключает создание множественных соединений в разных модулях.
"""

from typing import Optional
from redis.asyncio import Redis, ConnectionPool

from core.config import settings


class RedisPool:
    """
    Синглтон для управления Redis соединениями.
    Использует пул соединений для эффективного переиспользования.
    """
    _instance: Optional["RedisPool"] = None
    _cache_pool: Optional[ConnectionPool] = None
    _cache_redis: Optional[Redis] = None
    _fsm_pool: Optional[ConnectionPool] = None
    _fsm_redis: Optional[Redis] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_cache_redis(self) -> Redis:
        """
        Получить Redis соединение для кэша.
        Использует REDIS_DB_CACHE.
        """
        if self._cache_redis is None or self._cache_pool is None:
            redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB_CACHE}"
            self._cache_pool = ConnectionPool.from_url(
                redis_url,
                decode_responses=True,
                max_connections=50,  # Пул до 50 соединений
            )
            self._cache_redis = Redis(connection_pool=self._cache_pool)
        return self._cache_redis

    async def get_fsm_redis(self) -> Redis:
        """
        Получить Redis соединение для FSM storage.
        Использует REDIS_DB_FSM.
        """
        if self._fsm_redis is None or self._fsm_pool is None:
            redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB_FSM}"
            self._fsm_pool = ConnectionPool.from_url(
                redis_url,
                decode_responses=True,
                max_connections=50,
            )
            self._fsm_redis = Redis(connection_pool=self._fsm_pool)
        return self._fsm_redis

    async def close(self):
        """Закрыть все соединения при завершении работы"""
        if self._cache_redis:
            await self._cache_redis.close()
            self._cache_redis = None
        if self._cache_pool:
            await self._cache_pool.disconnect()
            self._cache_pool = None
        if self._fsm_redis:
            await self._fsm_redis.close()
            self._fsm_redis = None
        if self._fsm_pool:
            await self._fsm_pool.disconnect()
            self._fsm_pool = None


# Глобальный экземпляр
redis_pool = RedisPool()


async def get_redis() -> Redis:
    """
    Быстрый доступ к Redis для кэша.
    Используй эту функцию вместо создания своих соединений.
    """
    return await redis_pool.get_cache_redis()


async def close_redis():
    """Закрыть Redis соединения при завершении работы бота"""
    await redis_pool.close()

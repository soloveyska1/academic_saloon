from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
from core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Отключено для production
    future=True,
    # === ОПТИМИЗАЦИЯ: настройки пула соединений ===
    pool_size=10,           # Базовый размер пула
    max_overflow=20,        # Дополнительные соединения при нагрузке
    pool_pre_ping=True,     # Проверка соединения перед использованием
    pool_recycle=3600,      # Переподключение каждый час
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
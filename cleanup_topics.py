"""Скрипт для очистки битых записей служебных топиков"""
import asyncio
from database.db import async_session_maker
from sqlalchemy import text


async def cleanup():
    async with async_session_maker() as session:
        # Удаляем все записи служебных топиков
        result = await session.execute(
            text("DELETE FROM conversations WHERE conversation_type LIKE 'service_%'")
        )
        print(f"Deleted {result.rowcount} service topic records")

        await session.commit()
        print("✅ Done! Now restart the bot with: python main.py")


if __name__ == "__main__":
    asyncio.run(cleanup())

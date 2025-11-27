import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from core.config import settings
from bot.handlers.start import router as start_router
from bot.handlers.menu import router as menu_router # <-- Подключили меню с кнопками
from database.db import async_session_maker

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    logger.info("Starting Academic Saloon Bot...")
    
    # Инициализация бота с настройками по умолчанию (HTML)
    bot = Bot(
        token=settings.BOT_TOKEN.get_secret_value(),
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )

    dp = Dispatcher()

    # --- РЕГИСТРАЦИЯ РОУТЕРОВ ---
    dp.include_router(start_router)
    dp.include_router(menu_router)
    # ----------------------------

    # Middleware для сессии БД (внедряем session в хендлеры)
    @dp.update.outer_middleware
    async def db_session_middleware(handler, event, data):
        async with async_session_maker() as session:
            data['session'] = session
            return await handler(event, data)

    try:
        # Удаляем вебхук, чтобы не было конфликтов
        await bot.delete_webhook(drop_pending_updates=True)
        logger.info("Polling started...")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Error occurred: {e}")
    finally:
        await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped!")
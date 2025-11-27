import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage

from core.config import settings
from bot.handlers.start import router as start_router
from bot.handlers.terms import router as terms_router
from bot.handlers.menu import router as menu_router
from bot.handlers.orders import router as orders_router
from bot.middlewares import ErrorHandlerMiddleware, DbSessionMiddleware

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

    # FSM storage в Redis
    storage = RedisStorage.from_url(settings.REDIS_URL)
    dp = Dispatcher(storage=storage)

    # --- РЕГИСТРАЦИЯ MIDDLEWARE ---
    dp.update.outer_middleware(ErrorHandlerMiddleware())
    dp.update.outer_middleware(DbSessionMiddleware())
    # -------------------------------

    # --- РЕГИСТРАЦИЯ РОУТЕРОВ ---
    dp.include_router(start_router)
    dp.include_router(terms_router)   # Оферта
    dp.include_router(orders_router)  # FSM для заказов
    dp.include_router(menu_router)
    # ----------------------------

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
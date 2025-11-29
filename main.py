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
from bot.handlers.admin import router as admin_router
from bot.handlers.log_actions import router as log_actions_router
from bot.handlers.my_orders import router as my_orders_router
from bot.middlewares import (
    ErrorHandlerMiddleware,
    DbSessionMiddleware,
    BanCheckMiddleware,
    AntiSpamMiddleware,
    StopWordsMiddleware,
)
from bot.services.logger import init_logger
from bot.services.abandoned_detector import init_abandoned_tracker
from bot.services.daily_stats import init_daily_stats
from bot.services.silence_reminder import init_silence_reminder
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

    # FSM storage в Redis
    storage = RedisStorage.from_url(settings.REDIS_URL)
    dp = Dispatcher(storage=storage)

    # --- РЕГИСТРАЦИЯ MIDDLEWARE ---
    dp.update.outer_middleware(ErrorHandlerMiddleware())
    dp.update.outer_middleware(DbSessionMiddleware())
    dp.update.outer_middleware(BanCheckMiddleware())  # Проверка бана
    dp.update.outer_middleware(AntiSpamMiddleware())  # Защита от спама
    dp.update.outer_middleware(StopWordsMiddleware())  # Стоп-слова
    # -------------------------------

    # --- ИНИЦИАЛИЗАЦИЯ СЕРВИСОВ ---
    init_logger(bot)
    abandoned_tracker = init_abandoned_tracker(bot, storage)
    logger.info("Abandoned order tracker started")
    daily_stats = init_daily_stats(bot)
    logger.info("Daily stats service started")
    silence_reminder = init_silence_reminder(bot, async_session_maker)
    logger.info("Silence reminder service started")
    # --------------------------------

    # --- РЕГИСТРАЦИЯ РОУТЕРОВ ---
    dp.include_router(log_actions_router)  # Обработчики кнопок логов (первыми!)
    dp.include_router(admin_router)   # Админка (до start, чтобы /admin обрабатывался)
    dp.include_router(start_router)
    dp.include_router(terms_router)   # Оферта
    dp.include_router(orders_router)  # FSM для заказов
    dp.include_router(my_orders_router)  # История заказов
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
        # Останавливаем фоновые задачи
        abandoned_tracker.stop()
        daily_stats.stop()
        silence_reminder.stop()
        await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped!")
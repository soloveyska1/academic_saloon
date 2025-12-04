import asyncio
import logging
from aiogram import Dispatcher
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import BotCommand, BotCommandScopeDefault, MenuButtonWebApp, WebAppInfo

from core.config import settings
from bot.bot_instance import get_bot, set_bot, close_bot
from bot.handlers.start import router as start_router
from bot.handlers.terms import router as terms_router
from bot.handlers.menu import router as menu_router
from bot.handlers.order_flow import order_router as orders_router
from bot.handlers.admin import router as admin_router
from bot.handlers.log_actions import router as log_actions_router
from bot.handlers.my_orders import router as my_orders_router
from bot.handlers.channel_cards import router as channel_cards_router
from bot.handlers.order_chat import router as order_chat_router
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
from bot.services.unified_hub import init_unified_hub
from database.db import async_session_maker
from core.redis_pool import close_redis

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_api_server():
    """Run FastAPI server for Mini App"""
    try:
        import uvicorn
    except ImportError:
        logger.warning("⚠️ uvicorn not installed, Mini App API disabled. Install with: pip install uvicorn")
        return

    try:
        from bot.api import api_app
    except ImportError as e:
        logger.error(f"❌ Failed to import bot.api: {e}")
        import traceback
        traceback.print_exc()
        return

    try:
        config = uvicorn.Config(
            api_app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
            access_log=True
        )
        server = uvicorn.Server(config)
        logger.info("🌐 Mini App API starting on http://0.0.0.0:8000")
        await server.serve()
    except Exception as e:
        logger.error(f"API server error: {e}")


async def run_bot():
    """Run Telegram bot"""
    logger.info("🤖 Starting Academic Saloon Bot...")

    # Get shared bot instance (used by both polling and API)
    bot = get_bot()
    set_bot(bot)  # Ensure it's registered globally

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

    # UNIFIED HUB: инициализация служебных топиков
    async with async_session_maker() as session:
        await init_unified_hub(bot, session)
    logger.info("UNIFIED HUB initialized")

    abandoned_tracker = init_abandoned_tracker(bot, storage)
    logger.info("Abandoned order tracker started")
    daily_stats = init_daily_stats(bot)
    logger.info("Daily stats service started")
    silence_reminder = init_silence_reminder(bot, async_session_maker)
    logger.info("Silence reminder service started")
    # --------------------------------

    # --- РЕГИСТРАЦИЯ РОУТЕРОВ ---
    dp.include_router(log_actions_router)  # Обработчики кнопок логов (первыми!)
    dp.include_router(channel_cards_router)  # Live-карточки в канале заказов
    dp.include_router(admin_router)   # Админка (до start, чтобы /admin обрабатывался)
    dp.include_router(start_router)
    dp.include_router(terms_router)   # Оферта
    dp.include_router(order_chat_router)  # Приватный чат по заказам
    dp.include_router(orders_router)  # FSM для заказов
    dp.include_router(my_orders_router)  # История заказов
    dp.include_router(menu_router)
    # ----------------------------

    try:
        # Удаляем вебхук, чтобы не было конфликтов
        await bot.delete_webhook(drop_pending_updates=True)

        # Настраиваем команды бота — минималистичный App-First подход
        commands = [
            BotCommand(command="start", description="Открыть приложение"),
            BotCommand(command="help", description="Помощь"),
        ]
        await bot.set_my_commands(commands, scope=BotCommandScopeDefault())
        logger.info("📋 Bot commands set")

        # Menu Button — кнопка слева от поля ввода, открывает Mini App
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Открыть",
                web_app=WebAppInfo(url=settings.WEBAPP_URL)
            )
        )
        logger.info("📱 Menu button configured")

        logger.info("🤖 Bot polling started...")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Bot error: {e}")
    finally:
        # Останавливаем фоновые задачи
        abandoned_tracker.stop()
        daily_stats.stop()
        silence_reminder.stop()
        # Закрываем Redis пул
        await close_redis()
        await close_bot()
        logger.info("Bot shutdown complete")


async def main():
    """Run both bot and API server concurrently"""
    logger.info("=" * 50)
    logger.info("🤠 Academic Saloon - Starting services...")
    logger.info("=" * 50)

    # Run both services concurrently
    await asyncio.gather(
        run_bot(),
        run_api_server(),
        return_exceptions=True
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Services stopped!")

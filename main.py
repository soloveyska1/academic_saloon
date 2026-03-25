import asyncio
import inspect
import logging
import signal
from contextlib import suppress
from dataclasses import dataclass, field
from typing import Any
from aiogram import Dispatcher
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import BotCommand, BotCommandScopeDefault, MenuButtonWebApp, WebAppInfo

from core.config import settings

# Initialize Sentry before anything else
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
            environment="production",
        )
    except ImportError:
        pass
from bot.bot_instance import get_bot, set_bot, close_bot
from bot.handlers.start import router as start_router
from bot.handlers.terms import router as terms_router
from bot.handlers.menu import router as menu_router
from bot.handlers.order_flow import order_router as orders_router
from bot.handlers.admin_promo import router as admin_promo_router
from bot.handlers.admin import router as admin_router
from bot.handlers.log_actions import router as log_actions_router
from bot.handlers.my_orders import router as my_orders_router
from bot.handlers.channel_cards import router as channel_cards_router
from bot.handlers.order_chat import router as order_chat_router
from bot.handlers.devops import router as devops_router
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
from bot.services.notification_scheduler import init_notification_scheduler
from bot.services.engagement_push import init_engagement_push
from bot.services.unified_hub import init_unified_hub
from database.db import async_session_maker
from core.redis_pool import close_redis

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ServiceRuntime:
    shutdown_requested: asyncio.Event = field(default_factory=asyncio.Event)
    reload_requested: asyncio.Event = field(default_factory=asyncio.Event)
    api_server: Any | None = None
    bot_dispatcher: Dispatcher | None = None


async def _stop_bot_polling(dp: Dispatcher | None) -> None:
    if dp is None:
        return

    stop_polling = getattr(dp, "stop_polling", None)
    if stop_polling is None:
        return

    result = stop_polling()
    if inspect.isawaitable(result):
        await result


async def request_shutdown(runtime: ServiceRuntime, reason: str, *, is_reload: bool = False) -> None:
    if runtime.shutdown_requested.is_set():
        return

    logger.info("Shutdown requested: %s", reason)
    if is_reload:
        runtime.reload_requested.set()

    runtime.shutdown_requested.set()

    if runtime.api_server is not None:
        runtime.api_server.should_exit = True
        runtime.api_server.force_exit = False

    with suppress(Exception):
        await _stop_bot_polling(runtime.bot_dispatcher)


def install_signal_handlers(runtime: ServiceRuntime) -> None:
    loop = asyncio.get_running_loop()

    for current_signal in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        with suppress(NotImplementedError):
            loop.add_signal_handler(
                current_signal,
                lambda current_signal=current_signal: asyncio.create_task(
                    request_shutdown(
                        runtime,
                        f"signal {current_signal.name}",
                        is_reload=current_signal == signal.SIGHUP,
                    )
                ),
            )


async def run_api_server(runtime: ServiceRuntime):
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
        runtime.api_server = server
        logger.info("🌐 Mini App API starting on http://0.0.0.0:8000")
        await server.serve()
    except Exception as e:
        logger.error(f"API server error: {e}")
        raise
    finally:
        runtime.api_server = None


async def run_bot(runtime: ServiceRuntime):
    """Run Telegram bot"""
    logger.info("🤖 Starting Academic Saloon Bot...")

    # Get shared bot instance (used by both polling and API)
    bot = get_bot()
    set_bot(bot)  # Ensure it's registered globally

    # FSM storage в Redis
    storage = RedisStorage.from_url(settings.REDIS_URL)
    dp = Dispatcher(storage=storage)
    runtime.bot_dispatcher = dp

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
    try:
        async with async_session_maker() as session:
            await init_unified_hub(bot, session)
        logger.info("UNIFIED HUB initialized")
    except Exception as e:
        logger.error(f"⚠️ UNIFIED HUB initialization failed: {e}")
        logger.info("Bot will continue without service topics...")

    abandoned_tracker = init_abandoned_tracker(bot, storage)
    logger.info("Abandoned order tracker started")
    daily_stats = init_daily_stats(bot)
    logger.info("Daily stats service started")
    silence_reminder = init_silence_reminder(bot, async_session_maker)
    logger.info("Silence reminder service started")
    notification_scheduler = init_notification_scheduler(bot, async_session_maker)
    logger.info("Notification scheduler started")
    engagement_push = init_engagement_push(bot, async_session_maker)
    logger.info("Engagement push service started")
    # --------------------------------

    # --- РЕГИСТРАЦИЯ РОУТЕРОВ ---
    dp.include_router(log_actions_router)  # Обработчики кнопок логов (первыми!)
    dp.include_router(channel_cards_router)  # Live-карточки в канале заказов
    dp.include_router(admin_promo_router)   # Promo codes (admin)
    dp.include_router(admin_router)   # Админка (до start, чтобы /admin обрабатывался)
    dp.include_router(devops_router)  # DevOps команды (/deploy, /rollback, /status, /logs)
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

        # Настраиваем команды бота — гибридный подход
        commands = [
            BotCommand(command="start", description="Открыть приложение"),
            BotCommand(command="status", description="Статус заказов"),
            BotCommand(command="support", description="Поддержка"),
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
        try:
            await dp.start_polling(bot, handle_signals=False)
        except TypeError as exc:
            if "handle_signals" not in str(exc):
                raise
            await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Bot error: {e}")
        raise
    finally:
        # Останавливаем фоновые задачи
        with suppress(Exception):
            abandoned_tracker.stop()
        with suppress(Exception):
            daily_stats.stop()
        with suppress(Exception):
            silence_reminder.stop()
        with suppress(Exception):
            notification_scheduler.stop()
        with suppress(Exception):
            engagement_push.stop()
        with suppress(Exception):
            await close_redis()
        with suppress(Exception):
            await close_bot()
        runtime.bot_dispatcher = None
        logger.info("Bot shutdown complete")


async def main():
    """Run both bot and API server concurrently"""
    logger.info("=" * 50)
    logger.info("🤠 Academic Saloon - Starting services...")
    logger.info("=" * 50)

    # Run both services concurrently (compatible with Python 3.9+)
    runtime = ServiceRuntime()
    install_signal_handlers(runtime)

    bot_task = asyncio.create_task(run_bot(runtime), name="telegram-bot")
    api_task = asyncio.create_task(run_api_server(runtime), name="mini-app-api")

    try:
        done, pending = await asyncio.wait(
            {bot_task, api_task},
            return_when=asyncio.FIRST_EXCEPTION,
        )

        crashed_task = None
        for task in done:
            if task.cancelled():
                continue
            exc = task.exception()
            if exc is not None:
                crashed_task = task
                logger.error("Service task crashed: %s", task.get_name(), exc_info=exc)
                break

        if crashed_task is not None:
            await request_shutdown(runtime, f"{crashed_task.get_name()} crashed")
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            raise crashed_task.exception()

        await asyncio.gather(*pending)
    except Exception as e:
        logger.error(f"Service crashed: {e}")
        raise
    finally:
        await request_shutdown(runtime, "main exit")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Services stopped!")

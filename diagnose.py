import sys
import os
import traceback

# Mock environment variables to pass Pydantic validation
os.environ.setdefault("BOT_TOKEN", "123:mock_token")
os.environ.setdefault("BOT_USERNAME", "mock_bot")
os.environ.setdefault("ADMIN_GROUP_ID", "-100123456789")
os.environ.setdefault("ADMIN_IDS", "[123456789]")
os.environ.setdefault("PAYMENT_PHONE", "+79001234567")
os.environ.setdefault("PAYMENT_CARD", "1234567890123456")
os.environ.setdefault("PAYMENT_BANKS", "Sber, Tinkoff")
os.environ.setdefault("PAYMENT_NAME", "Ivan I.")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("POSTGRES_USER", "postgres")
os.environ.setdefault("POSTGRES_PASSWORD", "postgres")
os.environ.setdefault("POSTGRES_DB", "saloon")
os.environ.setdefault("REDIS_HOST", "localhost")
os.environ.setdefault("REDIS_PORT", "6379")
os.environ.setdefault("REDIS_DB_FSM", "0")
os.environ.setdefault("REDIS_DB_CACHE", "1")
os.environ.setdefault("YOOKASSA_SHOP_ID", "123")
os.environ.setdefault("YOOKASSA_SECRET_KEY", "test_key")
os.environ.setdefault("WEBAPP_URL", "https://localhost")
os.environ.setdefault("SUPPORT_USERNAME", "support")
os.environ.setdefault("REVIEWS_CHANNEL", "@reviews")

# Add project root to path
sys.path.append(os.getcwd())

print("Starting diagnostic with mocked ENV...")

try:
    print("Checking imports...")
    from bot.api.app import api_app
    print("bot.api.app imported successfully")
except Exception:
    print("Failed to import bot.api.app")
    traceback.print_exc()

try:
    print("\nChecking bot.main...")
    from bot.bot_instance import get_bot
    print("bot.bot_instance imported successfully")
except Exception:
    print("Failed to import bot.bot_instance")
    traceback.print_exc()
    
print("\nDiagnostic complete.")

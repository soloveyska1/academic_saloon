import os

REQUIRED_ENV = {
    "BOT_TOKEN": "123456:TEST-TOKEN",
    "BOT_USERNAME": "test_bot",
    "ADMIN_IDS": "[123456789]",
    "PAYMENT_PHONE": "+70000000000",
    "PAYMENT_CARD": "0000000000000000",
    "PAYMENT_BANKS": "Test",
    "PAYMENT_NAME": "Test User",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "POSTGRES_DB": "test",
    "POSTGRES_HOST": "localhost",
    "POSTGRES_PORT": "5432",
    "REDIS_HOST": "localhost",
    "REDIS_PORT": "6379",
    "REDIS_DB_FSM": "0",
    "REDIS_DB_CACHE": "1",
}

for key, value in REQUIRED_ENV.items():
    os.environ.setdefault(key, value)

# Use pytest-asyncio plugin for async tests (configured in pytest.ini with asyncio_mode = auto)
# No custom event loop implementation needed - pytest-asyncio handles everything


def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as asynchronous")

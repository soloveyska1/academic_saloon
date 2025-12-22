import pytest

# Use pytest-asyncio plugin for async tests (configured in pytest.ini with asyncio_mode = auto)
# No custom event loop implementation needed - pytest-asyncio handles everything


def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as asynchronous")

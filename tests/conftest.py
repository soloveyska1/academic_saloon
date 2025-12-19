import asyncio
import pytest


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem):
    """Run async test functions without requiring external plugins."""
    test_function = pyfuncitem.obj
    if asyncio.iscoroutinefunction(test_function):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(test_function(**pyfuncitem.funcargs))
        finally:
            loop.close()
            asyncio.set_event_loop(None)
        return True
    return None


def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as asynchronous")

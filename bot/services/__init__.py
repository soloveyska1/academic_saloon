"""Lazy exports for service helpers.

Importing ``bot.services`` must not bootstrap unrelated services or settings.
"""

from importlib import import_module

_EXPORTS = {
    "BotLogger": ("bot.services.logger", "BotLogger"),
    "log_action": ("bot.services.logger", "log_action"),
    "AbandonedOrderTracker": ("bot.services.abandoned_detector", "AbandonedOrderTracker"),
    "init_abandoned_tracker": ("bot.services.abandoned_detector", "init_abandoned_tracker"),
    "get_abandoned_tracker": ("bot.services.abandoned_detector", "get_abandoned_tracker"),
    "DailyStatsService": ("bot.services.daily_stats", "DailyStatsService"),
    "init_daily_stats": ("bot.services.daily_stats", "init_daily_stats"),
    "get_daily_stats_service": ("bot.services.daily_stats", "get_daily_stats_service"),
    "YooKassaService": ("bot.services.yookassa", "YooKassaService"),
    "get_yookassa_service": ("bot.services.yookassa", "get_yookassa_service"),
}

__all__ = list(_EXPORTS)


def __getattr__(name: str):
    if name not in _EXPORTS:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    module_name, attr_name = _EXPORTS[name]
    module = import_module(module_name)
    value = getattr(module, attr_name)
    globals()[name] = value
    return value

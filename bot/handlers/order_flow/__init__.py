"""
Order Flow Package - Modular order creation handlers.

This package refactors the monolithic orders.py into a modular structure:

Modules:
- router.py: Shared router instance and constants
- utils.py: Shared utility functions
- entry.py: Entry point handlers (quick order, work type selection)
- subject.py: Subject/direction selection handlers
- task.py: Task input handlers (file/text input)
- deadline.py: Deadline selection handlers
- confirmation.py: Order confirmation and creation
- payment.py: Payment and receipt handlers
- append.py: Add files to existing orders
- edit.py: Order editing and navigation
- panic.py: Panic mode (urgent orders) flow
- notify.py: Admin notification handlers

Usage:
    from bot.handlers.order_flow import order_router
    dp.include_router(order_router)
"""

# Import router from router module
from .router import order_router

# Import all handler modules to register handlers with the router
from . import entry
from . import subject
from . import task
from . import deadline
from . import confirmation
from . import payment
from . import append
from . import edit
from . import panic
from . import notify

# Public exports
__all__ = [
    "order_router",
]

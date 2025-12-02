"""
Mini App API module
FastAPI backend for Telegram Mini App integration
"""

from .app import create_app, api_app

__all__ = ['create_app', 'api_app']

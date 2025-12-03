"""
Telegram Mini App authentication
Validates initData using HMAC-SHA256
"""

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs, unquote
from typing import Optional
from dataclasses import dataclass

from fastapi import HTTPException, Request, Depends
from fastapi.security import APIKeyHeader

from core.config import settings


@dataclass
class TelegramUser:
    """Validated Telegram user from initData"""
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = None
    is_premium: bool = False


# Header for Telegram initData
telegram_header = APIKeyHeader(name="X-Telegram-Init-Data", auto_error=False)


def validate_init_data(init_data: str, bot_token: str) -> Optional[TelegramUser]:
    """
    Validate Telegram Mini App initData

    Returns TelegramUser if valid, None otherwise

    Algorithm:
    1. Parse init_data as URL query string
    2. Extract 'hash' parameter
    3. Build data_check_string from remaining sorted params
    4. Compute HMAC-SHA256 with secret key derived from bot token
    5. Compare computed hash with provided hash
    """
    if not init_data:
        return None

    try:
        # Parse URL-encoded data
        parsed = parse_qs(init_data, keep_blank_values=True)

        # Extract hash
        received_hash = parsed.get('hash', [''])[0]
        if not received_hash:
            return None

        # Build data_check_string (sorted, excluding hash)
        data_check_parts = []
        for key in sorted(parsed.keys()):
            if key != 'hash':
                value = parsed[key][0]
                data_check_parts.append(f"{key}={value}")

        data_check_string = '\n'.join(data_check_parts)

        # Compute secret key: HMAC-SHA256(bot_token, "WebAppData")
        secret_key = hmac.new(
            b"WebAppData",
            bot_token.encode(),
            hashlib.sha256
        ).digest()

        # Compute hash
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        # Verify hash
        if not hmac.compare_digest(computed_hash, received_hash):
            return None

        # Check auth_date (not older than 24 hours for flexibility)
        auth_date = int(parsed.get('auth_date', ['0'])[0])
        if time.time() - auth_date > 86400:  # 24 hours
            return None

        # Parse user data
        user_json = parsed.get('user', [''])[0]
        if not user_json:
            return None

        user_data = json.loads(unquote(user_json))

        return TelegramUser(
            id=user_data['id'],
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name'),
            username=user_data.get('username'),
            language_code=user_data.get('language_code'),
            is_premium=user_data.get('is_premium', False)
        )

    except (KeyError, json.JSONDecodeError, ValueError):
        return None


async def get_current_user(
    init_data: Optional[str] = Depends(telegram_header)
) -> TelegramUser:
    """
    FastAPI dependency to get authenticated Telegram user

    Usage:
        @app.get("/api/user")
        async def get_user(user: TelegramUser = Depends(get_current_user)):
            ...
    """
    if not init_data:
        raise HTTPException(
            status_code=401,
            detail="Missing X-Telegram-Init-Data header"
        )

    bot_token = settings.BOT_TOKEN.get_secret_value()
    user = validate_init_data(init_data, bot_token)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired initData"
        )

    return user

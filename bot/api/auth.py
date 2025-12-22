"""
Telegram Mini App authentication
Validates initData using HMAC-SHA256
"""

import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qs, unquote
from typing import Optional, Tuple
from dataclasses import dataclass

from fastapi import HTTPException, Request, Depends
from fastapi.security import APIKeyHeader

from core.config import settings

logger = logging.getLogger(__name__)


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


def validate_init_data(init_data: str, bot_token: str) -> Tuple[Optional[TelegramUser], str]:
    """
    Validate Telegram Mini App initData

    Returns (TelegramUser, "") if valid, (None, error_reason) otherwise

    Algorithm:
    1. Parse init_data as URL query string
    2. Extract 'hash' parameter
    3. Build data_check_string from remaining sorted params
    4. Compute HMAC-SHA256 with secret key derived from bot token
    5. Compare computed hash with provided hash
    """
    if not init_data:
        logger.warning("[AUTH] Empty initData received")
        return None, "empty_init_data"

    try:
        # Parse URL-encoded data
        parsed = parse_qs(init_data, keep_blank_values=True)
        logger.debug(f"[AUTH] Parsed keys: {list(parsed.keys())}")

        # Extract hash
        received_hash = parsed.get('hash', [''])[0]
        if not received_hash:
            logger.warning("[AUTH] No hash in initData")
            return None, "missing_hash"

        # Build data_check_string (sorted, excluding hash)
        data_check_parts = []
        for key in sorted(parsed.keys()):
            if key != 'hash':
                value = parsed[key][0]
                data_check_parts.append(f"{key}={value}")

        data_check_string = '\n'.join(data_check_parts)

        # Compute secret key: HMAC-SHA256("WebAppData", bot_token)
        # Note: hmac.new(key, msg, digestmod) - per Telegram docs and aiogram implementation,
        # key is "WebAppData", msg is bot_token (mathematical notation is msg, key order)
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
            logger.warning(f"[AUTH] Hash mismatch! received={received_hash[:16]}... computed={computed_hash[:16]}...")
            logger.debug(f"[AUTH] data_check_string: {data_check_string[:200]}...")
            return None, "hash_mismatch"

        # Check auth_date (not older than 24 hours for flexibility)
        auth_date = int(parsed.get('auth_date', ['0'])[0])
        current_time = time.time()
        age_seconds = current_time - auth_date

        if age_seconds > 86400:  # 24 hours
            logger.warning(f"[AUTH] initData too old: {age_seconds/3600:.1f} hours (auth_date={auth_date})")
            return None, "expired"

        if age_seconds < -300:  # 5 minutes in the future (clock skew tolerance)
            logger.warning(f"[AUTH] initData from future: {-age_seconds:.0f}s ahead (auth_date={auth_date})")
            return None, "future_date"

        # Parse user data
        user_json = parsed.get('user', [''])[0]
        if not user_json:
            logger.warning("[AUTH] No user field in initData")
            return None, "missing_user"

        user_data = json.loads(unquote(user_json))

        if 'id' not in user_data:
            logger.warning(f"[AUTH] No id in user data: {list(user_data.keys())}")
            return None, "missing_user_id"

        user = TelegramUser(
            id=user_data['id'],
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name'),
            username=user_data.get('username'),
            language_code=user_data.get('language_code'),
            is_premium=user_data.get('is_premium', False)
        )

        logger.info(f"[AUTH] Success: user_id={user.id} username={user.username}")
        return user, ""

    except json.JSONDecodeError as e:
        logger.warning(f"[AUTH] JSON decode error: {e}")
        return None, "json_error"
    except (KeyError, ValueError) as e:
        logger.warning(f"[AUTH] Validation error: {e}")
        return None, "validation_error"
    except Exception as e:
        logger.error(f"[AUTH] Unexpected error: {e}")
        return None, "unknown_error"


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
        logger.warning("[AUTH] Request without X-Telegram-Init-Data header")
        raise HTTPException(
            status_code=401,
            detail="Missing X-Telegram-Init-Data header"
        )

    # Log first 50 chars of initData for debugging (safe - doesn't expose hash)
    logger.debug(f"[AUTH] Validating initData: {init_data[:50]}...")

    bot_token = settings.BOT_TOKEN.get_secret_value()
    user, error_reason = validate_init_data(init_data, bot_token)

    if not user:
        # Map error reasons to user-friendly messages
        error_messages = {
            "empty_init_data": "Missing authentication data",
            "missing_hash": "Invalid authentication format",
            "hash_mismatch": "Authentication failed - please restart the app",
            "expired": "Session expired - please restart the app",
            "future_date": "Clock synchronization error",
            "missing_user": "User data not found",
            "missing_user_id": "Invalid user data",
            "json_error": "Corrupted authentication data",
            "validation_error": "Authentication validation failed",
            "unknown_error": "Authentication error",
        }
        detail = error_messages.get(error_reason, f"Invalid or expired initData ({error_reason})")
        raise HTTPException(status_code=401, detail=detail)

    return user

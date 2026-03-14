"""Tests for authentication validation."""

import hashlib
import hmac
import json
import time
import pytest
from urllib.parse import quote


def _build_init_data(
    user_data: dict,
    bot_token: str = "123456:ABC-TEST-TOKEN",
    auth_date: int | None = None,
    tamper_hash: bool = False,
) -> str:
    """Build a valid Telegram initData string for testing."""
    if auth_date is None:
        auth_date = int(time.time())

    user_json = json.dumps(user_data, separators=(",", ":"))

    # Build data check string (alphabetical order, excluding hash)
    params = {
        "auth_date": str(auth_date),
        "user": user_json,
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))

    # Compute HMAC
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if tamper_hash:
        computed_hash = "0" * 64

    # Build query string
    return f"auth_date={auth_date}&user={quote(user_json)}&hash={computed_hash}"


class TestInitDataValidation:
    """Test validate_init_data function."""

    @pytest.fixture
    def bot_token(self):
        return "123456:ABC-TEST-TOKEN"

    @pytest.fixture
    def valid_user(self):
        return {
            "id": 12345,
            "first_name": "Test",
            "last_name": "User",
            "username": "testuser",
        }

    def test_valid_init_data(self, bot_token, valid_user):
        from bot.api.auth import validate_init_data

        init_data = _build_init_data(valid_user, bot_token)
        user, error = validate_init_data(init_data, bot_token)
        assert user is not None
        assert user.id == 12345
        assert error == ""

    def test_expired_init_data(self, bot_token, valid_user):
        from bot.api.auth import validate_init_data

        # Set auth_date to 25 hours ago (> 24 hour limit)
        old_auth_date = int(time.time()) - 90000
        init_data = _build_init_data(valid_user, bot_token, auth_date=old_auth_date)
        user, error = validate_init_data(init_data, bot_token)
        assert user is None
        assert error == "expired"

    def test_hash_mismatch(self, bot_token, valid_user):
        from bot.api.auth import validate_init_data

        init_data = _build_init_data(valid_user, bot_token, tamper_hash=True)
        user, error = validate_init_data(init_data, bot_token)
        assert user is None
        assert error == "hash_mismatch"

    def test_future_date(self, bot_token, valid_user):
        from bot.api.auth import validate_init_data

        # Set auth_date to 10 minutes in the future
        future_auth_date = int(time.time()) + 600
        init_data = _build_init_data(valid_user, bot_token, auth_date=future_auth_date)
        user, error = validate_init_data(init_data, bot_token)
        assert user is None
        assert error == "future_date"

    def test_missing_user(self, bot_token):
        from bot.api.auth import validate_init_data

        # Build init_data without user field
        auth_date = int(time.time())
        data_check_string = f"auth_date={auth_date}"
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        init_data = f"auth_date={auth_date}&hash={computed_hash}"

        user, error = validate_init_data(init_data, bot_token)
        assert user is None
        assert error == "missing_user"

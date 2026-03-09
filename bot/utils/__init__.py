"""Утилиты бота."""
from bot.utils.message_helpers import safe_edit_or_send, safe_delete_message, parse_order_id
from bot.utils.formatting import (
    format_price,
    format_price_short,
    round_to_nearest,
    parse_callback,
    parse_callback_int,
    pluralize,
    pluralize_files,
    pluralize_orders,
    pluralize_days,
    pluralize_referrals,
    safe_html,
    truncate,
)

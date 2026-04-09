#!/usr/bin/env python3
import hashlib
import json
import os
import random
import re
import secrets
import sqlite3
import time
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import urllib.request
from zoneinfo import ZoneInfo

import bcrypt

# ===== VK NOTIFICATIONS =====
VK_TOKEN = os.environ.get("SALON_VK_TOKEN", "vk1.a.XJ_Kp52BZwH0AFJRyaQ_FqnVmQ_YBQc__ew8A04bOWJwyppO8ABXUtSwDTtDeMyArDqA3EZ-utkkgPIoxdeRV7vPUiLrW5uZxfyqFGR9iq9SSM8FvN3jjx-w3nBMdr-t2Z1o7iuzyoU7n5a2nXam42w7bpOt5zJlB5BUU8XQ18izqv2tKODHAVx4NyBnRxQco-RcsQq7NP-8yJrHBeR6Kg")
VK_ADMIN_ID = int(os.environ.get("SALON_VK_ADMIN_ID", "76544534"))


NOTIFY_EMAIL = os.environ.get("SALON_NOTIFY_EMAIL", "academsaloon@mail.ru")
NOTIFY_EMAIL_CC = os.environ.get("SALON_NOTIFY_EMAIL_CC", "saymurrr@bk.ru")


def email_notify(subject: str, body: str) -> None:
    """Send email notification (fire-and-forget via mail.ru SMTP)."""
    def _send():
        try:
            msg = MIMEMultipart()
            msg["From"] = NOTIFY_EMAIL
            msg["To"] = NOTIFY_EMAIL
            msg["Cc"] = NOTIFY_EMAIL_CC
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain", "utf-8"))
            # Note: mail.ru requires app password. Using simple sendmail fallback
            import subprocess
            proc = subprocess.Popen(
                ["/usr/sbin/sendmail", "-t", "-oi"],
                stdin=subprocess.PIPE
            )
            proc.communicate(msg.as_bytes())
        except Exception:
            pass
    threading.Thread(target=_send, daemon=True).start()


def vk_notify(message: str) -> None:
    """Send notification to admin via VK community messages (fire-and-forget)."""
    def _send():
        try:
            params = urllib.parse.urlencode({
                "user_id": VK_ADMIN_ID,
                "message": message,
                "random_id": random.randint(1, 2**31),
                "access_token": VK_TOKEN,
                "v": "5.199",
            })
            url = f"https://api.vk.com/method/messages.send?{params}"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=10):
                pass
        except Exception:
            pass  # Fire and forget — don't break order flow
    threading.Thread(target=_send, daemon=True).start()

HOST = os.environ.get("SALON_STATS_HOST", "127.0.0.1")
PORT = int(os.environ.get("SALON_STATS_PORT", "8765"))
BASE_DIR = os.environ.get("SALON_FILES_DIR", "/var/www/salon")
DB_PATH = os.environ.get("SALON_STATS_DB", "/var/lib/bibliosaloon/doc_stats.sqlite3")
CATALOG_PATH = os.environ.get("SALON_CATALOG", os.path.join(BASE_DIR, "catalog.json"))
SITE_ORIGIN = os.environ.get("SALON_SITE_ORIGIN", "https://bibliosaloon.ru")
MOSCOW_TZ = ZoneInfo("Europe/Moscow")
UPLOAD_DIR = os.path.join(BASE_DIR, "files")
MAX_BATCH = 400
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
EVENT_WINDOWS = {
    "view": 6 * 60 * 60,
    "download": 30,
}

# ===== ADMIN AUTH =====
# Password hash is generated once: python3 -c "import bcrypt; print(bcrypt.hashpw(b'YOUR_PASSWORD', bcrypt.gensalt()).decode())"
ADMIN_HASH = os.environ.get(
    "SALON_ADMIN_HASH",
    "$2b$12$Yil6rZIDxqXoPFqBsZmW/elKhVoQpCiE8UxYQQFd7ZPrnBCPIb2Iy"
)
SESSION_TTL = 24 * 60 * 60  # 24 hours
LOGIN_RATE_WINDOW = 60  # 1 minute
LOGIN_RATE_MAX = 5
LOGIN_BLOCK_TIME = 15 * 60  # 15 min block after too many attempts

_sessions: dict[str, float] = {}  # token -> expiry timestamp
_sessions_lock = threading.Lock()
_login_attempts: dict[str, list[float]] = {}  # ip -> [timestamps]
_login_blocks: dict[str, float] = {}  # ip -> block_until


def admin_check_rate_limit(ip: str) -> bool:
    """Returns True if request is allowed, False if blocked."""
    now = time.time()
    if ip in _login_blocks and _login_blocks[ip] > now:
        return False
    attempts = _login_attempts.get(ip, [])
    attempts = [t for t in attempts if now - t < LOGIN_RATE_WINDOW]
    _login_attempts[ip] = attempts
    if len(attempts) >= LOGIN_RATE_MAX:
        _login_blocks[ip] = now + LOGIN_BLOCK_TIME
        return False
    return True


def admin_record_attempt(ip: str) -> None:
    _login_attempts.setdefault(ip, []).append(time.time())


def admin_login(password: str) -> str | None:
    """Verify password, return session token or None."""
    try:
        if bcrypt.checkpw(password.encode("utf-8"), ADMIN_HASH.encode("utf-8")):
            token = secrets.token_hex(32)
            with _sessions_lock:
                _sessions[token] = time.time() + SESSION_TTL
            return token
    except Exception:
        pass
    return None


def admin_verify(token: str | None) -> bool:
    """Check if session token is valid."""
    if not token:
        return False
    with _sessions_lock:
        expiry = _sessions.get(token)
        if expiry and expiry > time.time():
            return True
        _sessions.pop(token, None)
    return False


def admin_logout(token: str) -> None:
    with _sessions_lock:
        _sessions.pop(token, None)


def admin_cleanup_sessions() -> None:
    """Remove expired sessions (called occasionally)."""
    now = time.time()
    with _sessions_lock:
        expired = [t for t, exp in _sessions.items() if exp <= now]
        for t in expired:
            del _sessions[t]


def get_bearer_token(handler: BaseHTTPRequestHandler) -> str | None:
    auth = handler.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def get_client_ip(handler: BaseHTTPRequestHandler) -> str:
    forwarded = handler.headers.get("X-Forwarded-For", "")
    return forwarded.split(",")[0].strip() or handler.client_address[0] or ""


# ===== CATALOG MANAGEMENT =====
_catalog_lock = threading.Lock()


def load_catalog() -> list[dict]:
    """Load catalog from JSON file."""
    if not os.path.exists(CATALOG_PATH):
        return []
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_catalog(catalog: list[dict]) -> None:
    """Save catalog to JSON file atomically."""
    tmp_path = CATALOG_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=None, separators=(",", ":"))
    os.replace(tmp_path, CATALOG_PATH)


def find_doc_index(catalog: list[dict], file_path: str) -> int:
    """Find document index by file path."""
    for i, doc in enumerate(catalog):
        if doc.get("file") == file_path:
            return i
    return -1


def ensure_parent_dir(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    ensure_parent_dir(DB_PATH)
    with get_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS doc_counters (
                file TEXT PRIMARY KEY,
                views INTEGER NOT NULL DEFAULT 0,
                downloads INTEGER NOT NULL DEFAULT 0,
                likes INTEGER NOT NULL DEFAULT 0,
                dislikes INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
            );

            CREATE TABLE IF NOT EXISTS event_buckets (
                file TEXT NOT NULL,
                client_id TEXT NOT NULL,
                action TEXT NOT NULL,
                bucket INTEGER NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                PRIMARY KEY (file, client_id, action, bucket)
            );

            CREATE TABLE IF NOT EXISTS reactions (
                file TEXT NOT NULL,
                client_id TEXT NOT NULL,
                reaction INTEGER NOT NULL CHECK (reaction IN (-1, 1)),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
                PRIMARY KEY (file, client_id)
            );

            CREATE INDEX IF NOT EXISTS idx_event_buckets_created_at
                ON event_buckets(created_at);

            CREATE INDEX IF NOT EXISTS idx_reactions_file
                ON reactions(file);
            """
        )
        ensure_orders_table(db)


ORDER_SOURCE_LABELS = {
    "library_app": "Приложение БиблиоСалон",
    "library_app_sample": "Приложение БиблиоСалон · по примеру",
    "site_modal": "Сайт · форма заявки",
    "site_document": "Сайт · карточка документа",
    "site_quick_search": "Сайт · пустой поиск каталога",
    "site_calculator": "Сайт · калькулятор стоимости",
}

ORDER_EXTRA_COLUMNS = {
    "source": "TEXT",
    "source_label": "TEXT",
    "source_path": "TEXT",
    "entry_url": "TEXT",
    "referrer": "TEXT",
    "user_agent": "TEXT",
    "contact_channel": "TEXT",
    "estimated_price": "INTEGER",
    "pages": "INTEGER",
    "originality": "TEXT",
    "sample_title": "TEXT",
    "sample_type": "TEXT",
    "sample_subject": "TEXT",
    "sample_category": "TEXT",
    "meta_json": "TEXT",
    "manager_note": "TEXT",
    "manager_updated_at": "INTEGER",
}

ADMIN_ORDER_ALLOWED_STATUSES = {
    "new",
    "priority",
    "in_work",
    "waiting_client",
    "done",
    "archived",
}


def ensure_orders_table(db: sqlite3.Connection) -> None:
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_type TEXT,
            topic TEXT,
            subject TEXT,
            deadline TEXT,
            contact TEXT,
            comment TEXT,
            ip TEXT,
            created_at INTEGER DEFAULT (strftime('%s','now')),
            status TEXT DEFAULT 'new',
            source TEXT,
            source_label TEXT,
            source_path TEXT,
            entry_url TEXT,
            referrer TEXT,
            user_agent TEXT,
            contact_channel TEXT,
            estimated_price INTEGER,
            pages INTEGER,
            originality TEXT,
            sample_title TEXT,
            sample_type TEXT,
            sample_subject TEXT,
            sample_category TEXT,
            meta_json TEXT
        )
        """
    )
    db.execute("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)")

    existing_columns = {
        row["name"]
        for row in db.execute("PRAGMA table_info(orders)").fetchall()
    }
    for column_name, column_type in ORDER_EXTRA_COLUMNS.items():
        if column_name not in existing_columns:
            db.execute(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}")


def clean_text(value: object, limit: int) -> str:
    if value is None:
        return ""
    text = str(value).replace("\x00", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def clean_url(value: object, limit: int = 500) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    if text.startswith("/"):
        text = SITE_ORIGIN.rstrip("/") + text
    return text[:limit]


def normalize_int(value: object, *, min_value: int | None = None, max_value: int | None = None) -> int | None:
    if value in (None, ""):
        return None
    try:
        normalized = str(value).replace("₽", "").replace(" ", "").replace(",", ".")
        result = int(float(normalized))
    except (TypeError, ValueError):
        return None
    if min_value is not None:
        result = max(min_value, result)
    if max_value is not None:
        result = min(max_value, result)
    return result


def format_money(value: int | None) -> str:
    if value is None:
        return ""
    return f"{value:,}".replace(",", " ") + " ₽"


def format_count_ru(value: int, one: str, few: str, many: str) -> str:
    n = abs(int(value))
    mod10 = n % 10
    mod100 = n % 100
    if mod10 == 1 and mod100 != 11:
        word = one
    elif 2 <= mod10 <= 4 and not 12 <= mod100 <= 14:
        word = few
    else:
        word = many
    return f"{value} {word}"


def format_admin_timestamp(value: int | None) -> str:
    if not value:
        return ""
    return datetime.fromtimestamp(value, MOSCOW_TZ).strftime("%d.%m.%Y %H:%M")


def mask_ip(value: str) -> str:
    ip = clean_text(value, 100)
    if not ip:
        return ""
    if ":" in ip:
        parts = ip.split(":")
        if len(parts) > 2:
            return ":".join(parts[:3]) + ":*"
        return ip
    parts = ip.split(".")
    if len(parts) == 4:
        return ".".join(parts[:3] + ["*"])
    return ip


def summarize_user_agent(user_agent: str) -> str:
    ua = clean_text(user_agent, 280).lower()
    if not ua:
        return ""

    if "iphone" in ua:
        device = "iPhone"
    elif "ipad" in ua:
        device = "iPad"
    elif "android" in ua:
        device = "Android"
    elif "macintosh" in ua or "mac os" in ua:
        device = "Mac"
    elif "windows" in ua:
        device = "Windows"
    else:
        device = "Устройство"

    if "edg" in ua:
        browser = "Edge"
    elif "opr" in ua or "opera" in ua:
        browser = "Opera"
    elif "chrome" in ua and "chromium" not in ua and "edg" not in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua:
        browser = "Safari"
    else:
        browser = ""

    return f"{device} · {browser}".strip(" ·")


def detect_contact_channel(contact: str) -> str:
    normalized = clean_text(contact, 240).lower()
    if not normalized:
        return ""

    channels: list[str] = []
    digits = re.sub(r"\D", "", normalized)
    if any(marker in normalized for marker in ("vk:", "vk.com", "вк", "vkontakte")):
        channels.append("ВКонтакте")
    if any(marker in normalized for marker in ("tg:", "telegram", "t.me")) or ("@" in normalized and "email" not in normalized and "почт" not in normalized):
        channels.append("Telegram")
    if any(marker in normalized for marker in ("тел:", "телефон", "+7", "whatsapp", "wa:", "звон")) or len(digits) >= 10:
        channels.append("Телефон")
    if any(marker in normalized for marker in ("email", "почт")) or re.search(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
        channels.append("Email")

    unique_channels: list[str] = []
    for label in channels:
        if label not in unique_channels:
            unique_channels.append(label)

    if not unique_channels:
        return "Не определён"
    if len(unique_channels) == 1:
        return unique_channels[0]
    return " + ".join(unique_channels)


def build_order_source_label(source: str, source_label: str) -> str:
    if source_label:
        return source_label
    return ORDER_SOURCE_LABELS.get(source, "Сайт БиблиоСалон")


def build_source_path(source_path: str, entry_url: str) -> str:
    if source_path:
        return source_path
    if not entry_url:
        return ""
    parsed = urlparse(entry_url)
    path = parsed.path or "/"
    if parsed.query:
        path += "?" + parsed.query
    return path[:240]


def describe_repeat_orders(contact_repeat_count: int, ip_repeat_count: int) -> str:
    parts = []
    if contact_repeat_count > 0:
        parts.append(f"по этому контакту уже {format_count_ru(contact_repeat_count, 'заявка', 'заявки', 'заявок')}")
    if ip_repeat_count > 0:
        parts.append(f"с этого IP уже {format_count_ru(ip_repeat_count, 'заявка', 'заявки', 'заявок')}")
    if not parts:
        return "Похоже, это первая заявка."
    return "; ".join(parts) + "."


def build_order_notification(order: dict, contact_repeat_count: int, ip_repeat_count: int) -> str:
    header_parts = [f"📥 Заявка #{order['id']}"]
    if order.get("deadline"):
        deadline_lower = order["deadline"].lower()
        if any(marker in deadline_lower for marker in ("24", "сегодня", "завтра", "срочно")):
            header_parts.append("срочно")

    lines = [" · ".join(header_parts)]
    created_label = format_admin_timestamp(order.get("created_at"))
    if created_label:
        lines.append(f"Когда: {created_label} (МСК)")
    lines.append("")
    lines.append("👤 Кто")
    lines.append(f"• Контакт: {order.get('contact') or 'не указан'}")
    if order.get("contact_channel"):
        lines.append(f"• Канал: {order['contact_channel']}")
    lines.append(f"• История: {describe_repeat_orders(contact_repeat_count, ip_repeat_count)}")
    masked_ip = mask_ip(order.get("ip", ""))
    if masked_ip:
        lines.append(f"• IP: {masked_ip}")
    device_label = summarize_user_agent(order.get("user_agent", ""))
    if device_label:
        lines.append(f"• Устройство: {device_label}")

    lines.append("")
    lines.append("📝 Что нужно")
    if order.get("topic"):
        lines.append(f"• Тема: {order['topic']}")
    if order.get("work_type"):
        lines.append(f"• Тип работы: {order['work_type']}")
    if order.get("subject"):
        lines.append(f"• Предмет: {order['subject']}")
    if order.get("deadline"):
        lines.append(f"• Срок: {order['deadline']}")
    if order.get("pages"):
        lines.append(f"• Объём: {order['pages']} стр.")
    if order.get("originality"):
        lines.append(f"• Уникальность: {order['originality']}")
    if order.get("estimated_price") is not None:
        lines.append(f"• Ориентир: {format_money(order['estimated_price'])}")

    sample_bits = [
        order.get("sample_title", ""),
        order.get("sample_type", ""),
        order.get("sample_subject", ""),
        order.get("sample_category", ""),
    ]
    sample_bits = [bit for bit in sample_bits if bit]
    if sample_bits:
        lines.append(f"• Основа: {' · '.join(sample_bits)}")

    lines.append("")
    lines.append("📍 Откуда пришёл")
    lines.append(f"• Источник: {order.get('source_label') or 'Сайт БиблиоСалон'}")
    if order.get("source_path"):
        lines.append(f"• Экран: {order['source_path']}")
    if order.get("entry_url"):
        lines.append(f"• Ссылка: {order['entry_url']}")
    if order.get("referrer"):
        lines.append(f"• Переход: {order['referrer']}")

    if order.get("comment"):
        lines.append("")
        lines.append("💬 Комментарий")
        lines.append(order["comment"])

    return "\n".join(lines)


def cleanup_old_rows(db: sqlite3.Connection) -> None:
    if random.random() > 0.04:
        return
    cutoff = int(time.time()) - (14 * 24 * 60 * 60)
    db.execute("DELETE FROM event_buckets WHERE created_at < ?", (cutoff,))


def sanitize_file(file_value: str | None) -> str | None:
    if not isinstance(file_value, str):
        return None
    candidate = file_value.strip().replace("\\", "/")
    if not candidate.startswith("files/"):
        return None
    if ".." in candidate.split("/"):
        return None
    full_path = os.path.normpath(os.path.join(BASE_DIR, candidate))
    files_root = os.path.normpath(os.path.join(BASE_DIR, "files"))
    if not full_path.startswith(files_root + os.sep):
        return None
    if not os.path.exists(full_path):
        return None
    return candidate


def normalize_client_id(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if 12 <= len(cleaned) <= 120 and all(ch.isalnum() or ch in "-_." for ch in cleaned):
        return f"cid:{cleaned}"
    return None


def fallback_client_key(handler: BaseHTTPRequestHandler) -> str:
    forwarded = handler.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() or handler.client_address[0] or ""
    ua = handler.headers.get("User-Agent", "")[:200]
    digest = hashlib.sha256(f"{ip}|{ua}".encode("utf-8")).hexdigest()
    return f"anon:{digest[:40]}"


def resolve_client_key(handler: BaseHTTPRequestHandler, payload: dict | None = None, query: dict | None = None) -> str:
    payload = payload or {}
    query = query or {}
    client_id = normalize_client_id(payload.get("clientId"))
    if client_id:
        return client_id
    query_cid = query.get("cid", [None])[0]
    client_id = normalize_client_id(query_cid)
    if client_id:
        return client_id
    return fallback_client_key(handler)


def ensure_counter_row(db: sqlite3.Connection, file_value: str) -> None:
    db.execute(
        """
        INSERT INTO doc_counters (file, views, downloads, likes, dislikes, updated_at)
        VALUES (?, 0, 0, 0, 0, strftime('%s','now'))
        ON CONFLICT(file) DO NOTHING
        """,
        (file_value,),
    )


def fetch_stats_map(db: sqlite3.Connection, files: list[str], client_id: str) -> dict[str, dict]:
    stats = {
        file_value: {
            "views": 0,
            "downloads": 0,
            "likes": 0,
            "dislikes": 0,
            "reaction": 0,
        }
        for file_value in files
    }
    if not files:
        return stats
    placeholders = ",".join("?" for _ in files)
    counter_rows = db.execute(
        f"""
        SELECT file, views, downloads, likes, dislikes
        FROM doc_counters
        WHERE file IN ({placeholders})
        """,
        files,
    ).fetchall()
    for row in counter_rows:
        stats[row["file"]].update(
            {
                "views": int(row["views"] or 0),
                "downloads": int(row["downloads"] or 0),
                "likes": int(row["likes"] or 0),
                "dislikes": int(row["dislikes"] or 0),
            }
        )
    reaction_rows = db.execute(
        f"""
        SELECT file, reaction
        FROM reactions
        WHERE client_id = ? AND file IN ({placeholders})
        """,
        [client_id, *files],
    ).fetchall()
    for row in reaction_rows:
        stats[row["file"]]["reaction"] = int(row["reaction"] or 0)
    return stats


def fetch_single_stat(db: sqlite3.Connection, file_value: str, client_id: str) -> dict:
    return fetch_stats_map(db, [file_value], client_id)[file_value]


def record_event(db: sqlite3.Connection, file_value: str, action: str, client_id: str) -> tuple[dict, bool]:
    if action not in EVENT_WINDOWS:
        raise ValueError("Unsupported action")
    ensure_counter_row(db, file_value)
    bucket = int(time.time() // EVENT_WINDOWS[action])
    column = "views" if action == "view" else "downloads"
    db.execute("BEGIN IMMEDIATE")
    inserted = db.execute(
        """
        INSERT OR IGNORE INTO event_buckets (file, client_id, action, bucket, created_at)
        VALUES (?, ?, ?, ?, strftime('%s','now'))
        """,
        (file_value, client_id, action, bucket),
    ).rowcount > 0
    if inserted:
        db.execute(
            f"""
            UPDATE doc_counters
            SET {column} = {column} + 1,
                updated_at = strftime('%s','now')
            WHERE file = ?
            """,
            (file_value,),
        )
    cleanup_old_rows(db)
    stat = fetch_single_stat(db, file_value, client_id)
    db.commit()
    return stat, inserted


def set_reaction(db: sqlite3.Connection, file_value: str, reaction: int, client_id: str) -> dict:
    if reaction not in (-1, 0, 1):
        raise ValueError("Reaction must be -1, 0 or 1")
    ensure_counter_row(db, file_value)
    db.execute("BEGIN IMMEDIATE")
    current_row = db.execute(
        "SELECT reaction FROM reactions WHERE file = ? AND client_id = ?",
        (file_value, client_id),
    ).fetchone()
    current = int(current_row["reaction"]) if current_row else 0
    next_reaction = 0 if reaction == current else reaction
    if current == next_reaction:
        stat = fetch_single_stat(db, file_value, client_id)
        db.commit()
        return stat
    if current_row and current:
        prev_column = "likes" if current == 1 else "dislikes"
        db.execute(
            f"""
            UPDATE doc_counters
            SET {prev_column} = CASE WHEN {prev_column} > 0 THEN {prev_column} - 1 ELSE 0 END,
                updated_at = strftime('%s','now')
            WHERE file = ?
            """,
            (file_value,),
        )
    if next_reaction:
        next_column = "likes" if next_reaction == 1 else "dislikes"
        db.execute(
            """
            INSERT INTO reactions (file, client_id, reaction, updated_at)
            VALUES (?, ?, ?, strftime('%s','now'))
            ON CONFLICT(file, client_id) DO UPDATE
                SET reaction = excluded.reaction,
                    updated_at = excluded.updated_at
            """,
            (file_value, client_id, next_reaction),
        )
        db.execute(
            f"""
            UPDATE doc_counters
            SET {next_column} = {next_column} + 1,
                updated_at = strftime('%s','now')
            WHERE file = ?
            """,
            (file_value,),
        )
    else:
        db.execute(
            "DELETE FROM reactions WHERE file = ? AND client_id = ?",
            (file_value, client_id),
        )
    stat = fetch_single_stat(db, file_value, client_id)
    db.commit()
    return stat


class StatsHandler(BaseHTTPRequestHandler):
    server_version = "BibliosaloonStats/1.0"

    def log_message(self, fmt: str, *args) -> None:
        print(
            "%s - - [%s] %s"
            % (self.address_string(), self.log_date_time_string(), fmt % args)
        )

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def _require_admin(self) -> bool:
        """Check admin auth. Returns True if authorized, sends 401 and returns False otherwise."""
        token = get_bearer_token(self)
        if admin_verify(token):
            return True
        self._send_json(401, {"ok": False, "error": "Unauthorized"})
        return False

    def _handle_get(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/doc-stats/health":
            self._send_json(200, {"ok": True, "service": "doc-stats"})
            return
        if parsed.path == "/api/doc-stats/download":
            query = parse_qs(parsed.query, keep_blank_values=False)
            file_value = sanitize_file(query.get("file", [None])[0])
            if not file_value:
                self._send_json(400, {"ok": False, "error": "Invalid file"})
                return
            if self.command != "HEAD":
                client_id = resolve_client_key(self, query=query)
                with get_db() as db:
                    try:
                        record_event(db, file_value, "download", client_id)
                    except Exception as exc:
                        self._send_json(500, {"ok": False, "error": str(exc)})
                        return
            self.send_response(302)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Location", "/" + quote(file_value, safe="/"))
            self.end_headers()
            return

        # ===== ADMIN GET ENDPOINTS =====
        if parsed.path == "/api/admin/verify":
            if self._require_admin():
                self._send_json(200, {"ok": True})
            return

        if parsed.path == "/api/admin/docs":
            if not self._require_admin():
                return
            with _catalog_lock:
                catalog = load_catalog()
            self._send_json(200, {"ok": True, "docs": catalog, "total": len(catalog)})
            return

        if parsed.path == "/api/admin/orders":
            if not self._require_admin():
                return
            with get_db() as db:
                ensure_orders_table(db)
                rows = db.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100").fetchall()
            self._send_json(200, {"ok": True, "orders": [dict(r) for r in rows]})
            return

        if parsed.path == "/api/admin/analytics":
            if not self._require_admin():
                return
            with get_db() as db:
                total_views = db.execute("SELECT COALESCE(SUM(views),0) as s FROM doc_counters").fetchone()["s"]
                total_downloads = db.execute("SELECT COALESCE(SUM(downloads),0) as s FROM doc_counters").fetchone()["s"]
                total_likes = db.execute("SELECT COALESCE(SUM(likes),0) as s FROM doc_counters").fetchone()["s"]
                total_dislikes = db.execute("SELECT COALESCE(SUM(dislikes),0) as s FROM doc_counters").fetchone()["s"]
                top_viewed = db.execute(
                    "SELECT file, views, downloads, likes, dislikes FROM doc_counters ORDER BY views DESC LIMIT 20"
                ).fetchall()
                top_downloaded = db.execute(
                    "SELECT file, views, downloads, likes, dislikes FROM doc_counters ORDER BY downloads DESC LIMIT 20"
                ).fetchall()
                recent = db.execute(
                    "SELECT file, action, created_at FROM event_buckets ORDER BY created_at DESC LIMIT 50"
                ).fetchall()
            with _catalog_lock:
                catalog = load_catalog()
            self._send_json(200, {
                "ok": True,
                "totalDocs": len(catalog),
                "totalViews": total_views,
                "totalDownloads": total_downloads,
                "totalLikes": total_likes,
                "totalDislikes": total_dislikes,
                "topViewed": [dict(r) for r in top_viewed],
                "topDownloaded": [dict(r) for r in top_downloaded],
                "recent": [{"file": r["file"], "action": r["action"], "at": r["created_at"]} for r in recent],
            })
            return

        self._send_json(404, {"ok": False, "error": "Not found"})

    def do_GET(self) -> None:
        self._handle_get()

    def do_HEAD(self) -> None:
        self._handle_get()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        # Upload must be handled BEFORE _read_json() since it's multipart
        if parsed.path == "/api/admin/upload":
            if not self._require_admin():
                return
            self._handle_upload()
            return
        try:
            payload = self._read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"ok": False, "error": "Invalid JSON"})
            return
        query = parse_qs(parsed.query, keep_blank_values=False)
        if parsed.path == "/api/doc-stats/batch":
            raw_files = payload.get("files")
            if not isinstance(raw_files, list):
                self._send_json(400, {"ok": False, "error": "files must be an array"})
                return
            files = []
            seen = set()
            for raw_file in raw_files[:MAX_BATCH]:
                file_value = sanitize_file(raw_file)
                if file_value and file_value not in seen:
                    files.append(file_value)
                    seen.add(file_value)
            client_id = resolve_client_key(self, payload=payload, query=query)
            with get_db() as db:
                stats = fetch_stats_map(db, files, client_id)
            self._send_json(200, {"ok": True, "stats": stats})
            return
        if parsed.path == "/api/doc-stats/event":
            file_value = sanitize_file(payload.get("file"))
            action = payload.get("action")
            if not file_value or action not in EVENT_WINDOWS:
                self._send_json(400, {"ok": False, "error": "Invalid file or action"})
                return
            client_id = resolve_client_key(self, payload=payload, query=query)
            with get_db() as db:
                try:
                    stat, counted = record_event(db, file_value, action, client_id)
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                    return
            self._send_json(200, {"ok": True, "counted": counted, "stat": stat})
            return
        if parsed.path == "/api/doc-stats/reaction":
            file_value = sanitize_file(payload.get("file"))
            try:
                reaction = int(payload.get("reaction", 0))
            except (TypeError, ValueError):
                reaction = 9
            if not file_value or reaction not in (-1, 0, 1):
                self._send_json(400, {"ok": False, "error": "Invalid file or reaction"})
                return
            client_id = resolve_client_key(self, payload=payload, query=query)
            with get_db() as db:
                try:
                    stat = set_reaction(db, file_value, reaction, client_id)
                except Exception as exc:
                    self._send_json(500, {"ok": False, "error": str(exc)})
                    return
            self._send_json(200, {"ok": True, "stat": stat})
            return
        # ===== ADMIN POST ENDPOINTS =====
        if parsed.path == "/api/admin/login":
            ip = get_client_ip(self)
            if not admin_check_rate_limit(ip):
                self._send_json(429, {"ok": False, "error": "Too many attempts. Try again later."})
                return
            password = payload.get("password", "")
            if not password:
                self._send_json(400, {"ok": False, "error": "Password required"})
                return
            admin_record_attempt(ip)
            token = admin_login(password)
            if token:
                self._send_json(200, {"ok": True, "token": token})
            else:
                self._send_json(403, {"ok": False, "error": "Invalid password"})
            return

        if parsed.path == "/api/admin/logout":
            token = get_bearer_token(self)
            if token:
                admin_logout(token)
            self._send_json(200, {"ok": True})
            return

        if parsed.path == "/api/admin/rebuild":
            if not self._require_admin():
                return
            admin_cleanup_sessions()
            self._send_json(200, {"ok": True, "message": "Catalog is managed via catalog.json"})
            return

        # ===== PUBLIC ORDER FORM =====
        if parsed.path == "/api/order":
            ip = get_client_ip(self)
            # Rate limit: 3 orders per hour per IP
            now = time.time()
            order_key = f"order:{ip}"
            attempts = _login_attempts.get(order_key, [])
            attempts = [t for t in attempts if now - t < 3600]
            _login_attempts[order_key] = attempts
            if len(attempts) >= 3:
                self._send_json(429, {"ok": False, "error": "Слишком много заявок. Попробуйте позже."})
                return
            _login_attempts[order_key].append(now)
            # Validate
            work_type = clean_text(payload.get("workType"), 100)
            topic = clean_text(payload.get("topic"), 500)
            subject = clean_text(payload.get("subject"), 100)
            deadline = clean_text(payload.get("deadline"), 100)
            contact = clean_text(payload.get("contact"), 200)
            comment = clean_text(payload.get("comment"), 700)
            source = clean_text(payload.get("source"), 80)
            source_label = clean_text(payload.get("sourceLabel"), 160)
            source_path = clean_text(payload.get("sourcePath"), 240)
            entry_url = clean_url(payload.get("entryUrl"))
            referrer = clean_url(payload.get("referrer") or self.headers.get("Referer"))
            user_agent = clean_text(self.headers.get("User-Agent"), 280)
            contact_channel = clean_text(payload.get("contactChannel"), 80) or detect_contact_channel(contact)
            estimated_price = normalize_int(payload.get("estimatedPrice"), min_value=0, max_value=500000)
            pages = normalize_int(payload.get("pages"), min_value=1, max_value=300)
            originality = clean_text(payload.get("originality"), 100)
            sample_title = clean_text(payload.get("sampleTitle"), 240)
            sample_type = clean_text(payload.get("sampleType"), 120)
            sample_subject = clean_text(payload.get("sampleSubject"), 120)
            sample_category = clean_text(payload.get("sampleCategory"), 120)
            page_title = clean_text(payload.get("pageTitle"), 160)
            search_query = clean_text(payload.get("searchQuery"), 160)
            source_label = build_order_source_label(source, source_label)
            source_path = build_source_path(source_path, entry_url)
            if not contact:
                self._send_json(400, {"ok": False, "error": "Укажите контакт для связи"})
                return
            meta_payload = {
                key: value
                for key, value in {
                    "pageTitle": page_title,
                    "searchQuery": search_query,
                }.items()
                if value
            }
            meta_json = json.dumps(meta_payload, ensure_ascii=False, separators=(",", ":")) if meta_payload else ""
            # Save order to SQLite
            with get_db() as db:
                ensure_orders_table(db)
                created_at = int(now)
                cursor = db.execute(
                    """
                    INSERT INTO orders (
                        work_type, topic, subject, deadline, contact, comment, ip, created_at,
                        source, source_label, source_path, entry_url, referrer, user_agent,
                        contact_channel, estimated_price, pages, originality,
                        sample_title, sample_type, sample_subject, sample_category, meta_json
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        work_type,
                        topic,
                        subject,
                        deadline,
                        contact,
                        comment,
                        ip,
                        created_at,
                        source,
                        source_label,
                        source_path,
                        entry_url,
                        referrer,
                        user_agent,
                        contact_channel,
                        estimated_price,
                        pages,
                        originality,
                        sample_title,
                        sample_type,
                        sample_subject,
                        sample_category,
                        meta_json,
                    )
                )
                order_id = int(cursor.lastrowid or 0)
                contact_repeat_count = 0
                if contact:
                    contact_repeat_count = int(
                        db.execute(
                            "SELECT COUNT(*) AS c FROM orders WHERE contact = ? AND id <> ?",
                            (contact, order_id),
                        ).fetchone()["c"] or 0
                    )
                ip_repeat_count = int(
                    db.execute(
                        "SELECT COUNT(*) AS c FROM orders WHERE ip = ? AND id <> ?",
                        (ip, order_id),
                    ).fetchone()["c"] or 0
                )
            order_info = {
                "id": order_id,
                "created_at": created_at,
                "work_type": work_type,
                "topic": topic,
                "subject": subject,
                "deadline": deadline,
                "contact": contact,
                "comment": comment,
                "ip": ip,
                "source_label": source_label,
                "source_path": source_path,
                "entry_url": entry_url,
                "referrer": referrer,
                "user_agent": user_agent,
                "contact_channel": contact_channel,
                "estimated_price": estimated_price,
                "pages": pages,
                "originality": originality,
                "sample_title": sample_title,
                "sample_type": sample_type,
                "sample_subject": sample_subject,
                "sample_category": sample_category,
            }
            # Send VK notification to admin
            vk_notify(build_order_notification(order_info, contact_repeat_count, ip_repeat_count))
            self._send_json(200, {"ok": True, "message": "Заявка отправлена!", "orderId": order_id})
            return

        self._send_json(404, {"ok": False, "error": "Not found"})

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/admin/docs":
            if not self._require_admin():
                return
            try:
                payload = self._read_json()
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "Invalid JSON"})
                return
            file_path = payload.get("file")
            updates = payload.get("updates", {})
            if not file_path or not updates:
                self._send_json(400, {"ok": False, "error": "file and updates required"})
                return
            allowed_fields = {"title", "description", "category", "subject", "course", "docType",
                              "catalogTitle", "catalogDescription", "tags"}
            with _catalog_lock:
                catalog = load_catalog()
                idx = find_doc_index(catalog, file_path)
                if idx < 0:
                    self._send_json(404, {"ok": False, "error": "Document not found"})
                    return
                for key, val in updates.items():
                    if key in allowed_fields:
                        catalog[idx][key] = val
                save_catalog(catalog)
            self._send_json(200, {"ok": True, "doc": catalog[idx]})
            return
        if parsed.path == "/api/admin/orders":
            if not self._require_admin():
                return
            try:
                payload = self._read_json()
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "Invalid JSON"})
                return
            order_id = normalize_int(payload.get("id"), min_value=1)
            updates = payload.get("updates", {})
            if not order_id or not isinstance(updates, dict) or not updates:
                self._send_json(400, {"ok": False, "error": "id and updates required"})
                return

            fields = []
            values: list[object] = []

            if "status" in updates:
                status = clean_text(updates.get("status"), 40)
                if status not in ADMIN_ORDER_ALLOWED_STATUSES:
                    self._send_json(400, {"ok": False, "error": "Invalid status"})
                    return
                fields.append("status = ?")
                values.append(status)

            if "manager_note" in updates:
                fields.append("manager_note = ?")
                values.append(clean_text(updates.get("manager_note"), 4000))

            if not fields:
                self._send_json(400, {"ok": False, "error": "No supported updates"})
                return

            fields.append("manager_updated_at = ?")
            values.append(int(time.time()))
            values.append(order_id)

            with get_db() as db:
                ensure_orders_table(db)
                row = db.execute("SELECT id FROM orders WHERE id = ?", (order_id,)).fetchone()
                if not row:
                    self._send_json(404, {"ok": False, "error": "Order not found"})
                    return
                db.execute(
                    f"UPDATE orders SET {', '.join(fields)} WHERE id = ?",
                    values,
                )
                updated = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
            self._send_json(200, {"ok": True, "order": dict(updated) if updated else None})
            return
        self._send_json(404, {"ok": False, "error": "Not found"})

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/admin/docs":
            if not self._require_admin():
                return
            try:
                payload = self._read_json()
            except json.JSONDecodeError:
                self._send_json(400, {"ok": False, "error": "Invalid JSON"})
                return
            file_path = payload.get("file")
            if not file_path:
                self._send_json(400, {"ok": False, "error": "file required"})
                return
            with _catalog_lock:
                catalog = load_catalog()
                idx = find_doc_index(catalog, file_path)
                if idx < 0:
                    self._send_json(404, {"ok": False, "error": "Document not found"})
                    return
                removed = catalog.pop(idx)
                save_catalog(catalog)
            # Optionally remove file from disk
            disk_path = os.path.normpath(os.path.join(BASE_DIR, file_path))
            files_root = os.path.normpath(UPLOAD_DIR)
            if disk_path.startswith(files_root + os.sep) and os.path.exists(disk_path):
                try:
                    os.remove(disk_path)
                except OSError:
                    pass
            self._send_json(200, {"ok": True, "removed": removed.get("title", file_path)})
            return
        self._send_json(404, {"ok": False, "error": "Not found"})

    def _handle_upload(self) -> None:
        """Handle multipart file upload."""
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self._send_json(400, {"ok": False, "error": "Multipart form data required"})
            return
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length > MAX_UPLOAD_SIZE:
            self._send_json(413, {"ok": False, "error": "File too large (max 50MB)"})
            return
        # Simple multipart parser for single file
        boundary = content_type.split("boundary=")[1].strip() if "boundary=" in content_type else None
        if not boundary:
            self._send_json(400, {"ok": False, "error": "No boundary in multipart"})
            return
        body = self.rfile.read(content_length)
        parts = body.split(f"--{boundary}".encode())
        file_data = None
        file_name = None
        metadata = {}
        for part in parts:
            if b"Content-Disposition" not in part:
                continue
            header_end = part.find(b"\r\n\r\n")
            if header_end < 0:
                continue
            header = part[:header_end].decode("utf-8", errors="replace")
            data = part[header_end + 4:]
            if data.endswith(b"\r\n"):
                data = data[:-2]
            if 'name="file"' in header or 'name="document"' in header:
                # Extract filename
                if 'filename="' in header:
                    fn_start = header.index('filename="') + 10
                    fn_end = header.index('"', fn_start)
                    file_name = header[fn_start:fn_end]
                file_data = data
            elif 'name="metadata"' in header:
                try:
                    metadata = json.loads(data.decode("utf-8"))
                except json.JSONDecodeError:
                    pass
            elif 'name="' in header:
                # Simple text field
                field_start = header.index('name="') + 6
                field_end = header.index('"', field_start)
                field_name = header[field_start:field_end]
                metadata[field_name] = data.decode("utf-8", errors="replace")
        if not file_data or not file_name:
            self._send_json(400, {"ok": False, "error": "No file uploaded"})
            return
        # Sanitize filename
        safe_name = file_name.replace("/", "_").replace("\\", "_").replace("..", "_")
        if not safe_name:
            self._send_json(400, {"ok": False, "error": "Invalid filename"})
            return
        dest_path = os.path.join(UPLOAD_DIR, safe_name)
        # Avoid overwrite
        base, ext = os.path.splitext(safe_name)
        counter = 1
        while os.path.exists(dest_path):
            dest_path = os.path.join(UPLOAD_DIR, f"{base}_{counter}{ext}")
            safe_name = f"{base}_{counter}{ext}"
            counter += 1
        # Write file
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(file_data)
        # Build catalog entry
        file_size = len(file_data)
        if file_size < 1024:
            size_str = f"{file_size} B"
        elif file_size < 1024 * 1024:
            size_str = f"{file_size / 1024:.1f} KB"
        else:
            size_str = f"{file_size / (1024 * 1024):.1f} MB"
        doc_entry = {
            "file": f"files/{safe_name}",
            "filename": safe_name,
            "size": size_str,
            "text": metadata.get("description", ""),
            "tags": [t.strip() for t in metadata.get("tags", "").split(",") if t.strip()] if isinstance(metadata.get("tags"), str) else metadata.get("tags", []),
            "category": metadata.get("category", "Другое"),
            "subject": metadata.get("subject", "Общее"),
            "course": metadata.get("course", ""),
            "exists": True,
            "title": metadata.get("title", os.path.splitext(safe_name)[0]),
            "description": metadata.get("description", ""),
            "catalogTitle": metadata.get("title", os.path.splitext(safe_name)[0]),
            "catalogDescription": metadata.get("description", ""),
            "docType": metadata.get("docType", metadata.get("category", "Другое")),
        }
        with _catalog_lock:
            catalog = load_catalog()
            catalog.append(doc_entry)
            save_catalog(catalog)
        self._send_json(200, {"ok": True, "doc": doc_entry, "totalDocs": len(catalog)})


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), StatsHandler)
    print(f"Listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()

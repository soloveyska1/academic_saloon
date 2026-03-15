#!/usr/bin/env python3
"""
Premium image-based deploy notification for Academic Saloon.

Generates a beautiful PNG dashboard card using Pillow and sends
it via Telegram sendPhoto API.

Usage:
    python3 scripts/deploy_notify.py --chat-id ID --old-commit SHA --new-commit SHA
"""

import argparse
import io
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ─── Config ──────────────────────────────────────────────────────────────

PROJECT_DIR = Path.home() / "academic_saloon"
ENV_FILE = PROJECT_DIR / ".env"
DIST_DIR = Path("/var/www/academic_saloon/dist/assets")
DOMAIN = "academic-saloon.duckdns.org"
FONTS_DIR = Path(__file__).parent / "fonts"

# ─── Color Palette ───────────────────────────────────────────────────────

class C:
    """Dark luxury color palette."""
    BG = (12, 12, 16)           # Deep black
    CARD = (22, 22, 28)         # Card background
    CARD_LIGHT = (30, 30, 38)   # Lighter card
    BORDER = (45, 45, 55)       # Subtle borders

    GOLD = (212, 175, 55)       # Primary accent
    GOLD_DIM = (160, 130, 40)   # Dimmed gold
    GOLD_GLOW = (212, 175, 55, 30)  # Glow effect

    GREEN = (34, 197, 94)       # Success / active
    GREEN_DIM = (22, 120, 60)   # Dim green
    RED = (239, 68, 68)         # Error
    RED_DIM = (160, 45, 45)     # Dim red
    AMBER = (245, 158, 11)      # Warning
    BLUE = (59, 130, 246)       # Info / links

    TEXT = (240, 240, 245)      # Primary text
    TEXT_SEC = (160, 160, 175)  # Secondary text
    TEXT_DIM = (100, 100, 115)  # Dimmed text

    WHITE = (255, 255, 255)
    BLACK = (0, 0, 0)


# ─── Fonts ───────────────────────────────────────────────────────────────

def load_fonts() -> dict:
    """Load all required fonts."""
    fonts = {}
    try:
        fonts["title"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Bold.ttf"), 28)
        fonts["heading"] = ImageFont.truetype(str(FONTS_DIR / "Inter-SemiBold.ttf"), 18)
        fonts["body"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Medium.ttf"), 15)
        fonts["small"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Regular.ttf"), 13)
        fonts["tiny"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Regular.ttf"), 11)

        fonts["mono_lg"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Bold.ttf"), 22)
        fonts["mono"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Medium.ttf"), 14)
        fonts["mono_sm"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Regular.ttf"), 12)
    except OSError:
        # Fallback to default
        for key in ["title", "heading", "body", "small", "tiny", "mono_lg", "mono", "mono_sm"]:
            fonts[key] = ImageFont.load_default()
    return fonts


# ─── Helpers ─────────────────────────────────────────────────────────────

def sh(cmd: str, default: str = "") -> str:
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return r.stdout.strip() or default
    except Exception:
        return default


def read_env(key: str) -> str:
    try:
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip().strip("'\"")
    except Exception:
        pass
    return ""


def human_uptime(text: str) -> str:
    parts = []
    for m in re.finditer(r'(\d+)\s+(year|month|week|day|hour|minute)', text):
        n, unit = int(m.group(1)), m.group(2)
        labels = {'year': 'г', 'month': 'мес', 'week': 'н', 'day': 'д', 'hour': 'ч', 'minute': 'м'}
        parts.append(f"{n}{labels.get(unit, unit[0])}")
    return " ".join(parts[:3]) or text


# ─── Drawing Primitives ──────────────────────────────────────────────────

def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_gradient_bar(img, xy, pct, color_start, color_end, bg_color=C.CARD_LIGHT, radius=6):
    """Draw a gradient progress bar."""
    draw = ImageDraw.Draw(img)
    x1, y1, x2, y2 = xy
    bar_w = x2 - x1
    bar_h = y2 - y1

    # Background
    draw.rounded_rectangle((x1, y1, x2, y2), radius=radius, fill=bg_color)

    # Fill
    fill_w = max(0, int(bar_w * min(100, pct) / 100))
    if fill_w > radius * 2:
        # Draw gradient fill
        for i in range(fill_w):
            t = i / max(1, fill_w - 1)
            r = int(color_start[0] + (color_end[0] - color_start[0]) * t)
            g = int(color_start[1] + (color_end[1] - color_start[1]) * t)
            b = int(color_start[2] + (color_end[2] - color_start[2]) * t)
            draw.line([(x1 + i, y1 + 1), (x1 + i, y2 - 1)], fill=(r, g, b))

        # Mask corners
        mask = Image.new("L", img.size, 255)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle((x1, y1, x1 + fill_w, y2), radius=radius, fill=255)
        # Apply by redrawing background outside fill area
        draw.rounded_rectangle((x1 + fill_w, y1, x2, y2), radius=radius, fill=bg_color)


def draw_status_dot(draw, x, y, active, size=10):
    """Draw a glowing status indicator dot."""
    if active:
        # Outer glow
        draw.ellipse((x - 2, y - 2, x + size + 2, y + size + 2), fill=(34, 197, 94, 40))
        draw.ellipse((x, y, x + size, y + size), fill=C.GREEN)
        # Inner highlight
        draw.ellipse((x + 2, y + 2, x + size - 4, y + size - 4), fill=(80, 220, 130))
    else:
        draw.ellipse((x, y, x + size, y + size), fill=C.RED_DIM)
        draw.ellipse((x + 2, y + 2, x + size - 2, y + size - 2), fill=C.RED)


def draw_gold_line(draw, x1, y, x2, thickness=1):
    """Draw a subtle gold separator line with gradient fade."""
    for i in range(x2 - x1):
        t = i / (x2 - x1)
        # Fade in and out
        alpha_t = min(t * 4, 1.0) * min((1 - t) * 4, 1.0)
        r = int(C.GOLD[0] * alpha_t + C.CARD[0] * (1 - alpha_t))
        g = int(C.GOLD[1] * alpha_t + C.CARD[1] * (1 - alpha_t))
        b = int(C.GOLD[2] * alpha_t + C.CARD[2] * (1 - alpha_t))
        for dy in range(thickness):
            draw.point((x1 + i, y + dy), fill=(r, g, b))


# ─── Metrics ─────────────────────────────────────────────────────────────

def collect_metrics(old_commit: str, new_commit: str) -> dict:
    m = {}
    os.chdir(str(PROJECT_DIR))

    m["sha"] = sh("git rev-parse --short HEAD")
    m["commit_msg"] = sh("git log -1 --format='%s'")

    diff_range = f"{old_commit}..{new_commit}" if old_commit != new_commit else "HEAD~1..HEAD"

    m["py"] = int(sh(f"git diff --name-only {diff_range} 2>/dev/null | grep -c '\\.py$'") or "0")
    m["ts"] = int(sh(f"git diff --name-only {diff_range} 2>/dev/null | grep -cE '\\.(tsx?|css)$'") or "0")
    m["yml"] = int(sh(f"git diff --name-only {diff_range} 2>/dev/null | grep -c '\\.yml$'") or "0")
    m["total_files"] = int(sh(f"git diff --name-only {diff_range} 2>/dev/null | wc -l") or "0")

    stat_line = sh(f"git diff --shortstat {diff_range} 2>/dev/null")
    ins = re.search(r'(\d+) insertion', stat_line)
    dels = re.search(r'(\d+) deletion', stat_line)
    m["insertions"] = int(ins.group(1)) if ins else 0
    m["deletions"] = int(dels.group(1)) if dels else 0

    commits = sh(f"git log --oneline --no-merges -5 {diff_range} --format='%s' 2>/dev/null")
    m["commits"] = [c.strip() for c in commits.splitlines() if c.strip()][:5]
    m["commit_count"] = int(sh(f"git log --oneline --no-merges {diff_range} 2>/dev/null | wc -l") or "0")
    m["deploy_num"] = int(sh("git log --oneline main 2>/dev/null | wc -l") or "0")

    m["disk_pct"] = int(sh("df -h / | tail -1 | awk '{print $5}' | tr -d '%'") or "0")
    m["disk_used"] = sh("df -h / | tail -1 | awk '{print $3}'")
    m["disk_total"] = sh("df -h / | tail -1 | awk '{print $2}'")
    m["ram_pct"] = int(sh("free | grep Mem | awk '{printf(\"%.0f\", $3/$2*100)}'") or "0")
    m["ram_used"] = sh("free -h | grep Mem | awk '{print $3}'")
    m["ram_total"] = sh("free -h | grep Mem | awk '{print $2}'")
    m["uptime"] = human_uptime(sh("uptime -p"))
    m["load"] = sh("cat /proc/loadavg | awk '{print $1}'")

    # Services
    m["bot_active"] = sh("systemctl is-active saloon-bot 2>/dev/null") == "active"
    m["nginx_active"] = sh("systemctl is-active nginx 2>/dev/null") == "active"
    m["pg_active"] = sh("systemctl is-active postgresql 2>/dev/null") == "active"
    m["redis_active"] = (
        sh("systemctl is-active redis-server 2>/dev/null") == "active"
        or sh("systemctl is-active redis 2>/dev/null") == "active"
    )

    bot_ram = sh("ps aux | grep -E 'python.*main\\.py|uvicorn' | grep -v grep | awk '{sum+=$6} END {printf(\"%.0f\", sum/1024)}'")
    m["bot_ram"] = int(bot_ram) if bot_ram else 0

    api_time = sh("curl -s -o /dev/null -w '%{time_total}' --max-time 3 http://localhost:8000/health 2>/dev/null")
    try:
        m["api_ms"] = int(float(api_time) * 1000)
        m["api_ok"] = True
    except (ValueError, TypeError):
        m["api_ms"] = 0
        m["api_ok"] = False

    try:
        m["bundle_kb"] = int(sh(f"du -sk {DIST_DIR} 2>/dev/null | awk '{{print $1}}'") or "0")
    except ValueError:
        m["bundle_kb"] = 0

    ssl_output = sh(
        f"echo | openssl s_client -servername {DOMAIN} -connect {DOMAIN}:443 2>/dev/null"
        f" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2"
    )
    try:
        from email.utils import parsedate_to_datetime
        exp_dt = parsedate_to_datetime(ssl_output.replace("GMT", "+0000"))
        m["ssl_days"] = (exp_dt - datetime.now(exp_dt.tzinfo)).days
    except Exception:
        ssl_ts = sh(f"date -d '{ssl_output}' +%s 2>/dev/null")
        m["ssl_days"] = (int(ssl_ts) - int(time.time())) // 86400 if ssl_ts else -1

    # Health score
    health = 100
    if not m["bot_active"]:
        health -= 35
    if not m["api_ok"]:
        health -= 20
    if not m["nginx_active"]:
        health -= 20
    if not m["pg_active"]:
        health -= 20
    if m["disk_pct"] > 85:
        health -= 10
    if m["ram_pct"] > 85:
        health -= 10
    m["health"] = max(0, health)

    return m


# ─── Image Builder ───────────────────────────────────────────────────────

def build_deploy_card(m: dict, deploy_secs: int, commit_url: str, logs_url: str) -> bytes:
    """Generate a beautiful PNG deploy dashboard card."""

    fonts = load_fonts()

    W = 800
    H = 680
    PAD = 32
    CARD_PAD = 20

    img = Image.new("RGBA", (W, H), C.BG)
    draw = ImageDraw.Draw(img)

    y = PAD

    # ═══ TOP ACCENT LINE ═══
    for x in range(0, W):
        t = x / W
        r = int(C.GOLD[0] * (0.3 + 0.7 * (1 - abs(2 * t - 1))))
        g = int(C.GOLD[1] * (0.3 + 0.7 * (1 - abs(2 * t - 1))))
        b = int(C.GOLD[2] * (0.3 + 0.7 * (1 - abs(2 * t - 1))))
        for dy in range(3):
            draw.point((x, dy), fill=(r, g, b))

    # ═══ HEADER ═══
    y = 20

    # Deploy number badge
    deploy_text = f"#{m['deploy_num']}"
    badge_w = fonts["mono"].getlength(deploy_text) + 16
    draw_rounded_rect(draw, (W - PAD - badge_w, y + 2, W - PAD, y + 26), radius=12,
                      fill=C.GOLD_DIM, outline=C.GOLD)
    draw.text((W - PAD - badge_w + 8, y + 4), deploy_text, fill=C.BG, font=fonts["mono"])

    # Title
    draw.text((PAD, y), "ДЕПЛОЙ ЗАВЕРШЁН", fill=C.GOLD, font=fonts["title"])
    y += 38

    # Time info
    mins = deploy_secs // 60
    secs = deploy_secs % 60
    time_str = f"{mins}м {secs}с" if mins else f"{secs}с"
    now_str = datetime.now().strftime("%d.%m.%Y  %H:%M")
    draw.text((PAD, y), f"{now_str}  ·  {time_str}", fill=C.TEXT_DIM, font=fonts["small"])
    y += 28

    # Gold separator
    draw_gold_line(draw, PAD, y, W - PAD)
    y += 16

    # ═══ COMMIT INFO ═══
    commit_msg = m["commit_msg"][:65]
    draw.text((PAD, y), commit_msg, fill=C.TEXT, font=fonts["heading"])
    y += 28

    # Commit list
    for c in m["commits"][:3]:
        label = c[:60] + "…" if len(c) > 60 else c
        draw.text((PAD + 16, y), "›", fill=C.GOLD, font=fonts["body"])
        draw.text((PAD + 30, y), label, fill=C.TEXT_SEC, font=fonts["small"])
        y += 20

    y += 8

    # ═══ DIFF STATS BAR ═══
    stats_card_y = y
    draw_rounded_rect(draw, (PAD, y, W - PAD, y + 50), radius=12, fill=C.CARD)

    sx = PAD + CARD_PAD
    sy = y + 10

    # File counts with colored dots
    if m["py"]:
        draw.ellipse((sx, sy + 5, sx + 8, sy + 13), fill=(59, 130, 246))  # blue for Python
        draw.text((sx + 12, sy), f'{m["py"]} py', fill=C.TEXT_SEC, font=fonts["mono_sm"])
        sx += int(fonts["mono_sm"].getlength(f'{m["py"]} py')) + 24

    if m["ts"]:
        draw.ellipse((sx, sy + 5, sx + 8, sy + 13), fill=(49, 196, 141))  # teal for TS
        draw.text((sx + 12, sy), f'{m["ts"]} ts', fill=C.TEXT_SEC, font=fonts["mono_sm"])
        sx += int(fonts["mono_sm"].getlength(f'{m["ts"]} ts')) + 24

    if m["yml"]:
        draw.ellipse((sx, sy + 5, sx + 8, sy + 13), fill=(245, 158, 11))  # amber for YAML
        draw.text((sx + 12, sy), f'{m["yml"]} yml', fill=C.TEXT_SEC, font=fonts["mono_sm"])
        sx += int(fonts["mono_sm"].getlength(f'{m["yml"]} yml')) + 24

    # Total files
    draw.text((sx + 8, sy), f'{m["total_files"]} файлов', fill=C.TEXT_DIM, font=fonts["mono_sm"])

    # Insertions / deletions on the right
    right_x = W - PAD - CARD_PAD
    if m["insertions"] or m["deletions"]:
        del_text = f"−{m['deletions']}"
        del_w = fonts["mono_sm"].getlength(del_text)
        draw.text((right_x - del_w, sy), del_text, fill=C.RED, font=fonts["mono_sm"])

        ins_text = f"+{m['insertions']}"
        ins_w = fonts["mono_sm"].getlength(ins_text)
        draw.text((right_x - del_w - ins_w - 16, sy), ins_text, fill=C.GREEN, font=fonts["mono_sm"])

    # Second row in stats card
    sy += 18
    total_changes = m["insertions"] + m["deletions"]
    if total_changes > 0:
        bar_x1 = PAD + CARD_PAD
        bar_x2 = W - PAD - CARD_PAD
        bar_w = bar_x2 - bar_x1
        ins_ratio = m["insertions"] / total_changes
        ins_w = int(bar_w * ins_ratio)

        # Green bar (insertions)
        if ins_w > 0:
            draw.rounded_rectangle((bar_x1, sy + 2, bar_x1 + ins_w, sy + 8), radius=3, fill=C.GREEN)
        # Red bar (deletions)
        if ins_w < bar_w:
            draw.rounded_rectangle((bar_x1 + ins_w + 2, sy + 2, bar_x2, sy + 8), radius=3, fill=C.RED_DIM)

    y = stats_card_y + 58

    # ═══ SERVICES + SYSTEM — TWO COLUMN LAYOUT ═══
    y += 8
    col1_x = PAD
    col2_x = W // 2 + 8
    col_w = W // 2 - PAD - 8

    # Left card: Services
    card_h = 200
    draw_rounded_rect(draw, (col1_x, y, col1_x + col_w, y + card_h), radius=14, fill=C.CARD)

    # Card title
    cy = y + CARD_PAD
    draw.text((col1_x + CARD_PAD, cy), "СЕРВИСЫ", fill=C.GOLD_DIM, font=fonts["tiny"])
    cy += 22

    services = [
        ("Бот", m["bot_active"], f'{m["bot_ram"]} MB'),
        ("API", m["api_ok"], f'{m["api_ms"]}мс' if m["api_ok"] else "—"),
        ("Nginx", m["nginx_active"], ""),
        ("PostgreSQL", m["pg_active"], ""),
        ("Redis", m["redis_active"], ""),
    ]

    for name, active, detail in services:
        draw_status_dot(draw, col1_x + CARD_PAD, cy + 2, active, size=10)
        draw.text((col1_x + CARD_PAD + 18, cy), name, fill=C.TEXT if active else C.TEXT_DIM, font=fonts["body"])
        if detail:
            dw = fonts["mono_sm"].getlength(detail)
            draw.text((col1_x + col_w - CARD_PAD - dw, cy + 2), detail,
                      fill=C.TEXT_SEC if active else C.TEXT_DIM, font=fonts["mono_sm"])
        cy += 28

    # Right card: System
    draw_rounded_rect(draw, (col2_x, y, col2_x + col_w, y + card_h), radius=14, fill=C.CARD)

    cy = y + CARD_PAD
    draw.text((col2_x + CARD_PAD, cy), "СИСТЕМА", fill=C.GOLD_DIM, font=fonts["tiny"])
    cy += 22

    # Disk
    draw.text((col2_x + CARD_PAD, cy), "Диск", fill=C.TEXT_SEC, font=fonts["body"])
    disk_val = f'{m["disk_used"]}/{m["disk_total"]}  {m["disk_pct"]}%'
    dw = fonts["mono_sm"].getlength(disk_val)
    draw.text((col2_x + col_w - CARD_PAD - dw, cy + 2), disk_val, fill=C.TEXT, font=fonts["mono_sm"])
    cy += 22

    # Disk bar
    disk_color = C.GREEN if m["disk_pct"] < 70 else (C.AMBER if m["disk_pct"] < 85 else C.RED)
    bar_x1 = col2_x + CARD_PAD
    bar_x2 = col2_x + col_w - CARD_PAD
    draw_gradient_bar(img, (bar_x1, cy, bar_x2, cy + 8), m["disk_pct"],
                      disk_color, disk_color, radius=4)
    cy += 18

    # RAM
    draw.text((col2_x + CARD_PAD, cy), "RAM", fill=C.TEXT_SEC, font=fonts["body"])
    ram_val = f'{m["ram_used"]}/{m["ram_total"]}  {m["ram_pct"]}%'
    rw = fonts["mono_sm"].getlength(ram_val)
    draw.text((col2_x + col_w - CARD_PAD - rw, cy + 2), ram_val, fill=C.TEXT, font=fonts["mono_sm"])
    cy += 22

    # RAM bar
    ram_color = C.GREEN if m["ram_pct"] < 70 else (C.AMBER if m["ram_pct"] < 85 else C.RED)
    draw_gradient_bar(img, (bar_x1, cy, bar_x2, cy + 8), m["ram_pct"],
                      ram_color, ram_color, radius=4)
    cy += 22

    # Additional system info
    draw.text((col2_x + CARD_PAD, cy), "Аптайм", fill=C.TEXT_DIM, font=fonts["small"])
    uw = fonts["mono_sm"].getlength(m["uptime"])
    draw.text((col2_x + col_w - CARD_PAD - uw, cy), m["uptime"], fill=C.TEXT_SEC, font=fonts["mono_sm"])
    cy += 20

    draw.text((col2_x + CARD_PAD, cy), "Нагрузка", fill=C.TEXT_DIM, font=fonts["small"])
    lw = fonts["mono_sm"].getlength(m["load"])
    draw.text((col2_x + col_w - CARD_PAD - lw, cy), m["load"], fill=C.TEXT_SEC, font=fonts["mono_sm"])

    y += card_h + 12

    # ═══ BOTTOM METRICS ROW ═══
    metrics_h = 80
    draw_rounded_rect(draw, (PAD, y, W - PAD, y + metrics_h), radius=14, fill=C.CARD)

    # Three metric cells
    cell_w = (W - 2 * PAD) // 3
    metrics_data = [
        ("БАНДЛ", f"{m['bundle_kb'] / 1024:.1f} MB" if m["bundle_kb"] > 1024 else f"{m['bundle_kb']} KB"),
        ("SSL", f'{m["ssl_days"]}д' if m["ssl_days"] > 0 else "—"),
        ("ЗДОРОВЬЕ", f'{m["health"]}/100'),
    ]

    for i, (label, value) in enumerate(metrics_data):
        cx = PAD + i * cell_w + cell_w // 2
        cy_top = y + 18

        draw.text((cx - fonts["tiny"].getlength(label) / 2, cy_top),
                  label, fill=C.GOLD_DIM, font=fonts["tiny"])

        # Value
        val_font = fonts["mono_lg"]
        vw = val_font.getlength(value)
        val_color = C.TEXT

        if label == "ЗДОРОВЬЕ":
            if m["health"] >= 95:
                val_color = C.GREEN
            elif m["health"] >= 70:
                val_color = C.AMBER
            else:
                val_color = C.RED

        if label == "SSL" and m["ssl_days"] < 14:
            val_color = C.RED if m["ssl_days"] < 7 else C.AMBER

        draw.text((cx - vw / 2, cy_top + 20), value, fill=val_color, font=val_font)

        # Divider between cells
        if i < 2:
            div_x = PAD + (i + 1) * cell_w
            draw.line([(div_x, y + 16), (div_x, y + metrics_h - 16)], fill=C.BORDER, width=1)

    y += metrics_h + 12

    # ═══ FOOTER ═══
    footer_text = f"Academic Saloon  ·  {m['sha']}"
    fw = fonts["small"].getlength(footer_text)
    draw.text(((W - fw) / 2, y), footer_text, fill=C.TEXT_DIM, font=fonts["small"])

    # ─── Convert to PNG bytes ─────────────────────────────────────────
    # Flatten to RGB
    bg = Image.new("RGB", img.size, C.BG)
    bg.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)

    buf = io.BytesIO()
    bg.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ─── Telegram API ────────────────────────────────────────────────────────

def send_photo(token: str, chat_id: str, photo_bytes: bytes, caption: str = "") -> bool:
    """Send a photo via Telegram Bot API using multipart/form-data."""
    boundary = "----PythonBoundary" + str(int(time.time()))

    body = b""
    # chat_id
    body += f"--{boundary}\r\n".encode()
    body += b"Content-Disposition: form-data; name=\"chat_id\"\r\n\r\n"
    body += f"{chat_id}\r\n".encode()

    # caption
    if caption:
        body += f"--{boundary}\r\n".encode()
        body += b"Content-Disposition: form-data; name=\"caption\"\r\n\r\n"
        body += f"{caption}\r\n".encode()

        body += f"--{boundary}\r\n".encode()
        body += b"Content-Disposition: form-data; name=\"parse_mode\"\r\n\r\n"
        body += b"HTML\r\n"

    # photo
    body += f"--{boundary}\r\n".encode()
    body += b"Content-Disposition: form-data; name=\"photo\"; filename=\"deploy.png\"\r\n"
    body += b"Content-Type: image/png\r\n\r\n"
    body += photo_bytes
    body += b"\r\n"
    body += f"--{boundary}--\r\n".encode()

    url = f"https://api.telegram.org/bot{token}/sendPhoto"
    req = urllib.request.Request(url, data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return resp.status == 200
    except Exception as e:
        print(f"Failed to send photo: {e}")
        return False


# ─── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chat-id", required=True)
    parser.add_argument("--old-commit", default="HEAD~1")
    parser.add_argument("--new-commit", default="HEAD")
    parser.add_argument("--deploy-start", type=int, default=0)
    parser.add_argument("--commit-url", default="")
    parser.add_argument("--logs-url", default="")
    args = parser.parse_args()

    token = read_env("BOT_TOKEN")
    if not token:
        print("ERROR: BOT_TOKEN not found in .env")
        return

    deploy_secs = int(time.time()) - args.deploy_start if args.deploy_start else 0

    print("Collecting metrics...")
    metrics = collect_metrics(args.old_commit, args.new_commit)

    print("Generating dashboard card...")
    png_data = build_deploy_card(metrics, deploy_secs, args.commit_url, args.logs_url)

    # Save locally for debugging
    debug_path = Path("/tmp/deploy_card.png")
    debug_path.write_bytes(png_data)
    print(f"Card saved to {debug_path} ({len(png_data)} bytes)")

    # Caption with links
    caption = f'<a href="{args.commit_url}">коммит {metrics["sha"]}</a>'
    if args.logs_url:
        caption += f'  ·  <a href="{args.logs_url}">логи CI</a>'

    print("Sending notification...")
    ok = send_photo(token, args.chat_id, png_data, caption)
    print(f"{'Sent!' if ok else 'FAILED'}")


if __name__ == "__main__":
    main()

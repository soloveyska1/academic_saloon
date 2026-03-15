#!/usr/bin/env python3
"""
Premium image-based deploy & merge notifications for Academic Saloon.

Generates stunning PNG dashboard cards using Pillow with:
- Circular health gauge with glow
- Gradient backgrounds and accent lines
- Subtle dot-grid texture
- Sophisticated typography hierarchy
- Glowing status indicators

Usage:
    python3 scripts/deploy_notify.py --chat-id ID --old-commit SHA --new-commit SHA
    python3 scripts/deploy_notify.py --mode merge --chat-id ID ...
"""

import argparse
import io
import math
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

BG_DARK = (10, 10, 14)
BG_CARD = (18, 18, 24)
BG_CARD2 = (24, 24, 32)
BG_ELEVATED = (32, 32, 42)
BORDER = (42, 42, 55)
BORDER_LIGHT = (55, 55, 70)

GOLD = (212, 175, 55)
GOLD_LIGHT = (235, 206, 110)
GOLD_DIM = (140, 115, 35)
GOLD_DARK = (80, 65, 20)

EMERALD = (16, 185, 129)
EMERALD_LIGHT = (52, 211, 153)
EMERALD_DIM = (10, 120, 80)

SKY = (56, 189, 248)
SKY_DIM = (30, 100, 140)

ROSE = (244, 63, 94)
ROSE_DIM = (140, 35, 50)

AMBER = (245, 158, 11)
AMBER_DIM = (160, 100, 10)

VIOLET = (139, 92, 246)
VIOLET_DIM = (80, 50, 150)

TEXT_PRIMARY = (245, 245, 250)
TEXT_SECONDARY = (160, 160, 180)
TEXT_MUTED = (95, 95, 115)
TEXT_DIM = (65, 65, 80)


# ─── Fonts ───────────────────────────────────────────────────────────────

def load_fonts() -> dict:
    f = {}
    try:
        f["hero"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Bold.ttf"), 32)
        f["title"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Bold.ttf"), 22)
        f["heading"] = ImageFont.truetype(str(FONTS_DIR / "Inter-SemiBold.ttf"), 16)
        f["body"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Medium.ttf"), 14)
        f["caption"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Regular.ttf"), 12)
        f["tiny"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Regular.ttf"), 10)

        f["num_xl"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Bold.ttf"), 28)
        f["num_lg"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Bold.ttf"), 20)
        f["mono"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Medium.ttf"), 13)
        f["mono_sm"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Regular.ttf"), 11)
    except OSError:
        default = ImageFont.load_default()
        for key in ["hero", "title", "heading", "body", "caption", "tiny",
                     "num_xl", "num_lg", "mono", "mono_sm"]:
            f[key] = default
    return f


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


def lerp_color(c1, c2, t):
    """Linearly interpolate between two RGB colors."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


# ─── Drawing Primitives ──────────────────────────────────────────────────

def draw_dot_grid(draw, x1, y1, x2, y2, spacing=16, color=(255, 255, 255), alpha=12):
    """Draw a subtle dot grid pattern."""
    dot_color = (*color[:3], alpha) if len(color) == 3 else color
    # Since we're on RGBA, just draw low-alpha dots
    c = (color[0], color[1], color[2])
    # Approximate alpha by blending with background
    bg = BG_DARK
    t = alpha / 255
    blended = tuple(int(bg[i] * (1 - t) + c[i] * t) for i in range(3))
    for x in range(x1, x2, spacing):
        for y in range(y1, y2, spacing):
            draw.point((x, y), fill=blended)


def draw_gradient_h(draw, x1, y1, x2, y2, c_left, c_right):
    """Draw horizontal gradient rectangle."""
    w = x2 - x1
    for i in range(w):
        t = i / max(1, w - 1)
        c = lerp_color(c_left, c_right, t)
        draw.line([(x1 + i, y1), (x1 + i, y2)], fill=c)


def draw_gradient_v(draw, x1, y1, x2, y2, c_top, c_bottom):
    """Draw vertical gradient rectangle."""
    h = y2 - y1
    for i in range(h):
        t = i / max(1, h - 1)
        c = lerp_color(c_top, c_bottom, t)
        draw.line([(x1, y1 + i), (x2, y1 + i)], fill=c)


def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_glow_circle(img, cx, cy, radius, color, intensity=0.4):
    """Draw a soft glow behind an element."""
    glow = Image.new("RGB", img.size, BG_DARK)
    glow_draw = ImageDraw.Draw(glow)

    for r in range(radius, 0, -1):
        t = 1 - (r / radius)
        alpha = t * t * intensity
        c = lerp_color(BG_DARK, color, alpha)
        glow_draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)

    # Blend onto main image
    from PIL import ImageChops
    img.paste(ImageChops.lighter(img.convert("RGB"), glow).convert("RGBA"))


def draw_arc_gauge(draw, cx, cy, radius, thickness, pct, color_start, color_end, bg_color=BORDER):
    """Draw a circular arc gauge (270 degrees)."""
    start_angle = 135  # bottom-left
    sweep = 270

    # Background arc
    for deg in range(sweep):
        angle = math.radians(start_angle + deg)
        for t in range(thickness):
            r = radius - t
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            draw.point((int(x), int(y)), fill=bg_color)

    # Filled arc
    fill_degrees = int(sweep * min(100, pct) / 100)
    for deg in range(fill_degrees):
        t_color = deg / max(1, sweep)
        color = lerp_color(color_start, color_end, t_color)
        angle = math.radians(start_angle + deg)
        for t in range(thickness):
            r = radius - t
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            draw.point((int(x), int(y)), fill=color)


def draw_progress_bar(draw, x1, y1, x2, y2, pct, color, bg=BG_ELEVATED, radius=4):
    """Draw a sleek progress bar."""
    draw.rounded_rectangle((x1, y1, x2, y2), radius=radius, fill=bg)
    fill_w = int((x2 - x1) * min(100, pct) / 100)
    if fill_w > radius * 2:
        draw.rounded_rectangle((x1, y1, x1 + fill_w, y2), radius=radius, fill=color)
        # Highlight on top edge
        highlight = lerp_color(color, (255, 255, 255), 0.3)
        draw.line([(x1 + radius, y1 + 1), (x1 + fill_w - radius, y1 + 1)], fill=highlight)


def draw_status_indicator(draw, x, y, active, size=8):
    """Draw a glowing status dot."""
    if active:
        # Outer glow
        for r in range(size + 4, size, -1):
            alpha = (r - size) / 4
            c = lerp_color(BG_CARD, EMERALD, 0.15 * alpha)
            draw.ellipse((x - r + size, y - r + size, x + r, y + r), fill=c)
        draw.ellipse((x, y, x + size, y + size), fill=EMERALD)
        # Inner bright spot
        draw.ellipse((x + 2, y + 2, x + size - 3, y + size - 3), fill=EMERALD_LIGHT)
    else:
        draw.ellipse((x, y, x + size, y + size), fill=ROSE_DIM)
        draw.ellipse((x + 1, y + 1, x + size - 1, y + size - 1), fill=ROSE)


def draw_gold_separator(draw, x1, y, x2):
    """Draw a premium gold gradient line."""
    w = x2 - x1
    for i in range(w):
        t = i / w
        fade = math.sin(t * math.pi)  # sine fade in/out
        c = lerp_color(BG_CARD if BG_CARD else BG_DARK, GOLD, fade * 0.6)
        draw.point((x1 + i, y), fill=c)


def text_width(font, text):
    return font.getlength(text)


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

    health = 100
    if not m["bot_active"]: health -= 35
    if not m["api_ok"]: health -= 20
    if not m["nginx_active"]: health -= 20
    if not m["pg_active"]: health -= 20
    if m["disk_pct"] > 85: health -= 10
    if m["ram_pct"] > 85: health -= 10
    m["health"] = max(0, health)

    return m


# ─── Deploy Card Builder ─────────────────────────────────────────────────

def build_deploy_card(m: dict, deploy_secs: int, commit_url: str, logs_url: str) -> bytes:
    fonts = load_fonts()
    W, H = 820, 760
    PAD = 36

    img = Image.new("RGB", (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)

    # ═══ BACKGROUND TEXTURE ═══
    draw_dot_grid(draw, 0, 0, W, H, spacing=20, color=(255, 255, 255), alpha=6)

    # ═══ TOP GRADIENT BAR ═══
    draw_gradient_h(draw, 0, 0, W, 4, GOLD_DIM, GOLD)
    # Subtle glow under the gold bar
    for y in range(4, 30):
        t = (y - 4) / 26
        alpha = (1 - t) * 0.08
        c = lerp_color(BG_DARK, GOLD, alpha)
        draw.line([(0, y), (W, y)], fill=c)

    y = 36

    # ═══ HEADER SECTION ═══
    # Deploy badge — pill shape
    deploy_text = f"#{m['deploy_num']}"
    badge_w = int(text_width(fonts["mono"], deploy_text)) + 20
    badge_x = W - PAD - badge_w
    draw_rounded_rect(draw, (badge_x, y, badge_x + badge_w, y + 28), radius=14,
                      fill=GOLD_DARK, outline=GOLD_DIM)
    draw.text((badge_x + 10, y + 5), deploy_text, fill=GOLD_LIGHT, font=fonts["mono"])

    # Title with subtle shadow
    draw.text((PAD + 2, y + 2), "ДЕПЛОЙ", fill=(5, 5, 8), font=fonts["hero"])  # shadow
    draw.text((PAD, y), "ДЕПЛОЙ", fill=GOLD, font=fonts["hero"])

    y += 42

    # Timestamp + duration
    mins = deploy_secs // 60
    secs = deploy_secs % 60
    time_str = f"{mins}м {secs}с" if mins else f"{secs}с"
    now_str = datetime.now().strftime("%d.%m.%Y  %H:%M")
    draw.text((PAD, y), now_str, fill=TEXT_MUTED, font=fonts["caption"])
    draw.text((PAD + text_width(fonts["caption"], now_str) + 12, y), f"·  {time_str}",
              fill=TEXT_DIM, font=fonts["caption"])
    y += 24

    # Gold separator
    draw_gold_separator(draw, PAD, y, W - PAD)
    y += 16

    # ═══ COMMIT SECTION ═══
    commit_msg = m["commit_msg"][:62]
    draw.text((PAD, y), commit_msg, fill=TEXT_PRIMARY, font=fonts["title"])
    y += 30

    # Commit list with connecting lines
    for i, c in enumerate(m["commits"][:4]):
        label = c[:55] + "…" if len(c) > 55 else c
        is_last = (i == len(m["commits"][:4]) - 1)

        # Tree connector
        connector = "└" if is_last else "├"
        draw.text((PAD + 4, y - 2), connector, fill=BORDER_LIGHT, font=fonts["body"])
        draw.text((PAD + 18, y), label, fill=TEXT_SECONDARY, font=fonts["caption"])
        y += 20

    y += 10

    # ═══ DIFF STATS CARD ═══
    card_y = y
    draw_rounded_rect(draw, (PAD, y, W - PAD, y + 56), radius=12, fill=BG_CARD, outline=BORDER)

    sx = PAD + 16
    sy = y + 10

    # Language dots with labels
    lang_items = []
    if m["py"]: lang_items.append((SKY, f"{m['py']} py"))
    if m["ts"]: lang_items.append((EMERALD, f"{m['ts']} ts"))
    if m["yml"]: lang_items.append((AMBER, f"{m['yml']} ci"))

    for color, label in lang_items:
        draw.ellipse((sx, sy + 3, sx + 7, sy + 10), fill=color)
        draw.text((sx + 11, sy), label, fill=TEXT_SECONDARY, font=fonts["mono_sm"])
        sx += int(text_width(fonts["mono_sm"], label)) + 22

    draw.text((sx + 4, sy), f"{m['total_files']} файлов", fill=TEXT_MUTED, font=fonts["mono_sm"])

    # Insertions/deletions on right
    rx = W - PAD - 16
    if m["deletions"]:
        del_t = f"−{m['deletions']}"
        rx -= int(text_width(fonts["mono_sm"], del_t))
        draw.text((rx, sy), del_t, fill=ROSE, font=fonts["mono_sm"])
        rx -= 12
    if m["insertions"]:
        ins_t = f"+{m['insertions']}"
        rx -= int(text_width(fonts["mono_sm"], ins_t))
        draw.text((rx, sy), ins_t, fill=EMERALD, font=fonts["mono_sm"])

    # Change bar
    sy += 20
    total = m["insertions"] + m["deletions"]
    if total > 0:
        bx1, bx2 = PAD + 16, W - PAD - 16
        bw = bx2 - bx1
        ins_w = max(2, int(bw * m["insertions"] / total))
        draw.rounded_rectangle((bx1, sy, bx1 + ins_w, sy + 6), radius=3, fill=EMERALD)
        if ins_w < bw - 2:
            draw.rounded_rectangle((bx1 + ins_w + 2, sy, bx2, sy + 6), radius=3, fill=ROSE_DIM)

    y = card_y + 64

    # ═══ TWO-COLUMN SECTION ═══
    col_gap = 14
    col_w = (W - 2 * PAD - col_gap) // 2
    col1_x = PAD
    col2_x = PAD + col_w + col_gap

    # ─── LEFT: Services Card ───
    svc_h = 220
    draw_rounded_rect(draw, (col1_x, y, col1_x + col_w, y + svc_h), radius=14,
                      fill=BG_CARD, outline=BORDER)

    cy = y + 16
    draw.text((col1_x + 18, cy), "СЕРВИСЫ", fill=GOLD_DIM, font=fonts["tiny"])
    # Decorative line under title
    draw_gradient_h(draw, col1_x + 18, cy + 14, col1_x + 90, cy + 15, GOLD_DIM, BG_CARD)
    cy += 26

    services = [
        ("Бот", m["bot_active"], f'{m["bot_ram"]}MB', EMERALD),
        ("API", m["api_ok"], f'{m["api_ms"]}мс' if m["api_ok"] else "—", SKY),
        ("Nginx", m["nginx_active"], "", EMERALD),
        ("PostgreSQL", m["pg_active"], "", VIOLET),
        ("Redis", m["redis_active"], "", AMBER),
    ]

    for name, active, detail, accent in services:
        draw_status_indicator(draw, col1_x + 18, cy + 3, active)
        name_color = TEXT_PRIMARY if active else TEXT_MUTED
        draw.text((col1_x + 32, cy), name, fill=name_color, font=fonts["body"])
        if detail:
            dw = text_width(fonts["mono_sm"], detail)
            detail_color = TEXT_SECONDARY if active else TEXT_MUTED
            draw.text((col1_x + col_w - 18 - dw, cy + 1), detail, fill=detail_color, font=fonts["mono_sm"])
        cy += 34

    # ─── RIGHT: System + Health ───
    draw_rounded_rect(draw, (col2_x, y, col2_x + col_w, y + svc_h), radius=14,
                      fill=BG_CARD, outline=BORDER)

    cy = y + 16
    draw.text((col2_x + 18, cy), "СИСТЕМА", fill=GOLD_DIM, font=fonts["tiny"])
    draw_gradient_h(draw, col2_x + 18, cy + 14, col2_x + 90, cy + 15, GOLD_DIM, BG_CARD)
    cy += 28

    # Disk
    draw.text((col2_x + 18, cy), "Диск", fill=TEXT_SECONDARY, font=fonts["body"])
    disk_label = f"{m['disk_pct']}%"
    draw.text((col2_x + col_w - 18 - text_width(fonts["mono_sm"], disk_label), cy + 1),
              disk_label, fill=TEXT_PRIMARY, font=fonts["mono_sm"])
    cy += 20
    disk_color = EMERALD if m["disk_pct"] < 70 else (AMBER if m["disk_pct"] < 85 else ROSE)
    draw_progress_bar(draw, col2_x + 18, cy, col2_x + col_w - 18, cy + 7,
                      m["disk_pct"], disk_color)
    disk_info = f"{m['disk_used']} / {m['disk_total']}"
    draw.text((col2_x + 18, cy + 11), disk_info, fill=TEXT_DIM, font=fonts["tiny"])
    cy += 30

    # RAM
    draw.text((col2_x + 18, cy), "RAM", fill=TEXT_SECONDARY, font=fonts["body"])
    ram_label = f"{m['ram_pct']}%"
    draw.text((col2_x + col_w - 18 - text_width(fonts["mono_sm"], ram_label), cy + 1),
              ram_label, fill=TEXT_PRIMARY, font=fonts["mono_sm"])
    cy += 20
    ram_color = EMERALD if m["ram_pct"] < 70 else (AMBER if m["ram_pct"] < 85 else ROSE)
    draw_progress_bar(draw, col2_x + 18, cy, col2_x + col_w - 18, cy + 7,
                      m["ram_pct"], ram_color)
    ram_info = f"{m['ram_used']} / {m['ram_total']}"
    draw.text((col2_x + 18, cy + 11), ram_info, fill=TEXT_DIM, font=fonts["tiny"])
    cy += 32

    # Uptime + Load
    draw.text((col2_x + 18, cy), "Аптайм", fill=TEXT_MUTED, font=fonts["caption"])
    draw.text((col2_x + col_w - 18 - text_width(fonts["mono_sm"], m["uptime"]), cy),
              m["uptime"], fill=TEXT_SECONDARY, font=fonts["mono_sm"])
    cy += 20
    draw.text((col2_x + 18, cy), "Нагрузка", fill=TEXT_MUTED, font=fonts["caption"])
    draw.text((col2_x + col_w - 18 - text_width(fonts["mono_sm"], m["load"]), cy),
              m["load"], fill=TEXT_SECONDARY, font=fonts["mono_sm"])

    y += svc_h + 14

    # ═══ BOTTOM METRICS WITH CIRCULAR GAUGE ═══
    bottom_h = 140
    draw_rounded_rect(draw, (PAD, y, W - PAD, y + bottom_h), radius=16, fill=BG_CARD, outline=BORDER)

    # Circular health gauge — center-right
    gauge_cx = W - PAD - 90
    gauge_cy = y + bottom_h // 2

    # Determine health colors
    if m["health"] >= 90:
        h_c1, h_c2 = EMERALD_DIM, EMERALD_LIGHT
    elif m["health"] >= 60:
        h_c1, h_c2 = AMBER_DIM, AMBER
    else:
        h_c1, h_c2 = ROSE_DIM, ROSE

    draw_arc_gauge(draw, gauge_cx, gauge_cy, 48, 6, m["health"], h_c1, h_c2)

    # Health number in center
    h_text = str(m["health"])
    hw = text_width(fonts["num_xl"], h_text)
    draw.text((gauge_cx - hw / 2, gauge_cy - 18), h_text, fill=TEXT_PRIMARY, font=fonts["num_xl"])
    lbl = "здоровье"
    lw = text_width(fonts["tiny"], lbl)
    draw.text((gauge_cx - lw / 2, gauge_cy + 14), lbl, fill=TEXT_MUTED, font=fonts["tiny"])

    # Left metrics: Bundle, SSL, Uptime
    mx = PAD + 24
    my = y + 20

    metrics = [
        ("БАНДЛ", f"{m['bundle_kb'] / 1024:.1f}MB" if m["bundle_kb"] > 1024 else f"{m['bundle_kb']}KB", SKY),
        ("SSL", f"{m['ssl_days']}д" if m["ssl_days"] > 0 else "—", EMERALD if m["ssl_days"] > 14 else ROSE),
        ("КОММИТОВ", str(m["commit_count"]), VIOLET),
    ]

    for label, value, color in metrics:
        draw.text((mx, my), label, fill=TEXT_DIM, font=fonts["tiny"])
        draw.text((mx, my + 14), value, fill=color, font=fonts["num_lg"])
        my += 38

    # Middle: small vertical separator
    sep_x = PAD + 140
    draw.line([(sep_x, y + 24), (sep_x, y + bottom_h - 24)], fill=BORDER, width=1)

    # Middle-left metrics
    mx2 = sep_x + 24
    my2 = y + 20
    metrics2 = [
        ("ФАЙЛОВ", str(m["total_files"]), GOLD),
        ("ДОБАВЛЕНО", f"+{m['insertions']}", EMERALD),
        ("УДАЛЕНО", f"−{m['deletions']}", ROSE),
    ]
    for label, value, color in metrics2:
        draw.text((mx2, my2), label, fill=TEXT_DIM, font=fonts["tiny"])
        draw.text((mx2, my2 + 14), value, fill=color, font=fonts["num_lg"])
        my2 += 38

    # Separator before gauge
    sep2_x = sep_x + 155
    draw.line([(sep2_x, y + 24), (sep2_x, y + bottom_h - 24)], fill=BORDER, width=1)

    y += bottom_h + 16

    # ═══ FOOTER ═══
    footer = f"Academic Saloon  ·  {m['sha']}"
    fw = text_width(fonts["caption"], footer)
    draw.text(((W - fw) / 2, y), footer, fill=TEXT_DIM, font=fonts["caption"])

    # Bottom gold line
    draw_gradient_h(draw, W // 4, H - 3, 3 * W // 4, H - 1, BG_DARK, GOLD_DIM)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ─── Merge Card Builder ──────────────────────────────────────────────────

def build_merge_card(
    branch: str,
    commit_count: int,
    commits: list,
    file_tags: str,
    files_stat: str,
    insertions: int = 0,
    deletions: int = 0,
) -> bytes:
    """Generate a PNG card for merge notifications."""
    fonts = load_fonts()
    W = 700
    PAD = 32

    # Calculate height based on content
    n_commits = min(len(commits), 5)
    H = 260 + n_commits * 22

    img = Image.new("RGB", (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)

    draw_dot_grid(draw, 0, 0, W, H, spacing=20, color=(255, 255, 255), alpha=6)

    # Top accent — violet/blue for merge
    draw_gradient_h(draw, 0, 0, W, 4, VIOLET_DIM, VIOLET)
    for y_line in range(4, 25):
        t = (y_line - 4) / 21
        alpha = (1 - t) * 0.07
        c = lerp_color(BG_DARK, VIOLET, alpha)
        draw.line([(0, y_line), (W, y_line)], fill=c)

    y = 30

    # Header
    draw.text((PAD + 2, y + 2), "МЕРЖ", fill=(5, 5, 8), font=fonts["hero"])
    draw.text((PAD, y), "МЕРЖ", fill=VIOLET, font=fonts["hero"])

    # Commit count badge
    count_text = f"{commit_count}"
    badge_w = int(text_width(fonts["num_lg"], count_text)) + 20
    badge_x = W - PAD - badge_w - 60
    draw_rounded_rect(draw, (badge_x, y + 2, badge_x + badge_w, y + 34), radius=17,
                      fill=VIOLET_DIM, outline=VIOLET)
    draw.text((badge_x + 10, y + 5), count_text, fill=TEXT_PRIMARY, font=fonts["num_lg"])

    # "коммитов" label
    plural = "коммит" if commit_count == 1 else "коммитов" if commit_count > 4 else "коммита"
    draw.text((badge_x + badge_w + 8, y + 12), plural, fill=TEXT_MUTED, font=fonts["caption"])

    y += 44

    # Branch name in a pill
    branch_short = branch.replace("claude/", "")
    branch_w = int(text_width(fonts["mono"], branch_short)) + 20
    draw_rounded_rect(draw, (PAD, y, PAD + branch_w, y + 26), radius=13,
                      fill=BG_ELEVATED, outline=BORDER)
    draw.text((PAD + 10, y + 5), branch_short, fill=SKY, font=fonts["mono"])

    # Arrow → main
    arrow_x = PAD + branch_w + 10
    draw.text((arrow_x, y + 3), "→", fill=TEXT_MUTED, font=fonts["heading"])
    draw.text((arrow_x + 20, y + 5), "main", fill=EMERALD, font=fonts["mono"])

    y += 40

    # Separator
    draw_gold_separator(draw, PAD, y, W - PAD)
    y += 14

    # Commit list
    for i, c in enumerate(commits[:5]):
        label = c[:52] + "…" if len(c) > 52 else c
        is_last = (i == min(len(commits), 5) - 1)
        connector = "└" if is_last else "├"
        draw.text((PAD + 4, y - 1), connector, fill=BORDER_LIGHT, font=fonts["body"])
        draw.text((PAD + 18, y), label, fill=TEXT_SECONDARY, font=fonts["caption"])
        y += 22

    y += 12

    # Stats bar at bottom
    stats_h = 44
    draw_rounded_rect(draw, (PAD, y, W - PAD, y + stats_h), radius=12, fill=BG_CARD, outline=BORDER)

    sx = PAD + 14
    sy = y + 14

    # File type dots
    if file_tags:
        for tag in file_tags.strip().split():
            if ":" in tag:
                key, val = tag.split(":", 1)
                color = {"py": SKY, "ts": EMERALD, "ci": AMBER}.get(key, TEXT_MUTED)
                draw.ellipse((sx, sy + 1, sx + 7, sy + 8), fill=color)
                draw.text((sx + 10, sy - 2), f"{val} {key}", fill=TEXT_SECONDARY, font=fonts["mono_sm"])
                sx += int(text_width(fonts["mono_sm"], f"{val} {key}")) + 20

    # Diff stats on right
    if files_stat and files_stat != "нет изменений":
        fsw = text_width(fonts["mono_sm"], files_stat[:40])
        draw.text((W - PAD - 14 - fsw, sy - 2), files_stat[:40], fill=TEXT_MUTED, font=fonts["mono_sm"])

    y += stats_h + 14

    # Footer
    footer = "→ деплой запускается..."
    fw = text_width(fonts["caption"], footer)
    draw.text(((W - fw) / 2, y - 4), footer, fill=TEXT_DIM, font=fonts["caption"])

    # Bottom accent
    draw_gradient_h(draw, W // 4, H - 3, 3 * W // 4, H - 1, BG_DARK, VIOLET_DIM)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ─── Telegram API ────────────────────────────────────────────────────────

def send_photo(token: str, chat_id: str, photo_bytes: bytes, caption: str = "") -> bool:
    boundary = "----DeployNotifyBoundary" + str(int(time.time()))

    body = b""
    body += f"--{boundary}\r\n".encode()
    body += b"Content-Disposition: form-data; name=\"chat_id\"\r\n\r\n"
    body += f"{chat_id}\r\n".encode()

    if caption:
        body += f"--{boundary}\r\n".encode()
        body += b"Content-Disposition: form-data; name=\"caption\"\r\n\r\n"
        body += f"{caption}\r\n".encode()
        body += f"--{boundary}\r\n".encode()
        body += b"Content-Disposition: form-data; name=\"parse_mode\"\r\n\r\n"
        body += b"HTML\r\n"

    body += f"--{boundary}\r\n".encode()
    body += b"Content-Disposition: form-data; name=\"photo\"; filename=\"notification.png\"\r\n"
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
    parser.add_argument("--mode", default="deploy", choices=["deploy", "merge"])
    parser.add_argument("--chat-id", required=True)

    # Deploy args
    parser.add_argument("--old-commit", default="HEAD~1")
    parser.add_argument("--new-commit", default="HEAD")
    parser.add_argument("--deploy-start", type=int, default=0)
    parser.add_argument("--commit-url", default="")
    parser.add_argument("--logs-url", default="")

    # Merge args
    parser.add_argument("--branch", default="")
    parser.add_argument("--commit-count", type=int, default=0)
    parser.add_argument("--commits", default="")
    parser.add_argument("--file-tags", default="")
    parser.add_argument("--files-stat", default="")
    parser.add_argument("--insertions", type=int, default=0)
    parser.add_argument("--deletions", type=int, default=0)

    args = parser.parse_args()

    token = read_env("BOT_TOKEN")
    if not token:
        token = os.environ.get("BOT_TOKEN", "")
    if not token:
        print("ERROR: BOT_TOKEN not found")
        return

    if args.mode == "deploy":
        deploy_secs = int(time.time()) - args.deploy_start if args.deploy_start else 0

        print("Collecting metrics...")
        metrics = collect_metrics(args.old_commit, args.new_commit)

        print("Generating deploy card...")
        png_data = build_deploy_card(metrics, deploy_secs, args.commit_url, args.logs_url)

        caption = f'<a href="{args.commit_url}">коммит {metrics["sha"]}</a>'
        if args.logs_url:
            caption += f'  ·  <a href="{args.logs_url}">логи CI</a>'

    elif args.mode == "merge":
        commit_list = [c.strip() for c in args.commits.split("\n") if c.strip()]

        print("Generating merge card...")
        png_data = build_merge_card(
            branch=args.branch,
            commit_count=args.commit_count,
            commits=commit_list,
            file_tags=args.file_tags,
            files_stat=args.files_stat,
            insertions=args.insertions,
            deletions=args.deletions,
        )
        caption = ""

    # Save debug copy
    debug_path = Path("/tmp/notification_card.png")
    debug_path.write_bytes(png_data)
    print(f"Card saved to {debug_path} ({len(png_data)} bytes)")

    print("Sending notification...")
    ok = send_photo(token, args.chat_id, png_data, caption)
    print(f"{'Sent!' if ok else 'FAILED'}")


if __name__ == "__main__":
    main()

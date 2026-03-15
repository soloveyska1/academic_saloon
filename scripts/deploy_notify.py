#!/usr/bin/env python3
"""
Art-level image notifications for Academic Saloon.

Generates stunning PNG cards with:
- Deep space nebula backgrounds with bokeh particles
- Frosted glass cards with edge highlights
- Glowing circular health gauge
- Aurora flow lines
- Each card is unique (random seed)

Usage:
    python3 scripts/deploy_notify.py --chat-id ID --old-commit SHA --new-commit SHA
    python3 scripts/deploy_notify.py --mode merge --chat-id ID ...
"""

import argparse
import io
import math
import os
import random
import re
import subprocess
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# ─── Config ──────────────────────────────────────────────────────────────

PROJECT_DIR = Path.home() / "academic_saloon"
ENV_FILE = PROJECT_DIR / ".env"
DIST_DIR = Path("/var/www/academic_saloon/dist/assets")
DOMAIN = "academic-saloon.duckdns.org"
FONTS_DIR = Path(__file__).parent / "fonts"

# ─── Palette ─────────────────────────────────────────────────────────────

GOLD = (212, 175, 55)
GOLD_LIGHT = (245, 210, 100)
GOLD_DIM = (140, 115, 35)
EMERALD = (16, 185, 129)
EMERALD_LIGHT = (52, 211, 153)
SKY = (56, 189, 248)
ROSE = (244, 63, 94)
ROSE_DIM = (140, 35, 50)
AMBER = (245, 158, 11)
VIOLET = (139, 92, 246)
VIOLET_LIGHT = (167, 139, 250)
VIOLET_DIM = (80, 50, 150)

TEXT_PRIMARY = (240, 240, 248)
TEXT_SECONDARY = (160, 160, 180)
TEXT_MUTED = (100, 100, 125)
TEXT_DIM = (70, 70, 95)
BG_DARK = (6, 5, 10)


def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(min(len(c1), len(c2))))


# ─── Fonts ───────────────────────────────────────────────────────────────

def load_fonts():
    f = {}
    try:
        f["hero"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Bold.ttf"), 36)
        f["title"] = ImageFont.truetype(str(FONTS_DIR / "Inter-SemiBold.ttf"), 17)
        f["body"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Medium.ttf"), 13)
        f["cap"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Regular.ttf"), 11)
        f["tiny"] = ImageFont.truetype(str(FONTS_DIR / "Inter-Regular.ttf"), 10)
        f["num_xl"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Bold.ttf"), 44)
        f["num_lg"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Bold.ttf"), 26)
        f["num"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Medium.ttf"), 14)
        f["num_sm"] = ImageFont.truetype(str(FONTS_DIR / "JetBrainsMono-Regular.ttf"), 11)
    except OSError:
        d = ImageFont.load_default()
        for k in ["hero","title","body","cap","tiny","num_xl","num_lg","num","num_sm"]:
            f[k] = d
    return f


# ─── Helpers ─────────────────────────────────────────────────────────────

def sh(cmd, default=""):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return r.stdout.strip() or default
    except Exception:
        return default


def read_env(key):
    try:
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip().strip("'\"")
    except Exception:
        pass
    return ""


def human_uptime(text):
    parts = []
    for m in re.finditer(r'(\d+)\s+(year|month|week|day|hour|minute)', text):
        n, unit = int(m.group(1)), m.group(2)
        labels = {'year': 'г', 'month': 'мес', 'week': 'н', 'day': 'д', 'hour': 'ч', 'minute': 'м'}
        parts.append(f"{n}{labels.get(unit, unit[0])}")
    return " ".join(parts[:3]) or text


# ─── Art Engine ──────────────────────────────────────────────────────────

def make_nebula_bg(W, H, palette="gold"):
    """Create deep-space nebula background with numpy (fast) or fallback."""
    if HAS_NUMPY:
        return _nebula_numpy(W, H, palette)
    return _nebula_fallback(W, H, palette)


def _nebula_numpy(W, H, palette):
    px = np.zeros((H, W, 3), dtype=np.float64)
    ys, xs = np.mgrid[0:H, 0:W]

    if palette == "gold":
        # Deep indigo center
        cx1, cy1 = W * 0.3, H * 0.5
        d1 = np.sqrt((xs - cx1)**2 + (ys - cy1)**2) / (W * 0.55)
        px[:,:,0] += 22 * np.exp(-np.clip(d1, 0, 5) * 1.8)
        px[:,:,1] += 10 * np.exp(-np.clip(d1, 0, 5) * 2.2)
        px[:,:,2] += 50 * np.exp(-np.clip(d1, 0, 5) * 1.4)
        # Warm gold top-right
        cx2, cy2 = W * 0.8, H * 0.15
        d2 = np.sqrt((xs - cx2)**2 + (ys - cy2)**2) / (W * 0.4)
        px[:,:,0] += 45 * np.exp(-np.clip(d2, 0, 5) * 2.0)
        px[:,:,1] += 30 * np.exp(-np.clip(d2, 0, 5) * 2.3)
        px[:,:,2] += 5 * np.exp(-np.clip(d2, 0, 5) * 3.0)
        # Teal bottom-left
        cx3, cy3 = W * 0.1, H * 0.85
        d3 = np.sqrt((xs - cx3)**2 + (ys - cy3)**2) / (W * 0.35)
        px[:,:,0] += 5 * np.exp(-np.clip(d3, 0, 5) * 2.5)
        px[:,:,1] += 25 * np.exp(-np.clip(d3, 0, 5) * 2.0)
        px[:,:,2] += 20 * np.exp(-np.clip(d3, 0, 5) * 2.2)
    else:  # violet
        cx1, cy1 = W * 0.5, H * 0.4
        d1 = np.sqrt((xs - cx1)**2 + (ys - cy1)**2) / (W * 0.5)
        px[:,:,0] += 30 * np.exp(-np.clip(d1, 0, 5) * 1.6)
        px[:,:,1] += 12 * np.exp(-np.clip(d1, 0, 5) * 2.0)
        px[:,:,2] += 55 * np.exp(-np.clip(d1, 0, 5) * 1.3)
        # Pink accent top-right
        cx2, cy2 = W * 0.85, H * 0.2
        d2 = np.sqrt((xs - cx2)**2 + (ys - cy2)**2) / (W * 0.35)
        px[:,:,0] += 35 * np.exp(-np.clip(d2, 0, 5) * 2.0)
        px[:,:,1] += 8 * np.exp(-np.clip(d2, 0, 5) * 2.5)
        px[:,:,2] += 30 * np.exp(-np.clip(d2, 0, 5) * 2.0)
        # Blue bottom
        cx3, cy3 = W * 0.2, H * 0.9
        d3 = np.sqrt((xs - cx3)**2 + (ys - cy3)**2) / (W * 0.4)
        px[:,:,0] += 8 * np.exp(-np.clip(d3, 0, 5) * 2.5)
        px[:,:,1] += 15 * np.exp(-np.clip(d3, 0, 5) * 2.2)
        px[:,:,2] += 35 * np.exp(-np.clip(d3, 0, 5) * 1.8)

    px += [[BG_DARK]]
    # Noise texture
    noise = np.random.randint(0, 8, (H, W), dtype=np.uint8)
    for i in range(3):
        px[:,:,i] += noise

    px = np.clip(px, 0, 255).astype(np.uint8)
    return Image.fromarray(px).convert("RGBA")


def _nebula_fallback(W, H, palette):
    """Simple gradient fallback without numpy."""
    img = Image.new("RGB", (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)
    accent = GOLD if palette == "gold" else VIOLET
    for y in range(H):
        for x in range(0, W, 4):
            dx = x - W * 0.4
            dy = y - H * 0.4
            d = math.sqrt(dx*dx + dy*dy) / (W * 0.5)
            d = min(d, 1.0)
            t = math.exp(-d * 2)
            c = lerp(BG_DARK, accent, t * 0.15)
            draw.rectangle((x, y, x+3, y), fill=c)
    return img.convert("RGBA")


def add_aurora(img, W, H, colors, count=12):
    """Add flowing aurora lines."""
    aurora = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ad = ImageDraw.Draw(aurora)
    for wave in range(count):
        base_y = H * 0.15 + wave * (H * 0.06)
        phase = random.uniform(0, math.pi * 2)
        freq = random.uniform(0.005, 0.012)
        amp = random.uniform(15, 45)
        color = colors[wave % len(colors)]
        alpha_base = random.randint(5, 16)

        points = []
        for x in range(-20, W + 20, 3):
            y = base_y + amp * math.sin(x * freq + phase) + amp * 0.4 * math.sin(x * freq * 2.3 + phase * 1.7)
            points.append((x, y))

        for j in range(len(points) - 1):
            t = j / len(points)
            fade = math.sin(t * math.pi) ** 0.5
            a = max(1, int(alpha_base * fade))
            ad.line([points[j], points[j+1]], fill=(*color, a), width=1)

    aurora = aurora.filter(ImageFilter.GaussianBlur(2))
    return Image.alpha_composite(img, aurora)


def add_bokeh(img, W, H, count, size_range, alpha_range, colors):
    """Add soft bokeh particles."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for _ in range(count):
        x = random.randint(-30, W + 30)
        y = random.randint(-30, H + 30)
        r = random.randint(*size_range)
        color = random.choice(colors)
        alpha = random.randint(*alpha_range)

        sz = r * 2 + 30
        circle = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        cd = ImageDraw.Draw(circle)
        c = sz // 2
        for ring in range(r + 12, 0, -1):
            t = ring / (r + 12)
            a = int(alpha * (1 - t)**2.5)
            if a > 0:
                cd.ellipse((c-ring, c-ring, c+ring, c+ring), fill=(*color, min(255, a)))
        if r > 5:
            bright = tuple(min(255, v + 60) for v in color)
            cd.ellipse((c-r//4, c-r//4, c+r//4, c+r//4), fill=(*bright, min(255, alpha*2)))

        layer.paste(circle, (x - sz//2, y - sz//2), circle)
    return Image.alpha_composite(img, layer)


def make_glass_card(img, x, y, w, h, radius=24):
    """Create frosted glass card over background."""
    region = img.crop((x, y, x+w, y+h)).convert("RGBA")
    blurred = region.filter(ImageFilter.GaussianBlur(18))
    tint = Image.new("RGBA", (w, h), (180, 170, 200, 14))
    glass = Image.alpha_composite(blurred, tint)

    # Edge highlights
    inner = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    idraw = ImageDraw.Draw(inner)
    for i in range(6):
        a = int(10 * (1 - i/6))
        idraw.line([(radius, i), (w - radius, i)], fill=(255, 255, 255, a))
    for i in range(4):
        a = int(8 * (1 - i/4))
        idraw.line([(radius, h-1-i), (w - radius, h-1-i)], fill=(0, 0, 0, a))
    glass = Image.alpha_composite(glass, inner)

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w-1, h-1), radius=radius, fill=255)
    img.paste(glass, (x, y), mask)

    ImageDraw.Draw(img).rounded_rectangle((x, y, x+w, y+h), radius=radius,
                                           outline=(255, 255, 255, 8), width=1)
    return img


def draw_glass_metric(img, x, y, w, h, label, value, color, font_l, font_v):
    """Small frosted metric card."""
    region = img.crop((x, y, x+w, y+h)).convert("RGBA")
    blurred = region.filter(ImageFilter.GaussianBlur(5))
    tint = Image.new("RGBA", (w, h), (0, 0, 0, 22))
    glass = Image.alpha_composite(blurred, tint)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w-1, h-1), radius=10, fill=255)
    img.paste(glass, (x, y), mask)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((x, y, x+w, y+h), radius=10, outline=(*color, 18), width=1)
    d.text((x+12, y+8), label, fill=(130, 130, 155), font=font_l)
    d.text((x+12, y+22), value, fill=(*color, 240), font=font_v)


def draw_arc_gauge(img, cx, cy, radius, thickness, pct, c1, c2):
    """Circular arc gauge with glow."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    start, sweep = 135, 270

    for deg in range(sweep):
        angle = math.radians(start + deg)
        for t in range(thickness):
            r = radius - t
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            d.point((int(x), int(y)), fill=(40, 40, 55, 60))

    fill_deg = int(sweep * min(100, pct) / 100)
    for deg in range(fill_deg):
        angle = math.radians(start + deg)
        t = deg / sweep
        c = lerp(c1, c2, t)
        for tt in range(thickness):
            r = radius - tt
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            d.point((int(x), int(y)), fill=(*c, 220))

    glow = layer.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, layer)
    return img


def draw_gold_line(draw, x1, y, x2):
    """Gradient gold separator."""
    w = x2 - x1
    for i in range(w):
        t = i / w
        fade = math.sin(t * math.pi) ** 0.7
        a = int(55 * fade)
        draw.point((x1 + i, y), fill=(212, 175, 55, a))


def draw_status_dot(img, x, y, active, size=14):
    """Glowing status indicator."""
    color = EMERALD if active else ROSE
    dot = Image.new("RGBA", (size+4, size+4), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dot)
    dd.ellipse((0, 0, size+3, size+3), fill=(*color, 20))
    dd.ellipse((3, 3, size, size), fill=(*color, 190))
    dd.ellipse((5, 5, size-2, size-2), fill=(255, 255, 255, 45))
    img.paste(dot, (x, y), dot)


def draw_progress(draw, x, y, w, h, pct, color):
    """Sleek progress bar with highlight."""
    draw.rounded_rectangle((x, y, x+w, y+h), radius=h//2, fill=(30, 30, 42))
    fw = max(h, int(w * min(100, pct) / 100))
    draw.rounded_rectangle((x, y, x+fw, y+h), radius=h//2, fill=color)
    hl = tuple(min(255, c + 80) for c in color)
    draw.line([(x + h//2, y+1), (x + fw - h//2, y+1)], fill=hl)


def text_glow(img, x, y, text, color, font, blur=8, alpha=40):
    """Draw text with soft glow behind it."""
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).text((x, y), text, fill=(*color, alpha), font=font)
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    img = Image.alpha_composite(img, glow)
    text_l = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(text_l).text((x, y), text, fill=(*color, 250), font=font)
    return Image.alpha_composite(img, text_l)


# ─── Metrics ─────────────────────────────────────────────────────────────

def collect_metrics(old_commit, new_commit):
    m = {}
    os.chdir(str(PROJECT_DIR))
    m["sha"] = sh("git rev-parse --short HEAD")
    m["commit_msg"] = sh("git log -1 --format='%s'")

    diff = f"{old_commit}..{new_commit}" if old_commit != new_commit else "HEAD~1..HEAD"
    m["py"] = int(sh(f"git diff --name-only {diff} 2>/dev/null | grep -c '\\.py$'") or "0")
    m["ts"] = int(sh(f"git diff --name-only {diff} 2>/dev/null | grep -cE '\\.(tsx?|css)$'") or "0")
    m["yml"] = int(sh(f"git diff --name-only {diff} 2>/dev/null | grep -c '\\.yml$'") or "0")
    m["total_files"] = int(sh(f"git diff --name-only {diff} 2>/dev/null | wc -l") or "0")

    stat = sh(f"git diff --shortstat {diff} 2>/dev/null")
    ins = re.search(r'(\d+) insertion', stat)
    dels = re.search(r'(\d+) deletion', stat)
    m["insertions"] = int(ins.group(1)) if ins else 0
    m["deletions"] = int(dels.group(1)) if dels else 0

    commits = sh(f"git log --oneline --no-merges -5 {diff} --format='%s' 2>/dev/null")
    m["commits"] = [c.strip() for c in commits.splitlines() if c.strip()][:5]
    m["commit_count"] = int(sh(f"git log --oneline --no-merges {diff} 2>/dev/null | wc -l") or "0")
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

    ssl_out = sh(
        f"echo | openssl s_client -servername {DOMAIN} -connect {DOMAIN}:443 2>/dev/null"
        f" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2"
    )
    try:
        from email.utils import parsedate_to_datetime
        exp = parsedate_to_datetime(ssl_out.replace("GMT", "+0000"))
        m["ssl_days"] = (exp - datetime.now(exp.tzinfo)).days
    except Exception:
        ssl_ts = sh(f"date -d '{ssl_out}' +%s 2>/dev/null")
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


# ─── Deploy Card ─────────────────────────────────────────────────────────

def build_deploy_card(m, deploy_secs, commit_url, logs_url):
    fonts = load_fonts()
    W, H = 820, 590
    PAD = 40

    # Background
    img = make_nebula_bg(W, H, "gold")
    aurora_colors = [GOLD, GOLD_DIM, EMERALD, VIOLET]
    img = add_aurora(img, W, H, aurora_colors)
    img = add_bokeh(img, W, H, 15, (20, 50), (4, 10), [GOLD, GOLD_DIM, VIOLET])
    img = add_bokeh(img, W, H, 35, (2, 10), (15, 45),
                    [GOLD, GOLD_LIGHT, EMERALD, SKY, (255, 255, 255)])

    # Glass card
    cx, cy = PAD, 60
    cw, ch = W - 2*PAD, H - 120
    img = make_glass_card(img, cx, cy, cw, ch)

    # Deploy number (ethereal)
    num_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(num_l).text((W - 175, 10), f"#{m['deploy_num']}", fill=(*GOLD, 30), font=fonts["num_xl"])
    num_g = num_l.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, num_g)
    img = Image.alpha_composite(img, num_l)

    # Title with glow
    tx, ty = cx + 30, cy + 22
    img = text_glow(img, tx, ty, "ДЕПЛОЙ", GOLD, fonts["hero"])
    ty += 48

    draw = ImageDraw.Draw(img)
    draw_gold_line(draw, tx, ty, tx + cw - 60)
    ty += 14

    # Commit message
    msg = m["commit_msg"][:60]
    draw.text((tx, ty), msg, fill=(*TEXT_PRIMARY, 230), font=fonts["title"])
    ty += 28

    for i, c in enumerate(m["commits"][:4]):
        label = c[:52] + "…" if len(c) > 52 else c
        conn = "└" if i == len(m["commits"][:4]) - 1 else "├"
        draw.text((tx + 2, ty), conn, fill=(*TEXT_MUTED, 100), font=fonts["body"])
        draw.text((tx + 18, ty), label, fill=(*TEXT_SECONDARY, 180), font=fonts["cap"])
        ty += 19
    ty += 14

    # Metrics row
    mw, mh, gap = 105, 48, 10
    mx = tx
    metrics = [
        ("ФАЙЛОВ", str(m["total_files"]), GOLD),
        ("ДОБАВЛЕНО", f"+{m['insertions']}", EMERALD),
        ("УДАЛЕНО", f"−{m['deletions']}", ROSE),
        ("БАНДЛ", f"{m['bundle_kb']/1024:.1f}MB" if m["bundle_kb"] > 1024 else f"{m['bundle_kb']}KB", SKY),
    ]
    for label, value, color in metrics:
        w = mw + (10 if label in ("ДОБАВЛЕНО", "БАНДЛ") else 0)
        draw_glass_metric(img, mx, ty, w, mh, label, value, color, fonts["tiny"], fonts["num"])
        draw = ImageDraw.Draw(img)
        mx += w + gap
    ty += mh + 16

    # Services
    services = [
        ("Бот", m["bot_active"]), ("API", m["api_ok"]), ("Nginx", m["nginx_active"]),
        ("PG", m["pg_active"]), ("Redis", m["redis_active"]),
    ]
    sx = tx
    for name, active in services:
        draw_status_dot(img, sx, ty, active)
        draw = ImageDraw.Draw(img)
        draw.text((sx + 18, ty + 1), name, fill=TEXT_SECONDARY, font=fonts["cap"])
        sx += int(fonts["cap"].getlength(name)) + 34
    ty += 24

    # Progress bars
    bar_w = 170
    draw.text((tx, ty + 1), "Диск", fill=TEXT_MUTED, font=fonts["cap"])
    draw.text((tx + 35, ty + 1), f"{m['disk_pct']}%", fill=TEXT_SECONDARY, font=fonts["cap"])
    disk_c = EMERALD if m["disk_pct"] < 70 else (AMBER if m["disk_pct"] < 85 else ROSE)
    draw_progress(draw, tx + 72, ty + 2, bar_w, 7, m["disk_pct"], disk_c)

    rx = tx + bar_w + 110
    draw.text((rx, ty + 1), "RAM", fill=TEXT_MUTED, font=fonts["cap"])
    draw.text((rx + 30, ty + 1), f"{m['ram_pct']}%", fill=TEXT_SECONDARY, font=fonts["cap"])
    ram_c = EMERALD if m["ram_pct"] < 70 else (AMBER if m["ram_pct"] < 85 else ROSE)
    draw_progress(draw, rx + 65, ty + 2, bar_w, 7, m["ram_pct"], ram_c)

    # Health gauge
    gcx = cx + cw - 70
    gcy = cy + ch - 80
    if m["health"] >= 90:
        hc1, hc2 = (10, 120, 80), EMERALD_LIGHT
    elif m["health"] >= 60:
        hc1, hc2 = (160, 100, 10), AMBER
    else:
        hc1, hc2 = ROSE_DIM, ROSE
    img = draw_arc_gauge(img, gcx, gcy, 42, 5, m["health"], hc1, hc2)
    draw = ImageDraw.Draw(img)
    ht = str(m["health"])
    hw = fonts["num_lg"].getlength(ht)
    draw.text((gcx - hw/2, gcy - 14), ht, fill=TEXT_PRIMARY, font=fonts["num_lg"])
    lw = fonts["tiny"].getlength("здоровье")
    draw.text((gcx - lw/2, gcy + 13), "здоровье", fill=TEXT_MUTED, font=fonts["tiny"])

    # Footer
    mins = deploy_secs // 60
    secs = deploy_secs % 60
    time_str = f"{mins}м {secs}с" if mins else f"{secs}с"
    footer = f"Academic Saloon  ·  {m['sha']}  ·  {datetime.now().strftime('%d.%m.%Y %H:%M')}  ·  {time_str}"
    fw = fonts["cap"].getlength(footer)
    draw.text(((W - fw)/2, H - 35), footer, fill=TEXT_DIM, font=fonts["cap"])

    # Bottom accent
    for i in range(W // 4, 3 * W // 4):
        t = (i - W//4) / (W//2)
        a = int(25 * math.sin(t * math.pi))
        draw.point((i, H - 2), fill=(*GOLD_DIM, a))

    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ─── Merge Card ──────────────────────────────────────────────────────────

def build_merge_card(branch, commit_count, commits, file_tags, files_stat, **kw):
    fonts = load_fonts()
    W = 720
    n = min(len(commits), 5)
    H = 280 + n * 21

    img = make_nebula_bg(W, H, "violet")
    img = add_aurora(img, W, H, [VIOLET, VIOLET_DIM, SKY, ROSE], count=8)
    img = add_bokeh(img, W, H, 10, (15, 40), (3, 8), [VIOLET, VIOLET_DIM, (200, 150, 255)])
    img = add_bokeh(img, W, H, 25, (2, 8), (12, 40),
                    [VIOLET, VIOLET_LIGHT, SKY, (255, 255, 255)])

    cx, cy = 32, 28
    cw, ch = W - 64, H - 68
    img = make_glass_card(img, cx, cy, cw, ch, radius=20)

    tx, ty = cx + 28, cy + 20
    img = text_glow(img, tx, ty, "МЕРЖ", VIOLET, fonts["hero"])

    # Count badge
    ct = str(commit_count)
    badge_w = int(fonts["num_lg"].getlength(ct)) + 22
    bx = W - 64 - 28 - badge_w - 50
    badge_l = Image.new("RGBA", img.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge_l)
    bd.rounded_rectangle((bx, ty + 2, bx + badge_w, ty + 34), radius=17,
                         fill=(*VIOLET_DIM, 180), outline=(*VIOLET, 100))
    bd.text((bx + 11, ty + 4), ct, fill=TEXT_PRIMARY, font=fonts["num_lg"])
    img = Image.alpha_composite(img, badge_l)

    draw = ImageDraw.Draw(img)
    plural = "коммит" if commit_count == 1 else "коммитов" if commit_count > 4 else "коммита"
    draw.text((bx + badge_w + 8, ty + 12), plural, fill=TEXT_MUTED, font=fonts["cap"])

    ty += 46

    # Branch pill
    br = branch.replace("claude/", "")
    bw = int(fonts["num"].getlength(br)) + 20
    draw.rounded_rectangle((tx, ty, tx + bw, ty + 24), radius=12,
                           fill=(30, 30, 45, 180), outline=(80, 80, 110, 100))
    draw.text((tx + 10, ty + 4), br, fill=SKY, font=fonts["num"])
    draw.text((tx + bw + 8, ty + 3), "→", fill=TEXT_MUTED, font=fonts["title"])
    draw.text((tx + bw + 25, ty + 5), "main", fill=EMERALD, font=fonts["num"])
    ty += 36

    draw_gold_line(draw, tx, ty, tx + cw - 56)
    ty += 12

    for i, c in enumerate(commits[:5]):
        label = c[:50] + "…" if len(c) > 50 else c
        conn = "└" if i == min(len(commits), 5) - 1 else "├"
        draw.text((tx + 2, ty), conn, fill=(*TEXT_MUTED, 90), font=fonts["body"])
        draw.text((tx + 18, ty), label, fill=(*TEXT_SECONDARY, 180), font=fonts["cap"])
        ty += 21
    ty += 14

    # Stats bar
    if file_tags:
        sx = tx
        for tag in file_tags.strip().split():
            if ":" in tag:
                key, val = tag.split(":", 1)
                color = {"py": SKY, "ts": EMERALD, "ci": AMBER}.get(key, TEXT_MUTED)
                draw.ellipse((sx, ty+2, sx+6, ty+8), fill=color)
                draw.text((sx + 9, ty), f"{val} {key}", fill=TEXT_SECONDARY, font=fonts["num_sm"])
                sx += int(fonts["num_sm"].getlength(f"{val} {key}")) + 18

    # Footer
    footer = "→ деплой запускается..."
    fw = fonts["cap"].getlength(footer)
    draw.text(((W - fw)/2, H - 30), footer, fill=TEXT_DIM, font=fonts["cap"])

    for i in range(W//4, 3*W//4):
        t = (i - W//4) / (W//2)
        a = int(20 * math.sin(t * math.pi))
        draw.point((i, H - 2), fill=(*VIOLET_DIM, a))

    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ─── Telegram API ────────────────────────────────────────────────────────

def send_photo(token, chat_id, photo_bytes, caption=""):
    boundary = "----ArtNotify" + str(int(time.time()))
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
    body += b"Content-Disposition: form-data; name=\"photo\"; filename=\"card.png\"\r\n"
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
        print(f"Failed: {e}")
        return False


# ─── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", default="deploy", choices=["deploy", "merge"])
    parser.add_argument("--chat-id", required=True)
    parser.add_argument("--old-commit", default="HEAD~1")
    parser.add_argument("--new-commit", default="HEAD")
    parser.add_argument("--deploy-start", type=int, default=0)
    parser.add_argument("--commit-url", default="")
    parser.add_argument("--logs-url", default="")
    parser.add_argument("--branch", default="")
    parser.add_argument("--commit-count", type=int, default=0)
    parser.add_argument("--commits", default="")
    parser.add_argument("--file-tags", default="")
    parser.add_argument("--files-stat", default="")
    parser.add_argument("--insertions", type=int, default=0)
    parser.add_argument("--deletions", type=int, default=0)
    args = parser.parse_args()

    token = read_env("BOT_TOKEN") or os.environ.get("BOT_TOKEN", "")
    if not token:
        print("ERROR: BOT_TOKEN not found")
        return

    if args.mode == "deploy":
        deploy_secs = int(time.time()) - args.deploy_start if args.deploy_start else 0
        print("Collecting metrics...")
        metrics = collect_metrics(args.old_commit, args.new_commit)
        print("Generating deploy card...")
        png = build_deploy_card(metrics, deploy_secs, args.commit_url, args.logs_url)
        caption = f'<a href="{args.commit_url}">коммит {metrics["sha"]}</a>'
        if args.logs_url:
            caption += f'  ·  <a href="{args.logs_url}">логи CI</a>'
    else:
        commit_list = [c.strip() for c in args.commits.split("\n") if c.strip()]
        print("Generating merge card...")
        png = build_merge_card(
            args.branch, args.commit_count, commit_list,
            args.file_tags, args.files_stat,
        )
        caption = ""

    Path("/tmp/notification_card.png").write_bytes(png)
    print(f"Card: {len(png)} bytes")

    print("Sending...")
    ok = send_photo(token, args.chat_id, png, caption)
    print("Sent!" if ok else "FAILED")


if __name__ == "__main__":
    main()

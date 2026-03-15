#!/usr/bin/env python3
"""
Premium deploy notification for Academic Saloon.

Sends a beautifully formatted Telegram message with real-time
server metrics after a successful deploy.

Usage:
    python3 scripts/deploy_notify.py [--chat-id ID] [--old-commit SHA] [--new-commit SHA]

Reads BOT_TOKEN from ~/academic_saloon/.env
"""

import argparse
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


# ─── Config ──────────────────────────────────────────────────────────────

PROJECT_DIR = Path.home() / "academic_saloon"
ENV_FILE = PROJECT_DIR / ".env"
DIST_DIR = Path("/var/www/academic_saloon/dist/assets")
DOMAIN = "academic-saloon.duckdns.org"


# ─── Helpers ─────────────────────────────────────────────────────────────

def sh(cmd: str, default: str = "") -> str:
    """Run shell command and return stdout, or default on failure."""
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return r.stdout.strip() or default
    except Exception:
        return default


def read_env(key: str) -> str:
    """Read a key from .env file."""
    try:
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith(f"{key}="):
                val = line.split("=", 1)[1].strip().strip("'\"")
                return val
    except Exception:
        pass
    return ""


def gauge(pct: int, length: int = 10) -> str:
    """Create a visual gauge bar: ▰▰▰▰▱▱▱▱▱▱"""
    pct = max(0, min(100, pct))
    filled = round(pct * length / 100)
    return "▰" * filled + "▱" * (length - filled)


def human_uptime(text: str) -> str:
    """Convert 'up 14 weeks, 1 day, 19 hours, 55 minutes' to '14н 1д 19ч'."""
    parts = []
    for m in re.finditer(r'(\d+)\s+(year|month|week|day|hour|minute)', text):
        n, unit = int(m.group(1)), m.group(2)
        labels = {
            'year': 'г', 'month': 'мес', 'week': 'н',
            'day': 'д', 'hour': 'ч', 'minute': 'м',
        }
        parts.append(f"{n}{labels.get(unit, unit[0])}")
    return " ".join(parts[:3]) or text


def status_dot(service_name: str) -> str:
    """Check if systemd service is active, return ● or ○."""
    r = sh(f"systemctl is-active {service_name} 2>/dev/null")
    return "●" if r == "active" else "○"


def send_telegram(token: str, chat_id: str, text: str) -> bool:
    """Send HTML message via Telegram Bot API."""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "parse_mode": "HTML",
        "text": text,
        "disable_web_page_preview": "true",
    }).encode()
    try:
        req = urllib.request.Request(url, data=data)
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status == 200
    except Exception as e:
        print(f"Failed to send: {e}")
        return False


# ─── Metrics ─────────────────────────────────────────────────────────────

def collect_metrics(old_commit: str, new_commit: str) -> dict:
    """Collect all server and git metrics."""
    m = {}

    # Git info
    os.chdir(str(PROJECT_DIR))
    m["sha"] = sh("git rev-parse --short HEAD")
    m["commit_msg"] = sh("git log -1 --format='%s'")

    # Diff stats
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

    # Recent commits
    commits = sh(f"git log --oneline --no-merges -5 {diff_range} --format='%s' 2>/dev/null")
    m["commits"] = [c.strip() for c in commits.splitlines() if c.strip()][:5]
    m["commit_count"] = int(sh(f"git log --oneline --no-merges {diff_range} 2>/dev/null | wc -l") or "0")
    m["deploy_num"] = int(sh("git log --oneline main 2>/dev/null | wc -l") or "0")

    # System
    m["disk_pct"] = int(sh("df -h / | tail -1 | awk '{print $5}' | tr -d '%'") or "0")
    m["disk_used"] = sh("df -h / | tail -1 | awk '{print $3}'")
    m["disk_total"] = sh("df -h / | tail -1 | awk '{print $2}'")

    m["ram_pct"] = int(sh("free | grep Mem | awk '{printf(\"%.0f\", $3/$2*100)}'") or "0")
    m["ram_used"] = sh("free -h | grep Mem | awk '{print $3}'")
    m["ram_total"] = sh("free -h | grep Mem | awk '{print $2}'")

    m["uptime"] = human_uptime(sh("uptime -p"))
    m["load"] = sh("cat /proc/loadavg | awk '{print $1}'")

    # Services
    m["bot"] = status_dot("saloon-bot")
    m["nginx"] = status_dot("nginx")
    m["pg"] = status_dot("postgresql")
    m["redis"] = "●" if sh("systemctl is-active redis-server 2>/dev/null") == "active" or sh("systemctl is-active redis 2>/dev/null") == "active" else "○"

    # Bot process RAM
    bot_ram = sh("ps aux | grep -E 'python.*main\\.py|uvicorn' | grep -v grep | awk '{sum+=$6} END {printf(\"%.0f\", sum/1024)}'")
    m["bot_ram"] = int(bot_ram) if bot_ram else 0

    # API latency
    api_time = sh("curl -s -o /dev/null -w '%{time_total}' --max-time 3 http://localhost:8000/health 2>/dev/null")
    try:
        ms = int(float(api_time) * 1000)
        m["api_ms"] = ms
        m["api_ok"] = True
    except (ValueError, TypeError):
        m["api_ms"] = 0
        m["api_ok"] = False

    # Bundle size
    try:
        bundle_kb = int(sh(f"du -sk {DIST_DIR} 2>/dev/null | awk '{{print $1}}'") or "0")
        m["bundle_kb"] = bundle_kb
    except ValueError:
        m["bundle_kb"] = 0

    # SSL
    ssl_output = sh(
        f"echo | openssl s_client -servername {DOMAIN} -connect {DOMAIN}:443 2>/dev/null"
        f" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2"
    )
    try:
        from email.utils import parsedate_to_datetime
        exp_dt = parsedate_to_datetime(ssl_output.replace("GMT", "+0000"))
        m["ssl_days"] = (exp_dt - datetime.now(exp_dt.tzinfo)).days
    except Exception:
        # Fallback: try date command
        ssl_ts = sh(f"date -d '{ssl_output}' +%s 2>/dev/null")
        if ssl_ts:
            m["ssl_days"] = (int(ssl_ts) - int(time.time())) // 86400
        else:
            m["ssl_days"] = -1

    # Health score
    health = 100
    if m["bot"] == "○":
        health -= 35
    if not m["api_ok"]:
        health -= 20
    if m["nginx"] == "○":
        health -= 20
    if m["pg"] == "○":
        health -= 20
    if m["disk_pct"] > 85:
        health -= 10
    if m["ram_pct"] > 85:
        health -= 10
    m["health"] = max(0, health)

    return m


# ─── Message Builder ─────────────────────────────────────────────────────

def build_message(m: dict, deploy_secs: int, commit_url: str, logs_url: str) -> str:
    """Build the beautiful deploy notification message."""

    # Header
    mins = deploy_secs // 60
    secs = deploy_secs % 60

    # Time of day
    hour = datetime.now().hour
    if 6 <= hour < 12:
        tod = "Утренний"
    elif 12 <= hour < 18:
        tod = "Дневной"
    elif 18 <= hour < 23:
        tod = "Вечерний"
    else:
        tod = "Ночной"

    # Health emoji
    if m["health"] >= 95:
        health_icon = "♥"
    elif m["health"] >= 70:
        health_icon = "♡"
    else:
        health_icon = "!"

    # File tags
    tags = []
    if m["py"]:
        tags.append(f"py:{m['py']}")
    if m["ts"]:
        tags.append(f"ts:{m['ts']}")
    if m["yml"]:
        tags.append(f"ci:{m['yml']}")
    file_info = "  ".join(tags)

    diff_info = ""
    if m["insertions"] or m["deletions"]:
        diff_info = f"+{m['insertions']}  −{m['deletions']}"

    # Commit list
    commit_lines = ""
    for c in m["commits"]:
        # Trim to fit nicely
        label = c[:55] + "…" if len(c) > 55 else c
        commit_lines += f"\n    ▸ {label}"

    if not commit_lines:
        commit_lines = f"\n    ▸ {m['commit_msg'][:55]}"

    # API info
    api_label = f"{m['api_ms']}ms" if m["api_ok"] else "—"
    api_dot = "●" if m["api_ok"] else "○"

    # Bundle
    if m["bundle_kb"] > 1024:
        bundle_str = f"{m['bundle_kb'] / 1024:.1f} MB"
    else:
        bundle_str = f"{m['bundle_kb']} KB"

    # SSL
    ssl_str = f"{m['ssl_days']}д" if m["ssl_days"] > 0 else "?"

    # Gauges
    disk_bar = gauge(m["disk_pct"])
    ram_bar = gauge(m["ram_pct"])

    # ─── Compose ─────────────────────────────────────────────────────

    msg = f"""<b>● ДЕПЛОЙ ЗАВЕРШЁН</b>

<i>{m['commit_msg'][:70]}</i>
{commit_lines}

<code>{file_info}    {m['total_files']} файлов    {diff_info}</code>

<pre>
┌───────────────────────────────────┐
│                                   │
│  Бот     {m['bot']}  {m['bot_ram']:>3} MB              │
│  API     {api_dot}  {api_label:>5}               │
│  Nginx   {m['nginx']}                       │
│  PG      {m['pg']}     Redis  {m['redis']}           │
│                                   │
│  Диск    {disk_bar}  {m['disk_pct']:>2}%       │
│          {m['disk_used']}/{m['disk_total']}                 │
│  RAM     {ram_bar}  {m['ram_pct']:>2}%       │
│          {m['ram_used']}/{m['ram_total']}                 │
│                                   │
│  Бандл   {bundle_str:<10}  SSL  {ssl_str:<5}   │
│  Аптайм  {m['uptime']:<24}│
│                                   │
│  {health_icon} Здоровье  {m['health']}/100               │
└───────────────────────────────────┘
</pre>

<code>{tod} деплой  ·  {mins}м {secs}с  ·  #{m['deploy_num']}</code>

<a href="{commit_url}">коммит {m['sha']}</a>  ·  <a href="{logs_url}">логи CI</a>"""

    return msg


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

    print("Building message...")
    msg = build_message(metrics, deploy_secs, args.commit_url, args.logs_url)

    print("Sending notification...")
    ok = send_telegram(token, args.chat_id, msg)
    print(f"{'Sent!' if ok else 'FAILED'}")

    # Print message for debugging
    print("\n--- Message ---")
    print(msg)


if __name__ == "__main__":
    main()

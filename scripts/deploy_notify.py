#!/usr/bin/env python3
"""
Premium text notifications for Academic Saloon.

Clean, fast, no images — pure HTML text via Telegram sendMessage API.
No PIL, no numpy, no fonts needed.

Usage:
    python3 scripts/deploy_notify.py --chat-id ID --old-commit SHA --new-commit SHA
    python3 scripts/deploy_notify.py --mode merge --chat-id ID ...
"""

import argparse
import json
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


def sh(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL, timeout=10).decode().strip()
    except Exception:
        return ""


def read_env(key):
    try:
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return ""


def human_uptime(raw):
    if not raw:
        return "—"
    return raw.replace("up ", "").strip()


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

    m["disk_pct"] = int(sh("df -h / | tail -1 | awk '{print $5}' | tr -d '%'") or "0")
    m["ram_pct"] = int(sh("free | grep Mem | awk '{printf(\"%.0f\", $3/$2*100)}'") or "0")
    m["uptime"] = human_uptime(sh("uptime -p"))
    return m


# ─── Format helpers ──────────────────────────────────────────────────────

def bar(pct, length=10):
    filled = round(pct / 100 * length)
    return "█" * filled + "░" * (length - filled)


def file_tags(m):
    tags = []
    if m.get("py", 0) > 0:
        tags.append(f'py:{m["py"]}')
    if m.get("ts", 0) > 0:
        tags.append(f'ts:{m["ts"]}')
    if m.get("yml", 0) > 0:
        tags.append(f'ci:{m["yml"]}')
    return " · ".join(tags) if tags else "—"


# ─── Deploy notification ─────────────────────────────────────────────────

def build_deploy_text(metrics, deploy_secs, commit_url="", logs_url=""):
    m = metrics
    ts = datetime.now().strftime("%H:%M · %d.%m.%Y")

    lines = [
        f"<b>✓ ДЕПЛОЙ ЗАВЕРШЁН</b>",
        f"<code>{m['sha']}</code> · {ts}",
        "",
    ]

    # Commit message
    if m.get("commit_msg"):
        msg = m["commit_msg"][:80]
        lines.append(f"<i>{msg}</i>")
        lines.append("")

    # Stats
    lines.append(f"<b>Изменения</b>")
    lines.append(f"  {m['total_files']} файлов · +{m['insertions']} −{m['deletions']}")
    lines.append(f"  {file_tags(m)}")
    lines.append("")

    # Recent commits
    if m.get("commits"):
        lines.append(f"<b>Коммиты</b> ({m['commit_count']})")
        for c in m["commits"][:3]:
            c_short = c[:60] + ("…" if len(c) > 60 else "")
            lines.append(f"  · {c_short}")
        lines.append("")

    # Server health
    lines.append(f"<b>Сервер</b>")
    lines.append(f"  RAM {bar(m['ram_pct'])} {m['ram_pct']}%")
    lines.append(f"  SSD {bar(m['disk_pct'])} {m['disk_pct']}%")
    lines.append(f"  Аптайм: {m['uptime']}")
    lines.append("")

    # Deploy time
    if deploy_secs > 0:
        lines.append(f"⏱ {deploy_secs}с")

    # Links
    link_parts = []
    if commit_url:
        link_parts.append(f'<a href="{commit_url}">коммит</a>')
    if logs_url:
        link_parts.append(f'<a href="{logs_url}">логи</a>')
    if link_parts:
        lines.append(" · ".join(link_parts))

    return "\n".join(lines)


# ─── Merge notification ──────────────────────────────────────────────────

def build_merge_text(branch, commit_count, commit_list, ftags="", files_stat="",
                     insertions=0, deletions=0):
    short = branch.replace("claude/", "")
    ts = datetime.now().strftime("%H:%M")

    lines = [
        f"<b>✓ МЕРЖ</b>  <code>{short}</code>",
        "",
    ]

    if commit_count > 0:
        lines.append(f"<b>{commit_count}</b> коммит{'ов' if commit_count >= 5 else 'а' if 2 <= commit_count <= 4 else ''}")

    if commit_list:
        for c in commit_list[:4]:
            c_short = c[:55] + ("…" if len(c) > 55 else "")
            lines.append(f"  · {c_short}")
        lines.append("")

    stat_parts = []
    if insertions > 0:
        stat_parts.append(f"+{insertions}")
    if deletions > 0:
        stat_parts.append(f"−{deletions}")
    if ftags:
        stat_parts.append(ftags)
    if stat_parts:
        lines.append(" · ".join(stat_parts))

    return "\n".join(lines)


# ─── Telegram API ────────────────────────────────────────────────────────

def send_message(token, chat_id, text):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status == 200
    except Exception as e:
        print(f"Send failed: {e}")
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
        print("Building notification...")
        text = build_deploy_text(metrics, deploy_secs, args.commit_url, args.logs_url)
    else:
        commit_list = [c.strip() for c in args.commits.split("\n") if c.strip()]
        text = build_merge_text(
            args.branch, args.commit_count, commit_list,
            args.file_tags, args.files_stat,
            args.insertions, args.deletions,
        )

    print(text)
    print("\nSending...")
    ok = send_message(token, args.chat_id, text)
    print("Sent!" if ok else "FAILED")


if __name__ == "__main__":
    main()

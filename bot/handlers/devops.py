"""
DevOps commands for admin control via Telegram.

Commands:
- /deploy - Trigger deploy workflow
- /rollback [N] - Rollback N commits (default 1)
- /status - Server status
- /logs [service] [lines] - View logs
- /backup - Create database backup
- /health - Run health check
"""

import logging
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from aiogram import Router, F
from aiogram.filters import Command, CommandObject, StateFilter
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery

from core.config import settings

logger = logging.getLogger(__name__)
router = Router()

MSK_TZ = ZoneInfo("Europe/Moscow")

# GitHub API settings
GITHUB_REPO = "soloveyska1/academic_saloon"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")  # Personal Access Token


def is_admin(user_id: int) -> bool:
    """Check if user is admin"""
    return user_id in settings.ADMIN_IDS


async def trigger_workflow(workflow_name: str, inputs: dict = None) -> dict:
    """Trigger GitHub Actions workflow via API"""
    if not GITHUB_TOKEN:
        return {"success": False, "error": "GITHUB_TOKEN not configured"}

    url = f"https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/{workflow_name}/dispatches"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {"ref": "main"}
    if inputs:
        data["inputs"] = inputs

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data, timeout=30)
            if response.status_code == 204:
                return {"success": True}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ══════════════════════════════════════════════════════════════
#                        COMMANDS
# ══════════════════════════════════════════════════════════════

@router.message(Command("deploy"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_deploy(message: Message):
    """Trigger deploy workflow"""
    msg = await message.answer("🚀 Запускаю deploy...")

    result = await trigger_workflow("deploy.yml")

    if result["success"]:
        await msg.edit_text(
            "✅ Deploy запущен!\n\n"
            "Получишь уведомление когда завершится.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(
                    text="📋 GitHub Actions",
                    url=f"https://github.com/{GITHUB_REPO}/actions"
                )]
            ])
        )
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


@router.message(Command("rollback"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_rollback(message: Message, command: CommandObject):
    """Rollback N commits"""
    commits_back = "1"
    if command.args:
        try:
            commits_back = str(int(command.args))
        except ValueError:
            await message.answer("❌ Укажите число коммитов: /rollback 2")
            return

    msg = await message.answer(f"⏪ Запускаю rollback на {commits_back} коммит(ов)...")

    result = await trigger_workflow("rollback.yml", {"commits_back": commits_back})

    if result["success"]:
        await msg.edit_text(
            f"✅ Rollback запущен!\n\n"
            f"Откат на {commits_back} коммит(ов).\n"
            f"Получишь уведомление когда завершится."
        )
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


@router.message(Command("backup"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_backup(message: Message):
    """Trigger database backup"""
    msg = await message.answer("💾 Запускаю backup БД...")

    result = await trigger_workflow("backup-database.yml", {"notify": "true"})

    if result["success"]:
        await msg.edit_text(
            "✅ Backup запущен!\n\n"
            "БД будет сохранена на Яндекс Диск.\n"
            "Получишь уведомление когда завершится."
        )
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


@router.message(Command("health"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_health(message: Message):
    """Trigger health check"""
    msg = await message.answer("🏥 Запускаю проверку здоровья...")

    result = await trigger_workflow("health-check.yml")

    if result["success"]:
        await msg.edit_text(
            "✅ Health check запущен!\n\n"
            "Если будут проблемы - получишь уведомление."
        )
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


@router.message(Command("status"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_status(message: Message):
    """Get server status"""
    msg = await message.answer("📊 Получаю статус сервера...")

    result = await trigger_workflow("server-status.yml", {"action": "status", "lines": "50"})

    if result["success"]:
        await msg.edit_text(
            "✅ Запрос статуса отправлен!\n\n"
            "Результат будет в GitHub Actions.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(
                    text="📋 Посмотреть",
                    url=f"https://github.com/{GITHUB_REPO}/actions/workflows/server-status.yml"
                )]
            ])
        )
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


@router.message(Command("logs"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_logs(message: Message, command: CommandObject):
    """View server logs: /logs [bot|nginx|errors] [lines]"""
    action = "logs-bot"
    lines = "50"

    if command.args:
        args = command.args.split()
        if args[0] in ["bot", "nginx", "errors"]:
            action = f"logs-{args[0]}"
        if len(args) > 1:
            try:
                lines = str(int(args[1]))
            except ValueError:
                pass

    msg = await message.answer(f"📋 Получаю логи ({action})...")

    result = await trigger_workflow("server-status.yml", {"action": action, "lines": lines})

    if result["success"]:
        await msg.edit_text(
            f"✅ Запрос логов отправлен!\n\n"
            f"Тип: {action}\n"
            f"Строк: {lines}",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(
                    text="📋 Посмотреть",
                    url=f"https://github.com/{GITHUB_REPO}/actions/workflows/server-status.yml"
                )]
            ])
        )
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


@router.message(Command("cleanup"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_cleanup(message: Message):
    """Clean up disk space"""
    msg = await message.answer("🧹 Запускаю очистку диска...")

    result = await trigger_workflow("server-status.yml", {"action": "disk-cleanup", "lines": "50"})

    if result["success"]:
        await msg.edit_text(
            "✅ Очистка запущена!\n\n"
            "Будут удалены старые логи и кэш."
        )
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


# ══════════════════════════════════════════════════════════════
#                     DEVOPS MENU
# ══════════════════════════════════════════════════════════════

@router.message(Command("devops"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_devops_menu(message: Message):
    """Show DevOps menu with all available actions"""
    now = datetime.now(MSK_TZ).strftime("%d.%m.%Y %H:%M")

    text = (
        "🛠 <b>DevOps Panel</b>\n"
        f"<i>{now} МСК</i>\n\n"
        "<b>Доступные команды:</b>\n\n"
        "🚀 /deploy - Запустить деплой\n"
        "⏪ /rollback [N] - Откатить N коммитов\n"
        "📊 /status - Статус сервера\n"
        "📋 /logs [bot|nginx|errors] - Логи\n"
        "💾 /backup - Backup БД на Яндекс Диск\n"
        "🏥 /health - Проверка здоровья\n"
        "🧹 /cleanup - Очистка диска\n"
    )

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🚀 Deploy", callback_data="devops:deploy"),
            InlineKeyboardButton(text="⏪ Rollback", callback_data="devops:rollback")
        ],
        [
            InlineKeyboardButton(text="📊 Status", callback_data="devops:status"),
            InlineKeyboardButton(text="📋 Logs", callback_data="devops:logs")
        ],
        [
            InlineKeyboardButton(text="💾 Backup", callback_data="devops:backup"),
            InlineKeyboardButton(text="🏥 Health", callback_data="devops:health")
        ],
        [
            InlineKeyboardButton(
                text="🔗 GitHub Actions",
                url=f"https://github.com/{GITHUB_REPO}/actions"
            )
        ]
    ])

    await message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                   CALLBACK HANDLERS
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("devops:"), F.from_user.id.in_(settings.ADMIN_IDS))
async def handle_devops_callback(callback: CallbackQuery):
    """Handle DevOps button callbacks"""
    action = callback.data.split(":")[1]

    await callback.answer("Запускаю...")

    if action == "deploy":
        result = await trigger_workflow("deploy.yml")
        text = "✅ Deploy запущен!" if result["success"] else f"❌ Ошибка: {result['error']}"
    elif action == "rollback":
        result = await trigger_workflow("rollback.yml", {"commits_back": "1"})
        text = "✅ Rollback (1 коммит) запущен!" if result["success"] else f"❌ Ошибка: {result['error']}"
    elif action == "status":
        result = await trigger_workflow("server-status.yml", {"action": "status", "lines": "50"})
        text = "✅ Запрос статуса отправлен!" if result["success"] else f"❌ Ошибка: {result['error']}"
    elif action == "logs":
        result = await trigger_workflow("server-status.yml", {"action": "logs-bot", "lines": "50"})
        text = "✅ Запрос логов отправлен!" if result["success"] else f"❌ Ошибка: {result['error']}"
    elif action == "backup":
        result = await trigger_workflow("backup-database.yml", {"notify": "true"})
        text = "✅ Backup запущен!" if result["success"] else f"❌ Ошибка: {result['error']}"
    elif action == "health":
        result = await trigger_workflow("health-check.yml")
        text = "✅ Health check запущен!" if result["success"] else f"❌ Ошибка: {result['error']}"
    else:
        text = "❓ Неизвестное действие"

    await callback.message.answer(text)

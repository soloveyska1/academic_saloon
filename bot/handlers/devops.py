"""
DevOps commands for admin control via Telegram.

INSTANT commands (run directly on server):
- /server - Full server status with metrics
- /logs [bot|nginx|errors] [N] - View logs instantly
- /disk - Disk usage details
- /ram - Memory usage
- /restart - Restart bot service
- /cleanup - Clean disk space

CONFIG commands (manage server config without SSH):
- /env - View environment variables (masked)
- /env set KEY=VALUE - Add/update env variable
- /env del KEY - Remove env variable
- /nginx - View/test nginx config
- /ssl - Check SSL certificate status

GITHUB commands (trigger workflows):
- /deploy - Trigger deploy workflow
- /rollback [N] - Rollback N commits
- /backup - Backup DB to Yandex Disk
"""

import asyncio
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from aiogram import Router, F
from aiogram.filters import Command, CommandObject, StateFilter
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery, BufferedInputFile

from core.config import settings

logger = logging.getLogger(__name__)
router = Router()

MSK_TZ = ZoneInfo("Europe/Moscow")

# GitHub API settings
GITHUB_REPO = "soloveyska1/academic_saloon"
GITHUB_TOKEN = settings.GITHUB_TOKEN.get_secret_value() if settings.GITHUB_TOKEN else None


# ══════════════════════════════════════════════════════════════
#                    SHELL COMMAND HELPERS
# ══════════════════════════════════════════════════════════════

async def run_shell(cmd: str, timeout: int = 30) -> tuple[str, int]:
    """Run shell command and return output + return code"""
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return stdout.decode('utf-8', errors='replace'), proc.returncode
    except asyncio.TimeoutError:
        return "Command timed out", -1
    except Exception as e:
        return f"Error: {e}", -1


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
#                 INSTANT COMMANDS (DIRECT)
# ══════════════════════════════════════════════════════════════

@router.message(Command("server"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_server_status(message: Message):
    """Full server status - INSTANT"""
    msg = await message.answer("📊 Получаю статус сервера...")

    # Collect all metrics
    uptime, _ = await run_shell("uptime -p")
    load, _ = await run_shell("cat /proc/loadavg | awk '{print $1, $2, $3}'")

    # Disk
    disk, _ = await run_shell("df -h / | tail -1 | awk '{print $3 \"/\" $2 \" (\" $5 \")\"}'")

    # Memory
    mem, _ = await run_shell("free -h | grep Mem | awk '{print $3 \"/\" $2}'")

    # Services
    bot_status, bot_code = await run_shell("systemctl is-active saloon-bot")
    nginx_status, _ = await run_shell("systemctl is-active nginx")
    pg_status, _ = await run_shell("systemctl is-active postgresql")
    redis_status, _ = await run_shell("systemctl is-active redis-server 2>/dev/null || systemctl is-active redis 2>/dev/null || echo 'inactive'")

    # Last commit
    commit, _ = await run_shell("cd ~/academic_saloon && git log -1 --format='%h - %s (%cr)'")

    # Bot process info
    bot_mem, _ = await run_shell("ps aux | grep 'python.*main.py' | grep -v grep | awk '{print $4 \"%\"}'")

    now = datetime.now(MSK_TZ).strftime("%d.%m.%Y %H:%M")

    status_text = f"""📊 <b>Server Status</b>
<i>{now} МСК</i>

🖥 <b>System:</b>
├ Uptime: {uptime.strip()}
├ Load: {load.strip()}
├ Disk: {disk.strip()}
└ RAM: {mem.strip()}

🔧 <b>Services:</b>
├ Bot: {'✅' if 'active' in bot_status else '❌'} {bot_status.strip()} {f'({bot_mem.strip()} RAM)' if bot_mem.strip() else ''}
├ Nginx: {'✅' if 'active' in nginx_status else '❌'} {nginx_status.strip()}
├ PostgreSQL: {'✅' if 'active' in pg_status else '❌'} {pg_status.strip()}
└ Redis: {'✅' if 'active' in redis_status else '❌'} {redis_status.strip()}

📦 <b>Last Deploy:</b>
<code>{commit.strip()}</code>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📋 Logs", callback_data="devops_instant:logs"),
            InlineKeyboardButton(text="💾 Disk", callback_data="devops_instant:disk"),
        ],
        [
            InlineKeyboardButton(text="🔄 Restart", callback_data="devops_instant:restart"),
            InlineKeyboardButton(text="🧹 Cleanup", callback_data="devops_instant:cleanup"),
        ]
    ])

    await msg.edit_text(status_text, reply_markup=keyboard)


@router.message(Command("logs"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_logs(message: Message, command: CommandObject):
    """View logs instantly: /logs [bot|nginx|errors] [lines]"""
    service = "bot"
    lines = 30

    if command.args:
        args = command.args.split()
        if args[0] in ["bot", "nginx", "errors"]:
            service = args[0]
        if len(args) > 1:
            try:
                lines = min(int(args[1]), 100)  # Max 100 lines
            except ValueError:
                pass

    msg = await message.answer(f"📋 Загружаю логи ({service}, {lines} строк)...")

    if service == "bot":
        output, _ = await run_shell(f"journalctl -u saloon-bot --no-pager -n {lines}")
    elif service == "nginx":
        output, _ = await run_shell(f"tail -n {lines} /var/log/nginx/error.log 2>/dev/null || echo 'No nginx logs'")
    elif service == "errors":
        output, _ = await run_shell(f"journalctl -u saloon-bot --no-pager -n {lines} -p err")

    # If too long, send as file
    if len(output) > 4000:
        file = BufferedInputFile(output.encode(), filename=f"{service}_logs.txt")
        await msg.delete()
        await message.answer_document(file, caption=f"📋 {service} logs ({lines} lines)")
    else:
        await msg.edit_text(f"📋 <b>{service.upper()} Logs</b> ({lines} lines):\n\n<code>{output[:3900]}</code>")


@router.message(Command("disk"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_disk(message: Message):
    """Detailed disk usage"""
    msg = await message.answer("💾 Анализирую диск...")

    df_output, _ = await run_shell("df -h /")

    # Get sizes of key directories
    dirs_output, _ = await run_shell("""
        echo "📁 Key directories:"
        du -sh ~/academic_saloon 2>/dev/null | awk '{print "  Project: " $1}'
        du -sh /var/log 2>/dev/null | awk '{print "  Logs: " $1}'
        du -sh /root/backups 2>/dev/null | awk '{print "  Backups: " $1}'
        du -sh /var/www 2>/dev/null | awk '{print "  Web: " $1}'
    """)

    await msg.edit_text(
        f"💾 <b>Disk Usage</b>\n\n<code>{df_output}</code>\n{dirs_output}",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🧹 Cleanup", callback_data="devops_instant:cleanup")]
        ])
    )


@router.message(Command("restart"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_restart(message: Message):
    """Restart bot service"""
    msg = await message.answer("🔄 Перезапускаю бота...")

    # Kill port and restart
    await run_shell("fuser -k 8000/tcp 2>/dev/null || true")
    await asyncio.sleep(1)
    output, code = await run_shell("systemctl restart saloon-bot")

    await asyncio.sleep(3)
    status, _ = await run_shell("systemctl is-active saloon-bot")

    if "active" in status:
        await msg.edit_text("✅ Бот успешно перезапущен!")
    else:
        await msg.edit_text(f"❌ Ошибка перезапуска:\n<code>{output}</code>")


@router.message(Command("cleanup"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_cleanup(message: Message):
    """Clean up disk space"""
    msg = await message.answer("🧹 Очищаю диск...")

    before, _ = await run_shell("df -h / | tail -1 | awk '{print $5}'")

    # Cleanup commands
    await run_shell("journalctl --vacuum-time=3d 2>/dev/null")
    await run_shell("apt-get clean 2>/dev/null")
    await run_shell("find /root/backups -name '*.sql.gz' -mtime +7 -delete 2>/dev/null")
    await run_shell("find /tmp -type f -mtime +1 -delete 2>/dev/null")

    after, _ = await run_shell("df -h / | tail -1 | awk '{print $5}'")

    await msg.edit_text(f"🧹 <b>Очистка завершена!</b>\n\nДиск: {before.strip()} → {after.strip()}")


@router.message(Command("ram"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_ram(message: Message):
    """Memory usage details"""
    output, _ = await run_shell("""
        echo "🧠 Memory Usage:"
        free -h
        echo ""
        echo "📊 Top processes by memory:"
        ps aux --sort=-%mem | head -6 | awk '{print $4 "% - " $11}'
    """)

    await message.answer(f"<code>{output}</code>")


# ══════════════════════════════════════════════════════════════
#                 CONFIG COMMANDS (ENV, NGINX, SSL)
# ══════════════════════════════════════════════════════════════

# Sensitive keys to mask in output
SENSITIVE_KEYS = {'TOKEN', 'SECRET', 'PASSWORD', 'KEY', 'PRIVATE', 'CREDENTIAL'}

def mask_value(key: str, value: str) -> str:
    """Mask sensitive values, show only first/last 4 chars"""
    key_upper = key.upper()
    if any(s in key_upper for s in SENSITIVE_KEYS):
        if len(value) > 10:
            return f"{value[:4]}...{value[-4:]}"
        return "****"
    return value


@router.message(Command("env"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_env(message: Message, command: CommandObject):
    """
    Manage environment variables:
    /env - View all (masked)
    /env set KEY=VALUE - Add/update
    /env del KEY - Remove
    """
    env_file = os.path.expanduser("~/academic_saloon/.env")

    if not command.args:
        # View all env vars (masked)
        msg = await message.answer("🔐 Загружаю переменные окружения...")

        try:
            with open(env_file, 'r') as f:
                lines = f.readlines()

            env_vars = []
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    masked = mask_value(key, value)
                    env_vars.append(f"<code>{key}</code> = {masked}")

            text = f"🔐 <b>Environment Variables</b>\n\n"
            text += "\n".join(env_vars) if env_vars else "Нет переменных"
            text += f"\n\n<i>📁 {env_file}</i>"
            text += "\n\n💡 <code>/env set KEY=VALUE</code> - добавить"
            text += "\n💡 <code>/env del KEY</code> - удалить"

            await msg.edit_text(text)
        except FileNotFoundError:
            await msg.edit_text(f"❌ Файл не найден: {env_file}")
        except Exception as e:
            await msg.edit_text(f"❌ Ошибка: {e}")
        return

    args = command.args.split(maxsplit=1)
    action = args[0].lower()

    if action == "set" and len(args) > 1:
        # Set env variable
        if '=' not in args[1]:
            await message.answer("❌ Формат: /env set KEY=VALUE")
            return

        key, value = args[1].split('=', 1)
        key = key.strip().upper()
        value = value.strip()

        if not key:
            await message.answer("❌ Ключ не может быть пустым")
            return

        msg = await message.answer(f"⏳ Добавляю {key}...")

        try:
            # Read existing env
            lines = []
            key_found = False
            try:
                with open(env_file, 'r') as f:
                    lines = f.readlines()
            except FileNotFoundError:
                pass

            # Update or add
            new_lines = []
            for line in lines:
                if line.strip().startswith(f"{key}="):
                    new_lines.append(f"{key}={value}\n")
                    key_found = True
                else:
                    new_lines.append(line)

            if not key_found:
                new_lines.append(f"{key}={value}\n")

            # Write back
            with open(env_file, 'w') as f:
                f.writelines(new_lines)

            masked = mask_value(key, value)
            await msg.edit_text(
                f"✅ <b>Переменная {'обновлена' if key_found else 'добавлена'}!</b>\n\n"
                f"<code>{key}</code> = {masked}\n\n"
                f"⚠️ Для применения нужен <b>/restart</b>",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="🔄 Restart Bot", callback_data="devops_instant:restart")]
                ])
            )
        except Exception as e:
            await msg.edit_text(f"❌ Ошибка: {e}")

    elif action == "del" and len(args) > 1:
        # Delete env variable
        key = args[1].strip().upper()
        msg = await message.answer(f"⏳ Удаляю {key}...")

        try:
            with open(env_file, 'r') as f:
                lines = f.readlines()

            new_lines = [l for l in lines if not l.strip().startswith(f"{key}=")]

            if len(new_lines) == len(lines):
                await msg.edit_text(f"❌ Переменная {key} не найдена")
                return

            with open(env_file, 'w') as f:
                f.writelines(new_lines)

            await msg.edit_text(
                f"✅ Переменная <code>{key}</code> удалена!\n\n"
                f"⚠️ Для применения нужен <b>/restart</b>",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="🔄 Restart Bot", callback_data="devops_instant:restart")]
                ])
            )
        except Exception as e:
            await msg.edit_text(f"❌ Ошибка: {e}")
    else:
        await message.answer(
            "💡 <b>Использование:</b>\n\n"
            "<code>/env</code> - показать все\n"
            "<code>/env set KEY=VALUE</code> - добавить/обновить\n"
            "<code>/env del KEY</code> - удалить"
        )


@router.message(Command("nginx"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_nginx(message: Message, command: CommandObject):
    """View and manage nginx config"""
    msg = await message.answer("🌐 Проверяю nginx...")

    # Test config
    test_output, test_code = await run_shell("nginx -t 2>&1")

    # Get sites-enabled
    sites, _ = await run_shell("ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo 'No sites-enabled'")

    # Check status
    status, _ = await run_shell("systemctl is-active nginx")

    # Get active connections
    connections, _ = await run_shell("ss -tuln | grep ':80\\|:443' | wc -l")

    text = f"""🌐 <b>Nginx Status</b>

📊 <b>Service:</b> {'✅' if 'active' in status else '❌'} {status.strip()}
🔗 <b>Active ports:</b> {connections.strip()}

📋 <b>Config test:</b>
<code>{test_output.strip()}</code>

📁 <b>Sites enabled:</b>
<code>{sites.strip()}</code>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🔄 Reload", callback_data="devops_nginx:reload"),
            InlineKeyboardButton(text="📋 Full Config", callback_data="devops_nginx:config"),
        ]
    ])

    await msg.edit_text(text, reply_markup=keyboard)


@router.message(Command("ssl"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_ssl(message: Message):
    """Check SSL certificate status"""
    msg = await message.answer("🔒 Проверяю SSL сертификаты...")

    # Check certbot certificates
    certs_output, _ = await run_shell("certbot certificates 2>/dev/null || echo 'Certbot not installed'")

    # Check nginx SSL config
    ssl_conf, _ = await run_shell("grep -r 'ssl_certificate' /etc/nginx/sites-enabled/ 2>/dev/null | head -5")

    # Check certificate expiry for main domain
    domain_check, _ = await run_shell("""
        DOMAIN=$(grep server_name /etc/nginx/sites-enabled/* 2>/dev/null | grep -v '#' | head -1 | awk '{print $2}' | tr -d ';')
        if [ -n "$DOMAIN" ]; then
            echo "Domain: $DOMAIN"
            echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "Could not check"
        else
            echo "No domain found in nginx config"
        fi
    """)

    text = f"""🔒 <b>SSL Status</b>

📜 <b>Certificate Info:</b>
<code>{domain_check.strip()}</code>

📁 <b>SSL Configs:</b>
<code>{ssl_conf.strip() if ssl_conf.strip() else 'No SSL configs found'}</code>

🔐 <b>Certbot:</b>
<code>{certs_output[:1500] if len(certs_output) > 1500 else certs_output}</code>"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔄 Renew Certs", callback_data="devops_ssl:renew")]
    ])

    await msg.edit_text(text, reply_markup=keyboard)


@router.callback_query(F.data.startswith("devops_nginx:"), F.from_user.id.in_(settings.ADMIN_IDS))
async def handle_nginx_callback(callback: CallbackQuery):
    """Handle nginx callbacks"""
    action = callback.data.split(":")[1]
    await callback.answer("Выполняю...")

    if action == "reload":
        output, code = await run_shell("nginx -t && systemctl reload nginx")
        if code == 0:
            await callback.message.answer("✅ Nginx перезагружен!")
        else:
            await callback.message.answer(f"❌ Ошибка:\n<code>{output}</code>")

    elif action == "config":
        # Get main site config
        config, _ = await run_shell("cat /etc/nginx/sites-enabled/default 2>/dev/null || cat /etc/nginx/sites-enabled/* 2>/dev/null | head -100")
        if len(config) > 4000:
            file = BufferedInputFile(config.encode(), filename="nginx_config.txt")
            await callback.message.answer_document(file, caption="📋 Nginx Config")
        else:
            await callback.message.answer(f"📋 <b>Nginx Config:</b>\n\n<code>{config[:3900]}</code>")


@router.callback_query(F.data.startswith("devops_ssl:"), F.from_user.id.in_(settings.ADMIN_IDS))
async def handle_ssl_callback(callback: CallbackQuery):
    """Handle SSL callbacks"""
    action = callback.data.split(":")[1]
    await callback.answer("Выполняю...")

    if action == "renew":
        msg = await callback.message.answer("🔄 Обновляю SSL сертификаты...")
        output, code = await run_shell("certbot renew --dry-run 2>&1", timeout=60)

        if "dry run" in output.lower() and code == 0:
            # Dry run successful, do actual renewal
            output, code = await run_shell("certbot renew 2>&1", timeout=120)
            if code == 0:
                await msg.edit_text(f"✅ Сертификаты обновлены!\n\n<code>{output[:1000]}</code>")
            else:
                await msg.edit_text(f"❌ Ошибка:\n<code>{output[:2000]}</code>")
        else:
            await msg.edit_text(f"❌ Dry run failed:\n<code>{output[:2000]}</code>")


# ══════════════════════════════════════════════════════════════
#                  GITHUB WORKFLOW COMMANDS
# ══════════════════════════════════════════════════════════════

@router.message(Command("deploy"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_deploy(message: Message):
    """Trigger deploy workflow (pulls latest code)"""
    msg = await message.answer("🚀 Запускаю deploy...")

    result = await trigger_workflow("deploy.yml")

    if result["success"]:
        await msg.edit_text(
            "✅ Deploy запущен!\n\n"
            "Получишь уведомление когда завершится.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="📋 GitHub Actions", url=f"https://github.com/{GITHUB_REPO}/actions")]
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
            await message.answer("❌ Укажите число: /rollback 2")
            return

    msg = await message.answer(f"⏪ Запускаю rollback на {commits_back} коммит(ов)...")
    result = await trigger_workflow("rollback.yml", {"commits_back": commits_back})

    if result["success"]:
        await msg.edit_text(f"✅ Rollback на {commits_back} коммит(ов) запущен!")
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


@router.message(Command("backup"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_backup(message: Message):
    """Trigger database backup to Yandex Disk"""
    msg = await message.answer("💾 Запускаю backup БД...")
    result = await trigger_workflow("backup-database.yml", {"notify": "true"})

    if result["success"]:
        await msg.edit_text("✅ Backup запущен!\nБД сохранится на Яндекс Диск.")
    else:
        await msg.edit_text(f"❌ Ошибка: {result['error']}")


# ══════════════════════════════════════════════════════════════
#                     DEVOPS MENU
# ══════════════════════════════════════════════════════════════

@router.message(Command("help_admin"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_help_admin(message: Message):
    """Simple help for non-technical admin"""
    text = """📚 <b>ШПАРГАЛКА АДМИНА</b>

<b>Что хочешь сделать?</b>

🔴 <b>Бот не работает / глючит:</b>
→ Напиши <code>/restart</code>

🔴 <b>Посмотреть что происходит:</b>
→ Напиши <code>/server</code> (статус всего)
→ Напиши <code>/logs</code> (ошибки бота)

🔴 <b>Обновить бота (новый код):</b>
→ Ничего не делай! Само обновится после push в GitHub

🔴 <b>Добавить новый API ключ / настройку:</b>
→ Напиши <code>/env set КЛЮЧ=значение</code>
→ Потом <code>/restart</code>

🔴 <b>Место на диске кончается:</b>
→ Напиши <code>/cleanup</code>

🔴 <b>Откатить если что-то сломалось:</b>
→ Напиши <code>/rollback</code> (откат на 1 версию назад)

🔴 <b>Сделать бэкап базы:</b>
→ Напиши <code>/backup</code>

━━━━━━━━━━━━━━━━━━━━━
💡 <b>ВСЁ ОСТАЛЬНОЕ — АВТОМАТИЧЕСКИ!</b>

✅ Код обновляется сам после push
✅ Зависимости ставятся сами
✅ База мигрируется сама
✅ Mini-app пересобирается сам
✅ SSL сертификаты обновляются сами
✅ Бэкапы делаются каждый день
✅ Если бот упал — сам перезапустится
━━━━━━━━━━━━━━━━━━━━━"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📊 Статус", callback_data="devops_instant:server"),
            InlineKeyboardButton(text="🔄 Перезапуск", callback_data="devops_instant:restart"),
        ],
        [
            InlineKeyboardButton(text="📋 Все команды", callback_data="devops_menu:full"),
        ]
    ])

    await message.answer(text, reply_markup=keyboard)


@router.callback_query(F.data == "devops_menu:full", F.from_user.id.in_(settings.ADMIN_IDS))
async def show_full_menu(callback: CallbackQuery):
    """Show full DevOps menu"""
    await callback.answer()
    await cmd_devops_menu(callback.message)


@router.message(Command("devops"), F.from_user.id.in_(settings.ADMIN_IDS), StateFilter(None))
async def cmd_devops_menu(message: Message):
    """Show DevOps menu"""
    now = datetime.now(MSK_TZ).strftime("%d.%m.%Y %H:%M")

    text = f"""🛠 <b>DevOps Panel</b>
<i>{now} МСК</i>

⚡ <b>INSTANT</b> (результат сразу):
/server - Полный статус сервера
/logs [bot|nginx|errors] [N] - Логи
/disk - Использование диска
/ram - Память
/restart - Перезапуск бота
/cleanup - Очистка диска

🔐 <b>CONFIG</b> (управление без SSH):
/env - Переменные окружения
/env set KEY=VALUE - Добавить переменную
/nginx - Статус и конфиг nginx
/ssl - SSL сертификаты

🔄 <b>WORKFLOWS</b> (GitHub Actions):
/deploy - Деплой (git pull + restart)
/rollback [N] - Откат коммитов
/backup - Бэкап БД на Яндекс Диск"""

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📊 Status", callback_data="devops_instant:server"),
            InlineKeyboardButton(text="📋 Logs", callback_data="devops_instant:logs"),
        ],
        [
            InlineKeyboardButton(text="🔐 Env", callback_data="devops_config:env"),
            InlineKeyboardButton(text="🌐 Nginx", callback_data="devops_config:nginx"),
        ],
        [
            InlineKeyboardButton(text="🚀 Deploy", callback_data="devops_workflow:deploy"),
            InlineKeyboardButton(text="💾 Backup", callback_data="devops_workflow:backup"),
        ],
        [
            InlineKeyboardButton(text="🔗 GitHub", url=f"https://github.com/{GITHUB_REPO}/actions")
        ]
    ])

    await message.answer(text, reply_markup=keyboard)


# ══════════════════════════════════════════════════════════════
#                   CALLBACK HANDLERS
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data.startswith("devops_instant:"), F.from_user.id.in_(settings.ADMIN_IDS))
async def handle_instant_callback(callback: CallbackQuery):
    """Handle instant DevOps callbacks"""
    action = callback.data.split(":")[1]
    await callback.answer("Выполняю...")

    if action == "server":
        await cmd_server_status(callback.message)
    elif action == "logs":
        # Create fake command object
        class FakeCommand:
            args = None
        await cmd_logs(callback.message, FakeCommand())
    elif action == "disk":
        await cmd_disk(callback.message)
    elif action == "restart":
        await cmd_restart(callback.message)
    elif action == "cleanup":
        await cmd_cleanup(callback.message)


@router.callback_query(F.data.startswith("devops_workflow:"), F.from_user.id.in_(settings.ADMIN_IDS))
async def handle_workflow_callback(callback: CallbackQuery):
    """Handle workflow callbacks"""
    action = callback.data.split(":")[1]
    await callback.answer("Запускаю...")

    if action == "deploy":
        result = await trigger_workflow("deploy.yml")
        text = "✅ Deploy запущен!" if result["success"] else f"❌ {result['error']}"
    elif action == "backup":
        result = await trigger_workflow("backup-database.yml", {"notify": "true"})
        text = "✅ Backup запущен!" if result["success"] else f"❌ {result['error']}"
    else:
        text = "❓ Unknown action"

    await callback.message.answer(text)


@router.callback_query(F.data.startswith("devops_config:"), F.from_user.id.in_(settings.ADMIN_IDS))
async def handle_config_callback(callback: CallbackQuery):
    """Handle config callbacks (env, nginx, ssl)"""
    action = callback.data.split(":")[1]
    await callback.answer("Загружаю...")

    if action == "env":
        # Create fake command object
        class FakeCommand:
            args = None
        await cmd_env(callback.message, FakeCommand())
    elif action == "nginx":
        class FakeCommand:
            args = None
        await cmd_nginx(callback.message, FakeCommand())
    elif action == "ssl":
        await cmd_ssl(callback.message)

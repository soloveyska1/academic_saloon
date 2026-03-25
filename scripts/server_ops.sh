#!/usr/bin/env bash

set -euo pipefail

ACTION="${1:-status}"
LINES="${2:-50}"

REPO_DIR="${REPO_DIR:-$HOME/academic_saloon}"
SERVICE_NAME="${SERVICE_NAME:-saloon-bot}"
LOCK_FILE="${LOCK_FILE:-/tmp/saloon-deploy.lock}"
DOMAIN="${DOMAIN:-academic-saloon.duckdns.org}"
NOTIFY_CHAT_ID="${NOTIFY_CHAT_ID:-}"
GH_RUN_URL="${GH_RUN_URL:-}"
GH_ACTOR="${GH_ACTOR:-}"

bot_token_from_env() {
  grep -E '^BOT_TOKEN=' "$REPO_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | head -1
}

send_telegram_html() {
  local message="$1"
  local token

  token="$(bot_token_from_env)"
  if [ -z "$token" ] || [ -z "$NOTIFY_CHAT_ID" ]; then
    return
  fi

  curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" \
    --data-urlencode "chat_id=${NOTIFY_CHAT_ID}" \
    --data-urlencode "parse_mode=HTML" \
    --data-urlencode "text=${message}" \
    --data-urlencode "disable_web_page_preview=true" >/dev/null || true
}

redis_service_name() {
  if systemctl list-unit-files | grep -q '^redis-server\.service'; then
    echo "redis-server"
  else
    echo "redis"
  fi
}

service_state() {
  local service="$1"
  if systemctl is-active --quiet "$service"; then
    echo "●"
  else
    echo "✗"
  fi
}

backend_http_ok() {
  curl -fsS --max-time 5 http://localhost:8000/health >/dev/null 2>&1
}

frontend_http_ok() {
  curl -fsSIL --max-time 5 http://localhost/ >/dev/null 2>&1
}

restart_backend() {
  if systemctl restart "$SERVICE_NAME"; then
    sleep 2
    if systemctl is-active --quiet "$SERVICE_NAME" && backend_http_ok; then
      return 0
    fi
  fi

  fuser -k -9 8000/tcp 2>/dev/null || true
  lsof -ti:8000 | xargs -r kill -9 2>/dev/null || true
  sleep 1
  systemctl restart "$SERVICE_NAME"
  sleep 3
  systemctl is-active --quiet "$SERVICE_NAME" && backend_http_ok
}

cleanup_disk() {
  journalctl --vacuum-time=7d 2>/dev/null || true
  apt-get clean 2>/dev/null || true
  find /root/backups -name '*.sql.gz' -mtime +7 -delete 2>/dev/null || true
  find /tmp -type f -mtime +1 -delete 2>/dev/null || true
  pip cache purge 2>/dev/null || true
  npm cache clean --force 2>/dev/null || true
}

server_metrics() {
  local api_time ssl_date ssl_ts now_ts

  UPTIME="$(uptime -p | sed 's/up //')"
  LOAD="$(awk '{print $1" "$2" "$3}' /proc/loadavg)"
  DISK_PCT="$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')"
  DISK_INFO="$(df -h / | tail -1 | awk '{print $3"/"$2}')"
  MEM_PCT="$(free | awk '/Mem/ {printf("%.0f", $3/$2 * 100)}')"
  MEM_INFO="$(free -h | awk '/Mem/ {print $3"/"$2}')"
  BOT_RAM="$(ps aux | grep -E 'python.*main\.py|uvicorn' | grep -v grep | awk '{sum+=$6} END {printf("%.0f", sum/1024)}' 2>/dev/null || echo "0")"

  API_MS="—"
  api_time="$(curl -s -o /dev/null -w '%{time_total}' --max-time 3 http://localhost:8000/health 2>/dev/null || echo "0")"
  if [ "$api_time" != "0" ]; then
    API_MS="$(python3 - <<PY
api_time = float("${api_time}")
print(int(api_time * 1000))
PY
)"
  fi

  SSL_DAYS="?"
  ssl_date="$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  if [ -n "$ssl_date" ]; then
    ssl_ts="$(date -d "$ssl_date" +%s 2>/dev/null || echo 0)"
    now_ts="$(date +%s)"
    if [ "$ssl_ts" -gt 0 ] 2>/dev/null; then
      SSL_DAYS="$(( (ssl_ts - now_ts) / 86400 ))"
    fi
  fi

  BOT_STATE="$(service_state "$SERVICE_NAME")"
  NGINX_STATE="$(service_state nginx)"
  PG_STATE="$(service_state postgresql)"
  REDIS_STATE="$(service_state "$(redis_service_name)")"
  LAST_COMMIT="$(cd "$REPO_DIR" && git log -1 --format='%h  %s' | head -c 80)"
  LAST_TIME="$(cd "$REPO_DIR" && git log -1 --format='%cr')"
}

health_check() {
  local issues="" actions="" alert_lines="" disk mem mem_after disk_after redis_service

  if [ -f "$LOCK_FILE" ]; then
    echo "Deploy in progress, skipping"
    exit 0
  fi

  redis_service="$(redis_service_name)"

  if ! systemctl is-active --quiet "$SERVICE_NAME" || ! backend_http_ok; then
    if restart_backend; then
      actions="${actions}backend "
      alert_lines="${alert_lines}Бэкенд ▸ восстановлен ●\n"
    else
      issues="${issues}backend "
      alert_lines="${alert_lines}Бэкенд ▸ недоступен ✗\n"
    fi
  fi

  if ! systemctl is-active --quiet nginx || ! frontend_http_ok; then
    systemctl restart nginx
    sleep 2
    if systemctl is-active --quiet nginx && frontend_http_ok; then
      actions="${actions}nginx "
      alert_lines="${alert_lines}Nginx  ▸ восстановлен ●\n"
    else
      issues="${issues}nginx "
      alert_lines="${alert_lines}Nginx  ▸ недоступен ✗\n"
    fi
  fi

  if ! systemctl is-active --quiet postgresql; then
    systemctl restart postgresql
    sleep 2
    if systemctl is-active --quiet postgresql; then
      actions="${actions}pg "
      alert_lines="${alert_lines}Postgres ▸ восстановлен ●\n"
    else
      issues="${issues}pg "
      alert_lines="${alert_lines}Postgres ▸ недоступен ✗\n"
    fi
  fi

  if ! systemctl is-active --quiet "$redis_service" || ! redis-cli ping >/dev/null 2>&1; then
    systemctl restart "$redis_service" || true
    sleep 2
    if systemctl is-active --quiet "$redis_service" && redis-cli ping >/dev/null 2>&1; then
      actions="${actions}redis "
      alert_lines="${alert_lines}Redis  ▸ восстановлен ●\n"
    else
      issues="${issues}redis "
      alert_lines="${alert_lines}Redis  ▸ недоступен ✗\n"
    fi
  fi

  disk="$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')"
  if [ "$disk" -gt 85 ]; then
    cleanup_disk
    disk_after="$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')"
    actions="${actions}disk "
    alert_lines="${alert_lines}Диск   ▸ ${disk}% ▸ очищен до ${disk_after}%\n"
    if [ "$disk_after" -gt 92 ]; then
      issues="${issues}disk "
      alert_lines="${alert_lines}Диск   ▸ критический ${disk_after}% ✗\n"
    fi
  fi

  mem="$(free | awk '/Mem/ {printf("%.0f", $3/$2 * 100)}')"
  if [ "$mem" -gt 92 ]; then
    restart_backend || true
    mem_after="$(free | awk '/Mem/ {printf("%.0f", $3/$2 * 100)}')"
    actions="${actions}memory "
    alert_lines="${alert_lines}RAM    ▸ ${mem}% ▸ после перезапуска ${mem_after}%\n"
    if [ "$mem_after" -gt 97 ]; then
      issues="${issues}memory "
      alert_lines="${alert_lines}RAM    ▸ критическая ${mem_after}% ✗\n"
    fi
  fi

  if [ -n "$actions" ] || [ -n "$issues" ]; then
    server_metrics
    if [ -n "$issues" ]; then
      header="<b>⚠ СЕРВЕР — ПРОБЛЕМЫ</b>"
    else
      header="<b>↻ АВТО-ВОССТАНОВЛЕНИЕ</b>"
    fi

    send_telegram_html "$(cat <<EOF
${header}

<pre>
$(echo -e "$alert_lines")</pre>
<code>Диск: ${DISK_INFO} · RAM: ${MEM_INFO} · Аптайм: ${UPTIME}</code>

<a href="${GH_RUN_URL}">Подробные логи</a>
EOF
)"
  fi

  if [ -n "$issues" ]; then
    exit 1
  fi
}

make_bar() {
  local percent="$1" filled=0 bar="" i
  filled=$(( percent * 8 / 100 ))
  [ "$filled" -gt 8 ] && filled=8
  [ "$filled" -lt 0 ] && filled=0
  for i in $(seq 1 "$filled"); do bar="${bar}▰"; done
  for i in $(seq $((filled + 1)) 8); do bar="${bar}▱"; done
  echo "$bar"
}

status_report() {
  server_metrics
  local health=100 disk_bar ram_bar

  disk_bar="$(make_bar "$DISK_PCT")"
  ram_bar="$(make_bar "$MEM_PCT")"
  [ "$BOT_STATE" = "✗" ] && health=$((health - 30))
  [ "$NGINX_STATE" = "✗" ] && health=$((health - 25))
  [ "$PG_STATE" = "✗" ] && health=$((health - 25))
  [ "$DISK_PCT" -gt 85 ] && health=$((health - 10))
  [ "$MEM_PCT" -gt 85 ] && health=$((health - 10))

  cat <<EOF
◈ СЕРВЕР

Бот    ${BOT_STATE}  ${BOT_RAM}MB      Диск ${disk_bar} ${DISK_PCT}%
API    ●  ${API_MS}ms      RAM  ${ram_bar} ${MEM_PCT}%
Nginx  ${NGINX_STATE}              SSL  ${SSL_DAYS}д
PG     ${PG_STATE}              Аптайм ${UPTIME}
Redis  ${REDIS_STATE}              Нагрузка ${LOAD}

Диск: ${DISK_INFO} · RAM: ${MEM_INFO} · ♥ ${health}/100
Последний коммит: ${LAST_COMMIT} (${LAST_TIME})
EOF

  send_telegram_html "$(cat <<EOF
<b>◈ СЕРВЕР</b>

<pre>
Бот    ${BOT_STATE}  ${BOT_RAM}MB      Диск ${disk_bar} ${DISK_PCT}%
API    ●  ${API_MS}ms      RAM  ${ram_bar} ${MEM_PCT}%
Nginx  ${NGINX_STATE}              SSL  ${SSL_DAYS}д
PG     ${PG_STATE}              Аптайм ${UPTIME}
Redis  ${REDIS_STATE}              Нагрузка ${LOAD}
</pre>
<code>Диск: ${DISK_INFO} · RAM: ${MEM_INFO} · ♥ ${health}/100</code>

<i>Последний коммит: ${LAST_COMMIT} (${LAST_TIME})</i>

<a href="${GH_RUN_URL}">Полный вывод</a>
EOF
)"
}

logs_bot() {
  journalctl -u "$SERVICE_NAME" --no-pager -n "$LINES"
}

logs_nginx() {
  echo "--- Access ---"
  tail -n $((LINES / 2)) /var/log/nginx/access.log 2>/dev/null || echo "Нет логов"
  echo
  echo "--- Errors ---"
  tail -n $((LINES / 2)) /var/log/nginx/error.log 2>/dev/null || echo "Нет логов"
}

logs_errors() {
  journalctl -u "$SERVICE_NAME" --no-pager -n "$LINES" -p err
}

disk_cleanup() {
  local before after
  before="$(df -h / | tail -1 | awk '{print $5}')"
  cleanup_disk
  after="$(df -h / | tail -1 | awk '{print $5}')"
  echo "Очистка: $before -> $after"
}

case "$ACTION" in
  health-check) health_check ;;
  status) status_report ;;
  logs-bot) logs_bot ;;
  logs-nginx) logs_nginx ;;
  logs-errors) logs_errors ;;
  disk-cleanup) disk_cleanup ;;
  *)
    echo "Unknown action: $ACTION" >&2
    exit 1
    ;;
esac

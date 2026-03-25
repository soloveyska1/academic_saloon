#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/academic_saloon}"
SERVICE_NAME="${SERVICE_NAME:-saloon-bot}"
WEB_ROOT="${WEB_ROOT:-/var/www/academic_saloon}"
LOCK_FILE="${LOCK_FILE:-/tmp/saloon-deploy.lock}"
FRONTEND_ARCHIVE_PATH="${FRONTEND_ARCHIVE_PATH:-/tmp/academic_saloon_deploy/frontend-dist.tgz}"
BACKEND_CHANGED="${BACKEND_CHANGED:-false}"
FRONTEND_CHANGED="${FRONTEND_CHANGED:-false}"
DEPLOY_START="${DEPLOY_START:-$(date +%s)}"
OLD_COMMIT="${OLD_COMMIT:-unknown}"
NEW_COMMIT="${NEW_COMMIT:-unknown}"

cleanup() {
  rm -f "$LOCK_FILE"
}

activate_venv() {
  if [ ! -d "$REPO_DIR/venv" ]; then
    python3 -m venv "$REPO_DIR/venv"
    # shellcheck disable=SC1091
    source "$REPO_DIR/venv/bin/activate"
    python -m pip install --disable-pip-version-check --upgrade pip wheel >/dev/null
    return
  fi

  # shellcheck disable=SC1091
  source "$REPO_DIR/venv/bin/activate"
}

install_backend_dependencies() {
  local req_hash

  activate_venv
  req_hash="$(md5sum requirements.txt | cut -d' ' -f1)"

  if [ -f ".req_hash" ] && [ "$(cat .req_hash)" = "$req_hash" ]; then
    echo "Backend dependencies unchanged"
    return
  fi

  python -m pip install --disable-pip-version-check --quiet -r requirements.txt
  printf '%s' "$req_hash" > .req_hash
}

restart_backend() {
  if ! systemctl restart "$SERVICE_NAME"; then
    echo "Initial restart failed, clearing port 8000 and retrying"
  fi

  sleep 1

  if systemctl is-active --quiet "$SERVICE_NAME"; then
    return
  fi

  fuser -k -9 8000/tcp 2>/dev/null || true
  lsof -ti:8000 | xargs -r kill -9 2>/dev/null || true
  sleep 1
  systemctl restart "$SERVICE_NAME"
  sleep 2
  systemctl is-active --quiet "$SERVICE_NAME"
}

deploy_frontend_bundle() {
  local current_dir next_dir previous_dir

  if [ ! -f "$FRONTEND_ARCHIVE_PATH" ]; then
    echo "Missing frontend bundle at $FRONTEND_ARCHIVE_PATH"
    exit 1
  fi

  current_dir="$WEB_ROOT/dist"
  next_dir="$WEB_ROOT/dist.next"
  previous_dir="$WEB_ROOT/dist.prev"

  rm -rf "$next_dir"
  mkdir -p "$next_dir"
  tar -xzf "$FRONTEND_ARCHIVE_PATH" -C "$next_dir"

  if [ ! -f "$next_dir/index.html" ]; then
    echo "Frontend bundle is invalid: index.html not found"
    exit 1
  fi

  chown -R www-data:www-data "$next_dir"

  rm -rf "$previous_dir"
  if [ -d "$current_dir" ]; then
    mv "$current_dir" "$previous_dir"
  fi
  mv "$next_dir" "$current_dir"
  rm -rf "$previous_dir"
  rm -f "$FRONTEND_ARCHIVE_PATH"

  nginx -t
  systemctl reload nginx
}

check_backend_health() {
  curl -fsS --max-time 5 http://localhost:8000/health >/dev/null
}

check_frontend_health() {
  curl -fsSIL --max-time 5 http://localhost/ >/dev/null
}

send_notification() {
  if [ -z "${NOTIFY_CHAT_ID:-}" ] || [ ! -d "$REPO_DIR/venv" ]; then
    return
  fi

  set +e
  activate_venv
  python3 scripts/deploy_notify.py \
    --chat-id "$NOTIFY_CHAT_ID" \
    --old-commit "$OLD_COMMIT" \
    --new-commit "$NEW_COMMIT" \
    --deploy-start "$DEPLOY_START" \
    --commit-url "${GH_COMMIT_URL:-}" \
    --logs-url "${GH_RUN_URL:-}" \
    &
  disown || true
  set -e
}

trap cleanup EXIT
touch "$LOCK_FILE"

cd "$REPO_DIR"

if [ "$BACKEND_CHANGED" != "true" ] && [ "$FRONTEND_CHANGED" != "true" ]; then
  echo "Repository synchronized, no backend/frontend rollout required"
  exit 0
fi

if [ "$BACKEND_CHANGED" = "true" ]; then
  install_backend_dependencies
  alembic upgrade head
  restart_backend
fi

if [ "$FRONTEND_CHANGED" = "true" ]; then
  deploy_frontend_bundle
fi

if [ "$BACKEND_CHANGED" = "true" ]; then
  check_backend_health
fi

if [ "$FRONTEND_CHANGED" = "true" ]; then
  check_frontend_health
fi

send_notification

#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/academic_saloon}"
SERVICE_NAME="${SERVICE_NAME:-saloon-bot}"
WEB_ROOT="${WEB_ROOT:-/var/www/academic_saloon}"
LOCK_FILE="${LOCK_FILE:-/tmp/saloon-deploy.lock}"
FRONTEND_ARCHIVE_PATH="${FRONTEND_ARCHIVE_PATH:-/tmp/academic_saloon_deploy/frontend-dist.tgz}"
BACKEND_CHANGED="${BACKEND_CHANGED:-false}"
FRONTEND_CHANGED="${FRONTEND_CHANGED:-false}"
FRONTEND_BUILD_MODE="${FRONTEND_BUILD_MODE:-auto}"
SKIP_DB_MIGRATIONS="${SKIP_DB_MIGRATIONS:-false}"
SEND_DEPLOY_NOTIFICATION="${SEND_DEPLOY_NOTIFICATION:-true}"
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

install_frontend_dependencies() {
  local lock_hash

  cd "$REPO_DIR/mini-app"
  lock_hash="$(md5sum package-lock.json | cut -d' ' -f1)"

  if [ -f ".lock_hash" ] && [ "$(cat .lock_hash)" = "$lock_hash" ] && [ -d "node_modules" ]; then
    echo "Frontend dependencies unchanged"
    return
  fi

  npm ci --prefer-offline --no-audit
  printf '%s' "$lock_hash" > .lock_hash
}

activate_frontend_dist() {
  local source_dir="$1"
  local current_dir next_dir previous_dir

  current_dir="$WEB_ROOT/dist"
  next_dir="$WEB_ROOT/dist.next"
  previous_dir="$WEB_ROOT/dist.prev"

  if [ ! -f "$source_dir/index.html" ]; then
    echo "Frontend output is invalid: index.html not found in $source_dir"
    exit 1
  fi

  rm -rf "$next_dir"
  mkdir -p "$next_dir"
  cp -R "$source_dir"/. "$next_dir"/
  chown -R www-data:www-data "$next_dir"

  rm -rf "$previous_dir"
  if [ -d "$current_dir" ]; then
    mv "$current_dir" "$previous_dir"
  fi
  mv "$next_dir" "$current_dir"
  rm -rf "$previous_dir"

  nginx -t
  systemctl reload nginx
}

deploy_frontend_bundle() {
  if [ ! -f "$FRONTEND_ARCHIVE_PATH" ]; then
    echo "Missing frontend bundle at $FRONTEND_ARCHIVE_PATH"
    exit 1
  fi

  local extract_dir
  extract_dir="$WEB_ROOT/dist.unpack"
  rm -rf "$extract_dir"
  mkdir -p "$extract_dir"
  tar -xzf "$FRONTEND_ARCHIVE_PATH" -C "$extract_dir"
  activate_frontend_dist "$extract_dir"
  rm -rf "$extract_dir"
  rm -f "$FRONTEND_ARCHIVE_PATH"
}

build_frontend_locally() {
  cd "$REPO_DIR/mini-app"
  install_frontend_dependencies
  npm run build
  activate_frontend_dist "$REPO_DIR/mini-app/dist"
}

rollout_frontend() {
  case "$FRONTEND_BUILD_MODE" in
    artifact)
      deploy_frontend_bundle
      ;;
    local)
      build_frontend_locally
      ;;
    auto)
      if [ -f "$FRONTEND_ARCHIVE_PATH" ]; then
        deploy_frontend_bundle
      else
        build_frontend_locally
      fi
      ;;
    *)
      echo "Unknown FRONTEND_BUILD_MODE: $FRONTEND_BUILD_MODE"
      exit 1
      ;;
  esac
}

check_backend_health() {
  curl -fsS --max-time 5 http://localhost:8000/health >/dev/null
}

check_frontend_health() {
  curl -fsSIL --max-time 5 http://localhost/ >/dev/null
}

send_notification() {
  if [ "$SEND_DEPLOY_NOTIFICATION" != "true" ] || [ -z "${NOTIFY_CHAT_ID:-}" ] || [ ! -d "$REPO_DIR/venv" ]; then
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
  if [ "$SKIP_DB_MIGRATIONS" != "true" ]; then
    alembic upgrade head
  fi
  restart_backend
fi

if [ "$FRONTEND_CHANGED" = "true" ]; then
  rollout_frontend
fi

if [ "$BACKEND_CHANGED" = "true" ]; then
  check_backend_health
fi

if [ "$FRONTEND_CHANGED" = "true" ]; then
  check_frontend_health
fi

send_notification

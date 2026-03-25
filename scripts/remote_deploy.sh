#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/academic_saloon}"
SERVICE_NAME="${SERVICE_NAME:-saloon-bot}"
WEB_ROOT="${WEB_ROOT:-/var/www/academic_saloon}"
LOCK_FILE="${LOCK_FILE:-/tmp/saloon-deploy.lock}"
FRONTEND_ARCHIVE_PATH="${FRONTEND_ARCHIVE_PATH:-/tmp/academic_saloon_deploy/frontend-dist.tgz}"
SYSTEMD_TEMPLATE_PATH="${SYSTEMD_TEMPLATE_PATH:-$REPO_DIR/ops/systemd/${SERVICE_NAME}.service.template}"
SYSTEMD_UNIT_PATH="${SYSTEMD_UNIT_PATH:-/etc/systemd/system/${SERVICE_NAME}.service}"
SYSTEMD_HELPER_DIR="${SYSTEMD_HELPER_DIR:-/usr/local/lib/academic-saloon}"
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

systemd_maybe_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    "$@"
  fi
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
  if ! systemd_maybe_sudo systemctl reload-or-restart "$SERVICE_NAME"; then
    echo "Initial restart failed, clearing port 8000 and retrying"
  fi

  sleep 1

  if systemd_maybe_sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    return
  fi

  fuser -k -9 8000/tcp 2>/dev/null || true
  lsof -ti:8000 | xargs -r kill -9 2>/dev/null || true
  sleep 1
  systemd_maybe_sudo systemctl restart "$SERVICE_NAME"
  sleep 2
  systemd_maybe_sudo systemctl is-active --quiet "$SERVICE_NAME"
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

  systemd_maybe_sudo nginx -t
  systemd_maybe_sudo systemctl reload nginx
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

install_systemd_helpers() {
  local prestart_src reload_src

  prestart_src="$REPO_DIR/scripts/systemd_prestart.sh"
  reload_src="$REPO_DIR/scripts/systemd_reload.sh"

  if [ ! -f "$prestart_src" ] || [ ! -f "$reload_src" ]; then
    return
  fi

  systemd_maybe_sudo install -d -m 0755 "$SYSTEMD_HELPER_DIR"
  systemd_maybe_sudo install -m 0755 "$prestart_src" "$SYSTEMD_HELPER_DIR/systemd_prestart.sh"
  systemd_maybe_sudo install -m 0755 "$reload_src" "$SYSTEMD_HELPER_DIR/systemd_reload.sh"
}

install_systemd_unit() {
  local tmp_unit owner_user owner_group env_file current_hash new_hash

  if [ ! -f "$SYSTEMD_TEMPLATE_PATH" ]; then
    return
  fi

  install_systemd_helpers

  owner_user="$(stat -c '%U' "$REPO_DIR")"
  owner_group="$(stat -c '%G' "$REPO_DIR")"
  env_file="$REPO_DIR/.env"
  tmp_unit="$(mktemp)"

  python3 - <<PY > "$tmp_unit"
from pathlib import Path

template = Path("${SYSTEMD_TEMPLATE_PATH}").read_text()
rendered = (
    template
    .replace("{{SERVICE_USER}}", "${owner_user}")
    .replace("{{SERVICE_GROUP}}", "${owner_group}")
    .replace("{{REPO_DIR}}", "${REPO_DIR}")
    .replace("{{ENV_FILE}}", "${env_file}")
    .replace("{{SYSTEMD_HELPER_DIR}}", "${SYSTEMD_HELPER_DIR}")
)
print(rendered, end="")
PY

  if command -v systemd-analyze >/dev/null 2>&1; then
    systemd-analyze verify "$tmp_unit" >/dev/null
  fi

  new_hash="$(sha256sum "$tmp_unit" | cut -d' ' -f1)"
  current_hash="$(
    systemd_maybe_sudo bash -lc "if [ -f '$SYSTEMD_UNIT_PATH' ]; then sha256sum '$SYSTEMD_UNIT_PATH' | cut -d' ' -f1; fi"
  )"

  if [ "$new_hash" = "$current_hash" ]; then
    rm -f "$tmp_unit"
    return
  fi

  systemd_maybe_sudo install -m 0644 "$tmp_unit" "$SYSTEMD_UNIT_PATH"
  rm -f "$tmp_unit"
  systemd_maybe_sudo systemctl daemon-reload
  systemd_maybe_sudo systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT
touch "$LOCK_FILE"

cd "$REPO_DIR"

if [ "$BACKEND_CHANGED" != "true" ] && [ "$FRONTEND_CHANGED" != "true" ]; then
  echo "Repository synchronized, no backend/frontend rollout required"
  exit 0
fi

if [ "$BACKEND_CHANGED" = "true" ]; then
  install_systemd_unit
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

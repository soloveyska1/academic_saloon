#!/usr/bin/env bash

set -euo pipefail

main_pid="${MAINPID:-}"
reload_signal="${1:-HUP}"
timeout_seconds="${2:-45}"

if [ -z "$main_pid" ] || [ "$main_pid" = "0" ]; then
  echo "MAINPID is not available for reload" >&2
  exit 1
fi

kill "-${reload_signal}" "$main_pid"

for _ in $(seq 1 $(( timeout_seconds * 5 ))); do
  if ! kill -0 "$main_pid" 2>/dev/null; then
    exit 0
  fi
  sleep 0.2
done

echo "Timed out waiting for process $main_pid to exit during reload" >&2
exit 1

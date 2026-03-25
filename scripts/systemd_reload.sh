#!/usr/bin/env bash

set -euo pipefail

main_pid="${MAINPID:-}"

if [ -z "$main_pid" ] || [ "$main_pid" = "0" ]; then
  echo "MAINPID is not available for reload" >&2
  exit 1
fi

kill -TERM "$main_pid"

for _ in $(seq 1 150); do
  if ! kill -0 "$main_pid" 2>/dev/null; then
    exit 0
  fi
  sleep 0.2
done

echo "Timed out waiting for process $main_pid to exit during reload" >&2
exit 1

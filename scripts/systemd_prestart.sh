#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="${1:-${REPO_DIR:-}}"

if [ -z "$REPO_DIR" ]; then
  echo "REPO_DIR is required" >&2
  exit 1
fi

if [ ! -d "$REPO_DIR" ]; then
  echo "Repository directory not found: $REPO_DIR" >&2
  exit 1
fi

if [ ! -f "$REPO_DIR/.env" ]; then
  echo "Environment file missing: $REPO_DIR/.env" >&2
  exit 1
fi

if [ ! -x "$REPO_DIR/venv/bin/python" ]; then
  echo "Python executable missing: $REPO_DIR/venv/bin/python" >&2
  exit 1
fi

if [ ! -f "$REPO_DIR/main.py" ]; then
  echo "Application entrypoint missing: $REPO_DIR/main.py" >&2
  exit 1
fi

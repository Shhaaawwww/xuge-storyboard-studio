#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found." >&2
  exit 1
fi

exec node "$SCRIPT_DIR/scripts/stop-storyboard.mjs"

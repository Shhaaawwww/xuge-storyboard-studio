#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if [ ! -f "$SCRIPT_DIR/scripts/start-storyboard.mjs" ]; then
  echo "Xuge cannot find the project files. Extract the complete archive before starting it." >&2
  exit 1
fi

NODE_BIN=$(command -v node 2>/dev/null || true)

if [ -z "$NODE_BIN" ] && [ -x /bin/zsh ]; then
  NODE_BIN=$(/bin/zsh -lic 'command -v node' 2>/dev/null | tail -n 1 || true)
fi

if [ -z "$NODE_BIN" ] && [ -x /bin/bash ]; then
  NODE_BIN=$(/bin/bash -lic 'command -v node' 2>/dev/null | tail -n 1 || true)
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  for CANDIDATE in \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    "$HOME/.volta/bin/node" \
    "$HOME/.nvm/current/bin/node" \
    "$HOME/.asdf/shims/node" \
    "$HOME/.local/share/mise/shims/node" \
    "$HOME"/.nvm/versions/node/*/bin/node \
    "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node
  do
    if [ -x "$CANDIDATE" ]; then
      NODE_BIN=$CANDIDATE
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "Node.js was not found. Xuge needs Node.js 20.19+ or 22.12+." >&2
  echo "Install the LTS version from https://nodejs.org/en/download, then try again." >&2
  if [ "$(uname -s 2>/dev/null || true)" = "Darwin" ] && [ "${XUGE_NO_OPEN:-0}" != "1" ]; then
    open "https://nodejs.org/en/download" >/dev/null 2>&1 || true
  fi
  exit 1
fi

NODE_DIR=$(dirname -- "$NODE_BIN")
PATH="$NODE_DIR:$PATH"
export PATH

exec "$NODE_BIN" "$SCRIPT_DIR/scripts/start-storyboard.mjs"

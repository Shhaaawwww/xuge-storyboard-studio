#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

NODE_BIN=$(command -v node 2>/dev/null || true)

if [ -z "$NODE_BIN" ] && [ -x /bin/zsh ]; then
  NODE_BIN=$(/bin/zsh -lic 'command -v node' 2>/dev/null | tail -n 1 || true)
fi

if [ -z "$NODE_BIN" ] && [ -x /bin/bash ]; then
  NODE_BIN=$(/bin/bash -lic 'command -v node' 2>/dev/null | tail -n 1 || true)
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  for CANDIDATE in /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.volta/bin/node" "$HOME/.nvm/current/bin/node" "$HOME/.asdf/shims/node" "$HOME/.local/share/mise/shims/node" "$HOME"/.nvm/versions/node/*/bin/node "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node
  do
    if [ -x "$CANDIDATE" ]; then
      NODE_BIN=$CANDIDATE
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "Node.js was not found, so Xuge could not run the stop command." >&2
  exit 1
fi

NODE_DIR=$(dirname -- "$NODE_BIN")
PATH="$NODE_DIR:$PATH"
export PATH

exec "$NODE_BIN" "$SCRIPT_DIR/scripts/stop-storyboard.mjs"

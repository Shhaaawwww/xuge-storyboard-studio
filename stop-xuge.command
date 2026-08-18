#!/bin/sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
"$SCRIPT_DIR/stop-xuge.sh"
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  printf "\nStop failed. Press Return to close this window."
  read -r _
fi

exit "$STATUS"

#!/bin/sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
/bin/sh "$SCRIPT_DIR/start-xuge.sh"
STATUS=$?

if [ "$STATUS" -ne 0 ] && [ -t 0 ] && [ -z "${CI:-}" ]; then
  printf "\nStartup failed. Press Return to close this window."
  read -r _
fi

exit "$STATUS"

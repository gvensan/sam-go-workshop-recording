#!/bin/bash
# Launches the dedicated recording Chrome profile with CDP enabled, and prints
# the BU_CDP_WS value for browser-use. The profile lives in ./chrome-profile
# (separate from the personal profile; signed into GitHub once, manually).
#
#   bash recording-browser.sh          # launch (or reuse) and print the WS URL
#
# Drive it with:  BU_CDP_WS=$(bash recording-browser.sh) BU_NAME=recon browser-use <<'PY' ... PY

PROFILE="$(cd "$(dirname "$0")" && pwd)/chrome-profile"
PORT=9223

if ! curl -s "http://localhost:$PORT/json/version" > /dev/null 2>&1; then
  nohup "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --user-data-dir="$PROFILE" \
    --remote-debugging-port=$PORT \
    --no-first-run \
    --window-size=1920,1080 \
    > /dev/null 2>&1 &
  for i in $(seq 1 20); do
    curl -s "http://localhost:$PORT/json/version" > /dev/null 2>&1 && break
    sleep 1
  done
fi

curl -s "http://localhost:$PORT/json/version" | python3 -c "import sys,json;print(json.load(sys.stdin)['webSocketDebuggerUrl'])"

#!/bin/bash
# Install/refresh the GSP live runtime copy (~/gsp-x/live, local disk; launchd can't rely on OneDrive)
# and (re)load the launchd agents. Private data in ~/gsp-x/live/private is preserved.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
RT="${GSP_LIVE_RUNTIME:-$HOME/gsp-x/live}"
PY="${GSP_LIVE_PY:-$HOME/Library/Application Support/traceburst/venv/bin/python}"
mkdir -p "$RT/private"
rsync -a --delete --exclude private/ --exclude __pycache__/ --exclude .DS_Store "$SRC/" "$RT/"
for name in com.avinash.gsp-live-server com.avinash.gsp-live-delhi; do
  dst="$HOME/Library/LaunchAgents/$name.plist"
  sed -e "s#__PY__#$PY#g" -e "s#__RT__#$RT#g" -e "s#__HOME__#$HOME#g" "$SRC/launchd/$name.plist" > "$dst.tmp"
  mv "$dst.tmp" "$dst"
  if [ "${1:-}" != "--no-load" ]; then
    launchctl bootout "gui/$(id -u)/$name" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$dst"
  fi
done
echo "runtime: $RT   data: $RT/private   view: http://127.0.0.1:8774/live/"

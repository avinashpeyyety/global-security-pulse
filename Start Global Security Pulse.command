#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")"
echo "Starting Global Security Pulse on http://127.0.0.1:5173/"
echo "Leave this Terminal window open while you use the dashboard."
echo
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1
(sleep 2 && open "http://127.0.0.1:5173/") &
npm run dev -w @gsp/web -- --host 127.0.0.1 --port 5173
echo
echo "Server stopped. Press Return to close."
read -r

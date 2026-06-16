#!/usr/bin/env bash
BASE="$HOME/example-bboard"
API_PORT=3100
FIFO=/tmp/bboard-stdin
echo "Midnight Loadboard - Auto Startup"
STALE=$(pgrep -f "standalone.ts" 2>/dev/null || true)
if [ -n "$STALE" ]; then kill $STALE 2>/dev/null || true; sleep 2; fi
PORT_PID=$(lsof -ti tcp:$API_PORT 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then kill $PORT_PID 2>/dev/null || true; sleep 1; fi
rm -f "$FIFO" && mkfifo "$FIFO"
echo "Starting CLI..."
cd "$BASE/bboard-cli"
npm run standalone < "$FIFO" > /tmp/bboard-cli.log 2>&1 &
exec 9>"$FIFO"
echo "Waiting for menu..."
WAITED=0
while ! grep -q "Which would you like to do" /tmp/bboard-cli.log 2>/dev/null; do
  sleep 1; WAITED=$((WAITED+1))
  [ $WAITED -ge 90 ] && echo "Timeout - check: tail -f /tmp/bboard-cli.log" && exit 1
  printf "."
done
echo "" && echo "Auto-deploying..." && echo "1" >&9
WAITED=0
while true; do
  curl -sf "http://localhost:$API_PORT/api/health" 2>/dev/null | grep -q '"hasContract":true' && break
  sleep 2; WAITED=$((WAITED+2))
  [ $WAITED -ge 120 ] && echo "Timeout" && exit 1
  printf "."
done
echo "" && echo "Ready! Open http://localhost:5173"
cd "$BASE/bboard-ui" && npm run dev

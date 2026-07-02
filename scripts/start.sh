#!/usr/bin/env bash
# Start the Vite dev server for the web app.
# Usage: ./scripts/start.sh [--port <port>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
WEB_DIR="$ROOT/apps/web"
PID_FILE="$ROOT/.frontend.pid"
LOG_FILE="/tmp/bracket-frontend.log"
PORT="${2:-3000}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[frontend]${NC} $*"; }
ok()    { echo -e "${GREEN}[frontend]${NC} $*"; }
warn()  { echo -e "${YELLOW}[frontend]${NC} $*"; }
error() { echo -e "${RED}[frontend]${NC} $*" >&2; }

# ── already running? ─────────────────────────────────────────────────────────
if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    warn "Frontend already running (PID $PID). Use restart.sh to restart."
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

# ── vite binary ──────────────────────────────────────────────────────────────
VITE="$WEB_DIR/node_modules/.bin/vite"
[[ -x "$VITE" ]] || { error "Vite not found at $VITE. Run: cd apps/web && pnpm install"; exit 1; }

# ── start ────────────────────────────────────────────────────────────────────
info "Starting Vite dev server on port $PORT → $LOG_FILE"
cd "$WEB_DIR"
"$VITE" --port "$PORT" > "$LOG_FILE" 2>&1 &
VITE_PID=$!
echo "$VITE_PID" > "$PID_FILE"

info "Waiting for server (PID $VITE_PID)..."
for i in $(seq 1 20); do
  curl -sf "http://localhost:$PORT" >/dev/null 2>&1 && break
  sleep 1
  kill -0 "$VITE_PID" 2>/dev/null || { error "Process died. Logs: $LOG_FILE"; rm -f "$PID_FILE"; exit 1; }
done

curl -sf "http://localhost:$PORT" >/dev/null 2>&1 \
  || { error "Server did not respond on port $PORT. Logs: $LOG_FILE"; exit 1; }

ok "Frontend up at http://localhost:$PORT  (PID $VITE_PID)"

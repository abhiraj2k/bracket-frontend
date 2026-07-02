#!/usr/bin/env bash
# Show status of the Vite dev server.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
PID_FILE="$ROOT/.frontend.pid"
PORT=3000

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}●${NC} $*"; }
fail() { echo -e "  ${RED}●${NC} $*"; }

echo -e "${CYAN}── Bracket Frontend Status ──${NC}"

if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    if curl -sf "http://localhost:$PORT" >/dev/null 2>&1; then
      ok "Vite  PID=$PID  http://localhost:$PORT"
    else
      ok "Vite  PID=$PID  (starting up…)"
    fi
  else
    fail "Vite  PID=$PID (dead — stale PID file)"
  fi
else
  fail "Vite  not running"
fi

echo ""

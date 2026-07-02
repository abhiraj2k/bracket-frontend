#!/usr/bin/env bash
# Stop the Vite dev server.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
PID_FILE="$ROOT/.frontend.pid"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYAN}[frontend]${NC} $*"; }
ok()   { echo -e "${GREEN}[frontend]${NC} $*"; }
warn() { echo -e "${YELLOW}[frontend]${NC} $*"; }

if [[ -f "$PID_FILE" ]]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    info "Stopping Vite (PID $PID)..."
    kill "$PID"
    for i in $(seq 1 10); do
      kill -0 "$PID" 2>/dev/null || break
      sleep 1
    done
    kill -0 "$PID" 2>/dev/null && kill -9 "$PID" 2>/dev/null || true
    ok "Frontend stopped."
  else
    warn "PID $PID not running."
  fi
  rm -f "$PID_FILE"
else
  warn "No PID file found — frontend may not be running."
fi

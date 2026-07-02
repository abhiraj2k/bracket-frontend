#!/usr/bin/env bash
# Tail the Vite dev server log.
# Usage: ./scripts/logs.sh [-n <lines>]
LOG_FILE="/tmp/bracket-frontend.log"

CYAN='\033[0;36m'; NC='\033[0m'
LINES="${2:-50}"

if [[ ! -f "$LOG_FILE" ]]; then
  echo -e "${CYAN}[frontend]${NC} Log file not found: $LOG_FILE"
  exit 1
fi

echo -e "${CYAN}── $LOG_FILE (tail -f) ──${NC}"
tail -n "$LINES" -f "$LOG_FILE"

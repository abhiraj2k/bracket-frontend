#!/usr/bin/env bash
# Restart the Vite dev server.
# Usage: ./scripts/restart.sh [--port <port>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/stop.sh"
exec "$SCRIPT_DIR/start.sh" "$@"

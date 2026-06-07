#!/usr/bin/env bash
# Restart the HL Sales & Receivables server (stop, then run).
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

info "${c_bold}Memulai ulang server…${c_reset}"
"$LIB_DIR/stop-server.sh"
sleep 1
exec "$LIB_DIR/run-server.sh"

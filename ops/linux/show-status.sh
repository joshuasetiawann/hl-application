#!/usr/bin/env bash
# Show the current app status at a glance (Linux / macOS).
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

PM="$(detect_pm)"

info "${c_bold}HL Sales & Receivables — Status${c_reset}"
info "Folder proyek : $ROOT"
if pid="$(running_pid)"; then
  info "Server        : ${c_green}BERJALAN${c_reset} (PID $pid)"
elif [ -n "$(port_pids)" ]; then
  info "Server        : ${c_yellow}BERJALAN tanpa PID tercatat${c_reset} (port $PORT terpakai)"
else
  info "Server        : ${c_yellow}MATI${c_reset}"
fi
info "URL           : $URL"
info "Package mgr   : ${PM:-tidak terdeteksi}"
info "Node          : $(have node && node -v || echo 'tidak terpasang')"
info "File .env     : $([ -f "$ROOT/.env" ] && echo 'ada' || echo 'TIDAK ADA')"
info "node_modules  : $([ -d "$ROOT/node_modules" ] && echo 'ada' || echo 'belum dipasang')"
info "Build (.next) : $([ -f "$ROOT/.next/BUILD_ID" ] && echo 'ada' || echo 'belum di-build')"
info "Log terbaru   : $LOG"
if [ -f "$PIDF" ]; then info "PID file      : $PIDF ($(cat "$PIDF" 2>/dev/null))"; fi

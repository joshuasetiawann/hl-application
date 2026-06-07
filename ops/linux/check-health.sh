#!/usr/bin/env bash
# Health check: files, env, server process, and HTTP response. Prints OK / WARNING / ERROR.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

status="OK"
problems=()
bump() { # bump <level>
  case "$1" in
    ERROR) status="ERROR" ;;
    WARNING) [ "$status" = "OK" ] && status="WARNING" ;;
  esac
}

info "${c_bold}Pemeriksaan kesehatan — HL Sales & Receivables${c_reset}"
info "Folder proyek: $ROOT"
info ""

# --- Required files / tools ---
if have node; then info "Node.js        : $(node -v)"; else bump ERROR; problems+=("Node.js tidak terpasang"); fi
if [ -f "$ROOT/package.json" ]; then info "package.json   : ada"; else bump ERROR; problems+=("package.json tidak ditemukan"); fi
if [ -f "$ROOT/.env" ]; then info ".env           : ada"; else bump WARNING; problems+=(".env belum ada (jalankan run-server untuk membuatnya)"); fi
if [ -d "$ROOT/node_modules" ]; then info "node_modules   : ada"; else bump WARNING; problems+=("node_modules belum ada (dependencies belum dipasang)"); fi

# --- Server process ---
if pid="$(running_pid)"; then
  info "Proses server  : berjalan (PID $pid)"
elif [ -n "$(port_pids)" ]; then
  info "Proses server  : ada di port $PORT (PID tidak tercatat)"
else
  bump WARNING; problems+=("Server tidak berjalan")
  info "Proses server  : mati"
fi

# --- HTTP health ---
if http_ok "/api/health"; then
  info "HTTP health    : OK ($URL/api/health)"
else
  bump WARNING; problems+=("Endpoint $URL/api/health tidak merespons")
  info "HTTP health    : tidak merespons"
fi

info ""
case "$status" in
  OK)      ok "Status keseluruhan: OK — aplikasi siap di $URL" ;;
  WARNING) warn "Status keseluruhan: WARNING" ;;
  ERROR)   err "Status keseluruhan: ERROR" ;;
esac
for p in "${problems[@]:-}"; do [ -n "$p" ] && info "  - $p"; done

[ "$status" = "ERROR" ] && exit 1
[ "$status" = "WARNING" ] && exit 2
exit 0

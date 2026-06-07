#!/usr/bin/env bash
# Stop the HL Sales & Receivables server safely (Linux / macOS).
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
ensure_dirs

if pid="$(running_pid)"; then
  info "Menghentikan server (PID $pid)…"
  kill_tree "$pid" TERM
  for _ in $(seq 1 10); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  if kill -0 "$pid" 2>/dev/null; then
    warn "Server belum berhenti — memaksa berhenti…"
    kill_tree "$pid" KILL
  fi
  rm -f "$PIDF"
  ok "Server dihentikan."
  exit 0
fi

# No recorded PID — fall back to our port only (never touches other ports).
rm -f "$PIDF" 2>/dev/null || true
pids="$(port_pids | tr '\n' ' ' | sed 's/ *$//')"
if [ -z "$pids" ]; then
  ok "Tidak ada server yang berjalan (port $PORT kosong)."
  exit 0
fi

warn "Tidak ada PID tersimpan, tetapi ada proses di port $PORT (PID: $pids)."
warn "Menghentikan proses pada port $PORT…"
for p in $pids; do kill_tree "$p" TERM; done
sleep 2
remaining="$(port_pids | tr '\n' ' ' | sed 's/ *$//')"
if [ -n "$remaining" ]; then
  for p in $remaining; do kill_tree "$p" KILL; done
fi
ok "Selesai — port $PORT bebas."

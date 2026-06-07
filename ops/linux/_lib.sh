#!/usr/bin/env bash
# Shared helpers for the HL Sales & Receivables ops scripts (Linux / macOS).
# Sourced by run/stop/restart/check-health/show-status/edit-password.
set -uo pipefail

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$LIB_DIR/../.." && pwd)"
OPS_DIR="$ROOT/ops"
LOG_DIR="$OPS_DIR/logs"
RUN_DIR="$OPS_DIR/runtime"
LOG="$LOG_DIR/server.log"
PIDF="$RUN_DIR/server.pid"
PORT="${PORT:-3000}"
URL="http://localhost:$PORT"

# Colours only when writing to a terminal.
if [ -t 1 ]; then
  c_reset=$'\033[0m'; c_green=$'\033[32m'; c_red=$'\033[31m'
  c_yellow=$'\033[33m'; c_blue=$'\033[36m'; c_bold=$'\033[1m'
else
  c_reset=""; c_green=""; c_red=""; c_yellow=""; c_blue=""; c_bold=""
fi

ensure_dirs() { mkdir -p "$LOG_DIR" "$RUN_DIR"; }
info()  { printf '%s\n' "$*"; }
ok()    { printf '%s[OK]%s %s\n' "$c_green" "$c_reset" "$*"; }
warn()  { printf '%s[WARNING]%s %s\n' "$c_yellow" "$c_reset" "$*"; }
err()   { printf '%s[ERROR]%s %s\n' "$c_red" "$c_reset" "$*" >&2; }
die()   { err "$*"; exit 1; }
have()  { command -v "$1" >/dev/null 2>&1; }

# Detect the package manager based on the lockfile, falling back to npm.
detect_pm() {
  if [ -f "$ROOT/package-lock.json" ] && have npm; then echo npm; return; fi
  if [ -f "$ROOT/pnpm-lock.yaml" ] && have pnpm; then echo pnpm; return; fi
  if [ -f "$ROOT/yarn.lock" ] && have yarn; then echo yarn; return; fi
  if have npm; then echo npm; return; fi
  echo ""
}

# Echo a live server PID recorded in the pid file (or nothing + return 1).
running_pid() {
  if [ -f "$PIDF" ]; then
    local pid; pid="$(cat "$PIDF" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then echo "$pid"; return 0; fi
  fi
  return 1
}

# Best-effort list of PIDs listening on $PORT (does not touch other ports).
port_pids() {
  if have lsof; then lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null; return; fi
  if have ss;   then ss -ltnp 2>/dev/null | grep -E "[:.]$PORT[[:space:]]" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u; return; fi
  if have fuser; then fuser "$PORT"/tcp 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$'; return; fi
}

# Recursively terminate a process and its descendants (does not use port).
kill_tree() {
  local pid="$1" sig="${2:-TERM}" child
  if have pgrep; then
    for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child" "$sig"; done
  fi
  kill "-$sig" "$pid" 2>/dev/null || true
}

# Return 0 if the server answers on the given path (default /).
http_ok() {
  local path="${1:-/}"
  if have curl; then curl -fsS -o /dev/null --max-time 4 "$URL$path" 2>/dev/null; return; fi
  if have wget; then wget -q -O /dev/null --timeout=4 "$URL$path" 2>/dev/null; return; fi
  return 2
}

wait_for_health() {
  local tries="${1:-90}" i
  for ((i=1; i<=tries; i++)); do
    if http_ok "/api/health"; then return 0; fi
    sleep 1
  done
  return 1
}

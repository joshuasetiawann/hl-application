#!/usr/bin/env bash
# Start the HL Sales & Receivables app safely (Linux / macOS).
# Double-click friendly: checks tools, env, deps, DB, port, then starts the server.
#   PORT=3001   -> use a different port
#   DEV=1       -> run the development server instead of a production build
#   REBUILD=1   -> force a fresh production build
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
ensure_dirs
cd "$ROOT" || die "Tidak bisa masuk ke folder proyek: $ROOT"

info "${c_bold}HL Sales & Receivables — Menjalankan server${c_reset}"
info "Folder proyek: $ROOT"

have node || die "Node.js belum terpasang. Pasang Node.js LTS dari https://nodejs.org lalu coba lagi."
PM="$(detect_pm)"; [ -n "$PM" ] || die "Tidak menemukan npm. Pasang Node.js (sudah termasuk npm)."
info "Package manager: $PM · Node $(node -v)"

# --- Environment file ---
if [ ! -f "$ROOT/.env" ]; then
  if [ -f "$ROOT/.env.example" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    warn ".env belum ada — dibuat otomatis dari .env.example."
    warn "Sebelum dipakai serius: edit .env, isi AUTH_SECRET (acak & panjang) dan ADMIN_PASSWORD."
  else
    die ".env dan .env.example tidak ditemukan — tidak bisa lanjut."
  fi
fi

# --- Already running? ---
if pid="$(running_pid)"; then
  ok "Server sudah berjalan (PID $pid) di $URL"
  info "Pakai stop-server untuk berhenti, atau restart-server untuk memulai ulang."
  exit 0
fi

# --- Port conflict (a process we did NOT start) ---
existing="$(port_pids | tr '\n' ' ' | sed 's/ *$//')"
if [ -n "$existing" ]; then
  die "Port $PORT sedang dipakai proses lain (PID: $existing). Tutup proses itu, atau jalankan dengan port lain: PORT=3001 \"$0\""
fi

# --- Dependencies ---
if [ ! -d "$ROOT/node_modules" ]; then
  info "Memasang dependencies (sekali saja, mohon tunggu)…"
  PUPPETEER_SKIP_DOWNLOAD=true "$PM" install || die "Gagal memasang dependencies. Lihat pesan di atas."
fi

# --- Database (safe, non-destructive) ---
info "Menyiapkan database (migrasi aman — TIDAK menghapus data)…"
{
  npx prisma migrate deploy
  npx prisma generate
  "$PM" run db:seed
} >>"$LOG" 2>&1 || warn "Persiapan database memberi peringatan — detail di $LOG"

# --- Start server ---
start_cmd_label="production"
[ "${DEV:-0}" = "1" ] && start_cmd_label="development"

if [ "$start_cmd_label" = "production" ]; then
  if [ ! -f "$ROOT/.next/BUILD_ID" ] || [ "${REBUILD:-0}" = "1" ]; then
    info "Membangun aplikasi (production build)… pertama kali bisa beberapa menit."
    "$PM" run build >>"$LOG" 2>&1 || die "Build gagal. Lihat detail lengkap di: $LOG"
  fi
  info "Menjalankan server (production) di $URL …"
  if have setsid; then
    PORT="$PORT" setsid "$PM" run start >>"$LOG" 2>&1 < /dev/null &
  else
    PORT="$PORT" nohup "$PM" run start >>"$LOG" 2>&1 < /dev/null &
  fi
else
  info "Menjalankan server (development) di $URL …"
  if have setsid; then
    PORT="$PORT" setsid "$PM" run dev >>"$LOG" 2>&1 < /dev/null &
  else
    PORT="$PORT" nohup "$PM" run dev >>"$LOG" 2>&1 < /dev/null &
  fi
fi
echo $! > "$PIDF"

info "Menunggu server siap…"
if wait_for_health 90; then
  ok "Server siap di ${c_bold}$URL${c_reset} (PID $(cat "$PIDF"))"
  info "Buka di browser : $URL"
  info "Lihat log       : $LOG"
  info "Hentikan server : ops/linux/stop-server.sh  (atau ./stop-linux.sh)"
else
  err "Server belum merespons dalam 90 detik."
  err "Cek log untuk detail: $LOG"
  exit 1
fi

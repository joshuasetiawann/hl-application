#!/usr/bin/env bash
# HL Sales & Receivables — environment doctor (Linux / macOS).
# Diagnoses common run problems INCLUDING the SIGBUS class of errors
# (project sitting on a filesystem that does not support memory-mapped files).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"

if [ -t 1 ]; then
  c_reset=$'\033[0m'; c_green=$'\033[32m'; c_red=$'\033[31m'; c_yellow=$'\033[33m'; c_bold=$'\033[1m'
else
  c_reset=""; c_green=""; c_red=""; c_yellow=""; c_bold=""
fi
ok()   { printf '%s[OK]%s %s\n' "$c_green" "$c_reset" "$*"; }
warn() { printf '%s[WARN]%s %s\n' "$c_yellow" "$c_reset" "$*"; }
bad()  { printf '%s[FAIL]%s %s\n' "$c_red" "$c_reset" "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }
hr()   { printf '%s\n' "------------------------------------------------------------"; }

printf '%s\n' "${c_bold}HL Sales & Receivables — Doctor${c_reset}"
printf 'Folder proyek: %s\n' "$ROOT"
hr

# 1) Node.js
if have node; then
  ver="$(node -v | sed 's/^v//')"; major="${ver%%.*}"
  if [ "$major" -ge 18 ] && [ "$major" -le 22 ]; then ok "Node.js $ver (didukung)"; else
    warn "Node.js $ver — disarankan Node 18, 20, atau 22 (lihat .nvmrc)."; fi
else
  bad "Node.js tidak terpasang. Pasang Node LTS dari https://nodejs.org"
fi

# 2) Package manager + lockfile
if have npm; then ok "npm $(npm -v)"; else bad "npm tidak ditemukan"; fi
[ -f "$ROOT/package-lock.json" ] && ok "Lockfile: package-lock.json (gunakan npm)" || warn "package-lock.json tidak ada"

# 3) Dependencies
if [ -d "$ROOT/node_modules" ]; then ok "node_modules terpasang"; else warn "node_modules belum ada — jalankan: npm install"; fi
if [ -d "$ROOT/node_modules/.prisma/client" ] || [ -d "$ROOT/node_modules/@prisma/client" ]; then
  ok "Prisma Client tersedia"
else
  warn "Prisma Client belum di-generate — jalankan: npx prisma generate"
fi

# 4) .env + required variables
if [ -f "$ROOT/.env" ]; then
  ok ".env ditemukan"
  get() { grep -E "^$1=" "$ROOT/.env" | head -n1 | cut -d= -f2- | sed 's/^"//; s/"$//'; }
  [ -n "$(get DATABASE_URL)" ] && ok "DATABASE_URL terisi" || bad "DATABASE_URL kosong di .env"
  secret="$(get AUTH_SECRET)"
  if [ -z "$secret" ]; then bad "AUTH_SECRET kosong"
  elif [ "${#secret}" -lt 16 ]; then warn "AUTH_SECRET terlalu pendek (<16) — buat lebih panjang & acak"
  elif printf '%s' "$secret" | grep -qi 'change-me'; then warn "AUTH_SECRET masih nilai contoh — ganti dengan string acak"
  else ok "AUTH_SECRET terisi & cukup panjang"; fi
  [ -n "$(get ADMIN_USERNAME)" ] && ok "ADMIN_USERNAME terisi" || warn "ADMIN_USERNAME kosong (default: admin)"
else
  warn ".env belum ada — akan dibuat dari .env.example saat run-server"
fi
hr

# 5) Filesystem type — the usual SIGBUS culprit
printf '%s\n' "${c_bold}Pemeriksaan SIGBUS / filesystem${c_reset}"
fstype=""
if have df && df -PT "$ROOT" >/dev/null 2>&1; then
  fstype="$(df -PT "$ROOT" 2>/dev/null | awk 'NR==2{print $2}')"
elif have stat; then
  fstype="$(stat -f -c %T "$ROOT" 2>/dev/null || true)"
fi
if [ -n "$fstype" ]; then
  case "$fstype" in
    ext4|ext3|ext2|xfs|btrfs|zfs|apfs|hfs)
      ok "Filesystem proyek: $fstype (mendukung memory-mapped files)";;
    ntfs|fuseblk|exfat|vfat|msdos|cifs|smbfs|nfs|nfs4|9p|fuse*)
      bad "Filesystem proyek: $fstype — ini SERING menyebabkan SIGBUS pada Next.js!"
      warn "PINDAHKAN proyek ke disk Linux native (mis. di dalam \$HOME), lalu jalankan ulang.";;
    *)
      warn "Filesystem proyek: $fstype — jika muncul SIGBUS, pindahkan proyek ke disk Linux native (\$HOME).";;
  esac
else
  warn "Tidak bisa mendeteksi tipe filesystem."
fi

# 6) Memory + shared memory
if have free; then
  printf 'RAM: '; free -h | awk 'NR==2{print "total "$2", tersedia "$7}'
fi
if have df; then
  shm="$(df -h /dev/shm 2>/dev/null | awk 'NR==2{print $2" (terpakai "$5")"}')"
  [ -n "$shm" ] && printf '/dev/shm: %s\n' "$shm"
fi

# 7) Disk space for the project
if have df; then
  avail="$(df -h "$ROOT" 2>/dev/null | awk 'NR==2{print $4}')"
  [ -n "$avail" ] && ok "Sisa ruang disk: $avail"
fi
hr

# 8) Port availability
inuse=""
if have lsof; then inuse="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')"; fi
if [ -n "$inuse" ]; then warn "Port $PORT sedang dipakai (PID: $inuse). Pakai PORT lain bila perlu."; else ok "Port $PORT bebas"; fi

hr
printf '%s\n' "${c_bold}Selesai.${c_reset} Jika ada [FAIL]/[WARN] di atas, ikuti sarannya lalu jalankan run-server."

#!/usr/bin/env bash
# Change the admin password safely (Linux / macOS).
# Uses hidden input and updates the bcrypt hash in the database via a Node helper.
# The password is never shown, never stored in plaintext, never written to logs.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
cd "$ROOT" || die "Tidak bisa masuk ke folder proyek."

have node || die "Node.js belum terpasang."
[ -f "$ROOT/.env" ] || die ".env belum ada. Jalankan run-server dulu untuk membuatnya."
[ -d "$ROOT/node_modules" ] || die "node_modules belum ada. Jalankan run-server dulu (memasang dependencies)."

info "${c_bold}Ubah password admin${c_reset}"
info "Ketik password baru (tidak akan terlihat di layar)."

read -r -s -p "Masukkan password admin baru: " p1; echo
read -r -s -p "Ulangi password admin baru:  " p2; echo

if [ "$p1" != "$p2" ]; then unset p1 p2; die "Password tidak cocok. Tidak ada perubahan."; fi
if [ "${#p1}" -lt 6 ]; then unset p1 p2; die "Password terlalu pendek (minimal 6 karakter). Tidak ada perubahan."; fi

# Pipe the password to the Node helper via stdin (not arguments → not visible in process list).
if printf '%s' "$p1" | node scripts/set-admin-password.mjs; then
  unset p1 p2
  ok "Password admin berhasil diubah."
  info "Tidak perlu restart — perubahan langsung berlaku pada login berikutnya."
else
  unset p1 p2
  die "Gagal mengubah password. Lihat pesan di atas."
fi

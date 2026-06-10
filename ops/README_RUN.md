# Panduan Menjalankan Aplikasi HL Sales & Receivables

Folder **`ops/`** ini berisi semua alat untuk menjalankan, menghentikan, dan merawat
aplikasi dengan aman — cukup satu folder. Tidak perlu paham teknis; ikuti langkah di bawah.

> Aplikasi berjalan di komputer Anda sendiri dan dibuka lewat browser di
> **http://localhost:3000**.

---

## 🟦 Windows

| Tugas | Klik 2x file ini |
| --- | --- |
| **Menjalankan** aplikasi | `ops\windows\run-server.bat` (atau `run-windows.bat` di folder utama) |
| **Menghentikan** aplikasi | `ops\windows\stop-server.bat` (atau `stop-windows.bat`) |
| **Memulai ulang** | `ops\windows\restart-server.bat` |
| **Cek kesehatan** | `ops\windows\check-health.bat` |
| **Lihat status** | `ops\windows\show-status.bat` |
| **Ganti password admin** | `ops\windows\edit-password.bat` |
| **Diagnosa masalah** | `ops\doctor.bat` |

Setelah `run-server` selesai, buka browser ke **http://localhost:3000**.

---

## 🟩 Linux / macOS

Pertama kali, beri izin agar script bisa dijalankan (sekali saja):

```bash
chmod +x ops/linux/*.sh ops/doctor.sh run-linux.sh stop-linux.sh
```

| Tugas | Jalankan |
| --- | --- |
| **Menjalankan** aplikasi | `./run-linux.sh` (atau `ops/linux/run-server.sh`) |
| **Menghentikan** aplikasi | `./stop-linux.sh` (atau `ops/linux/stop-server.sh`) |
| **Memulai ulang** | `ops/linux/restart-server.sh` |
| **Cek kesehatan** | `ops/linux/check-health.sh` |
| **Lihat status** | `ops/linux/show-status.sh` |
| **Ganti password admin** | `ops/linux/edit-password.sh` |
| **Diagnosa masalah** | `ops/doctor.sh` |

Setelah selesai, buka browser ke **http://localhost:3000**.

---

## Apa yang dilakukan `run-server` secara otomatis

1. Mengecek Node.js & npm sudah terpasang.
2. Membuat file `.env` dari contoh bila belum ada.
3. Memasang dependencies bila `node_modules` belum ada.
4. Menyiapkan database dengan **migrasi yang aman** (tidak menghapus data Anda).
5. Membangun aplikasi (production build) bila perlu.
6. Menjalankan server, menyimpan PID di `ops/runtime/server.pid`, dan menulis log ke
   `ops/logs/server.log`.
7. Menunggu sampai server benar-benar siap, lalu menampilkan alamatnya.

Server **tidak** akan dijalankan dua kali — bila sudah berjalan, script memberi tahu.

---

## Mengganti password admin

Jalankan **edit-password** (lihat tabel di atas). Anda akan diminta mengetik password
baru **dua kali** (ketikan tidak terlihat di layar). Password baru langsung disimpan
secara aman (di-*hash*) ke database.

- Password **tidak pernah** disimpan sebagai teks biasa dan **tidak** ditampilkan kembali.
- **Tidak perlu** me-restart server — password baru langsung berlaku saat login berikutnya.

> Username admin diatur lewat `ADMIN_USERNAME` di `.env` (default: `admin`).

---

## Di mana log berada?

- Log server: **`ops/logs/server.log`**
- Log error tambahan (Windows): `ops/logs/server.err.log`
- PID server yang sedang berjalan: `ops/runtime/server.pid`

Bila ada masalah, buka `ops/logs/server.log` — pesan error lengkap ada di sana.

---

## Pemecahan masalah

### "Port 3000 sedang dipakai"
Ada aplikasi lain yang memakai port itu. Dua pilihan:
- Tutup aplikasi lain tersebut, atau
- Jalankan di port lain:
  - Linux/macOS: `PORT=3001 ./run-linux.sh`
  - Windows: `set PORT=3001` lalu jalankan `run-windows.bat`

### Gagal memasang dependencies (`npm install` error)
1. Pastikan ada koneksi internet.
2. Jalankan **doctor** (`ops/doctor.sh` atau `ops\doctor.bat`) untuk melihat penyebab.
3. Coba lagi `run-server`. (Download browser Puppeteer sudah otomatis dilewati supaya
   instalasi cepat & tidak gagal.)

### Aplikasi mati sendiri / error "SIGBUS" (Linux/macOS)
Ini hampir selalu karena folder proyek berada di **drive yang bukan disk Linux native**
(misalnya NTFS/exFAT/drive eksternal/jaringan). Solusi:
1. **Pindahkan folder proyek ke dalam `$HOME`** (mis. `~/HL-Project`), lalu jalankan ulang.
2. Jalankan `ops/doctor.sh` — ia akan memberi tahu tipe filesystem Anda dan memperingatkan
   bila berisiko.

### Server tidak merespons
Jalankan **check-health**. Bila statusnya bukan OK, lihat `ops/logs/server.log`, lalu
coba **restart-server**.

---

## Variabel lingkungan yang dibutuhkan (`.env`)

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ya | Koneksi database PostgreSQL (`postgresql://…`). |
| `AUTH_SECRET` | tidak | Opsional — bila kosong, build membuat secret acak otomatis. Isi (≥16 karakter) agar sesi login tetap valid antar-deploy. |
| `ADMIN_USERNAME` | ya | Username admin (default `admin`). |
| `ADMIN_PASSWORD` | ya* | Password awal admin saat database pertama kali dibuat. Setelah itu gunakan **edit-password**. |
| `PORT` | tidak | Port server (default `3000`). |

\* `ADMIN_PASSWORD` hanya dipakai saat *seed* pertama. **Jangan** menaruh password
sungguhan di file yang ikut ter-commit; ganti password lewat **edit-password**.

> ⚠️ Jangan pernah membagikan atau meng-commit file `.env` yang berisi rahasia asli.

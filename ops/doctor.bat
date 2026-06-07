@echo off
setlocal enableextensions enabledelayedexpansion
title HL Sales ^& Receivables - Doctor

pushd "%~dp0.." || (echo [ERROR] Tidak bisa masuk folder proyek.& pause & exit /b 1)
set "ROOT=%CD%"
if "%PORT%"=="" set "PORT=3000"

echo HL Sales ^& Receivables - Doctor
echo Folder proyek: %ROOT%
echo ------------------------------------------------------------

rem --- Node + npm ---
where node >nul 2>nul && (for /f "delims=" %%v in ('node -v') do echo [OK]   Node.js %%v) || echo [FAIL] Node.js tidak terpasang ^(pasang dari https://nodejs.org^)
where npm  >nul 2>nul && (for /f "delims=" %%v in ('npm -v') do echo [OK]   npm %%v)      || echo [FAIL] npm tidak ditemukan

rem --- Lockfile / deps ---
if exist "%ROOT%\package-lock.json" (echo [OK]   Lockfile: package-lock.json) else (echo [WARN] package-lock.json tidak ada)
if exist "%ROOT%\node_modules" (echo [OK]   node_modules terpasang) else (echo [WARN] node_modules belum ada - jalankan: npm install)
if exist "%ROOT%\node_modules\@prisma\client" (echo [OK]   Prisma Client tersedia) else (echo [WARN] Prisma Client belum di-generate - jalankan: npx prisma generate)

rem --- .env ---
if exist "%ROOT%\.env" (
  echo [OK]   .env ditemukan
  findstr /b /c:"DATABASE_URL=" "%ROOT%\.env" >nul && (echo [OK]   DATABASE_URL terisi) || echo [FAIL] DATABASE_URL kosong di .env
  findstr /b /c:"AUTH_SECRET=" "%ROOT%\.env" >nul && (echo [OK]   AUTH_SECRET ada) || echo [FAIL] AUTH_SECRET kosong di .env
  findstr /i /c:"change-me" "%ROOT%\.env" >nul && echo [WARN] Masih ada nilai contoh "change-me" di .env - ganti AUTH_SECRET/ADMIN_PASSWORD
) else (
  echo [WARN] .env belum ada - akan dibuat dari .env.example saat run-server
)
echo ------------------------------------------------------------

rem --- Disk + port ---
for /f "tokens=3" %%d in ('dir /-c "%ROOT%" ^| findstr /i "bytes free"') do set "FREE=%%d"
if defined FREE echo [OK]   Sisa ruang disk: %FREE% bytes
set "PORTPID="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"LISTENING" ^| findstr ":%PORT% "') do set "PORTPID=%%p"
if defined PORTPID (echo [WARN] Port %PORT% dipakai ^(PID %PORTPID%^)) else (echo [OK]   Port %PORT% bebas)

echo ------------------------------------------------------------
echo Catatan: SIGBUS umumnya masalah Linux/macOS saat proyek berada di drive
echo non-native ^(NTFS/exFAT/jaringan^). Di Windows, NTFS native biasanya aman.
echo Selesai. Ikuti saran [WARN]/[FAIL] di atas lalu jalankan run-server.
popd
pause
exit /b 0

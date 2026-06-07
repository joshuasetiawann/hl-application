@echo off
setlocal enableextensions
title HL Sales ^& Receivables - Ubah Password Admin

pushd "%~dp0..\.." || (echo [ERROR] Tidak bisa masuk folder proyek.& pause & exit /b 1)
set "ROOT=%CD%"

where node >nul 2>nul || (echo [ERROR] Node.js belum terpasang.& popd & pause & exit /b 1)
if not exist "%ROOT%\.env" (echo [ERROR] .env belum ada. Jalankan run-server dulu untuk membuatnya.& popd & pause & exit /b 1)
if not exist "%ROOT%\node_modules" (echo [ERROR] node_modules belum ada. Jalankan run-server dulu.& popd & pause & exit /b 1)

echo Ubah password admin.
echo Password tidak akan terlihat saat diketik.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$s1=Read-Host -AsSecureString 'Masukkan password admin baru'; $s2=Read-Host -AsSecureString 'Ulangi password admin baru '; $p1=[Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s1)); $p2=[Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2)); if($p1 -ne $p2){ Write-Host '[ERROR] Password tidak cocok. Tidak ada perubahan.'; exit 1 }; if($p1.Length -lt 6){ Write-Host '[ERROR] Password terlalu pendek (minimal 6 karakter).'; exit 1 }; $p1 | node scripts/set-admin-password.mjs; exit $LASTEXITCODE"
set "RC=%errorlevel%"

if not "%RC%"=="0" (echo [ERROR] Gagal mengubah password.& popd & pause & exit /b 1)
echo.
echo [OK] Password admin berhasil diubah. Tidak perlu restart server.
popd
pause
exit /b 0

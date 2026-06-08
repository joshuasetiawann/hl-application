@echo off
setlocal enableextensions enabledelayedexpansion
title HL Sales ^& Receivables - Run Server

rem --- Resolve project root (two levels up from ops\windows) ---
pushd "%~dp0..\.." || (echo [ERROR] Tidak bisa masuk folder proyek.& pause & exit /b 1)
set "ROOT=%CD%"
set "LOGDIR=%ROOT%\ops\logs"
set "RUNDIR=%ROOT%\ops\runtime"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
if not exist "%RUNDIR%" mkdir "%RUNDIR%"
set "LOG=%LOGDIR%\server.log"
set "ERRLOG=%LOGDIR%\server.err.log"
set "PIDF=%RUNDIR%\server.pid"
if "%PORT%"=="" set "PORT=3000"
set "URL=http://localhost:%PORT%"

echo HL Sales ^& Receivables - Menjalankan server
echo Folder proyek: %ROOT%

where node >nul 2>nul || (echo [ERROR] Node.js belum terpasang. Pasang dari https://nodejs.org & popd & pause & exit /b 1)
where npm  >nul 2>nul || (echo [ERROR] npm tidak ditemukan. Pasang Node.js. & popd & pause & exit /b 1)
for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
echo Package manager: npm  Node %NODEV%

rem --- .env ---
if not exist "%ROOT%\.env" (
  if exist "%ROOT%\.env.example" (
    copy /y "%ROOT%\.env.example" "%ROOT%\.env" >nul
    echo [WARNING] .env dibuat dari .env.example. Edit AUTH_SECRET dan ADMIN_PASSWORD sebelum dipakai serius.
  ) else (
    echo [ERROR] .env dan .env.example tidak ada.& popd & pause & exit /b 1
  )
)

rem --- Already running? ---
if exist "%PIDF%" (
  set /p OLDPID=<"%PIDF%"
  tasklist /fi "PID eq !OLDPID!" 2>nul | find "!OLDPID!" >nul && (
    echo [OK] Server sudah berjalan ^(PID !OLDPID!^) di %URL%
    popd & exit /b 0
  )
)

rem --- Port conflict (a process we did not start) ---
set "PORTPID="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"LISTENING" ^| findstr ":%PORT% "') do set "PORTPID=%%p"
if not "%PORTPID%"=="" (
  echo [ERROR] Port %PORT% dipakai proses lain ^(PID %PORTPID%^). Tutup proses itu atau jalankan dengan PORT lain.
  popd & pause & exit /b 1
)

rem --- Dependencies ---
if not exist "%ROOT%\node_modules" (
  echo Memasang dependencies ^(sekali saja, mohon tunggu^)...
  set "PUPPETEER_SKIP_DOWNLOAD=true"
  call npm install || (echo [ERROR] Gagal memasang dependencies.& popd & pause & exit /b 1)
)

rem --- Database (PostgreSQL; safe, non-destructive schema sync) ---
echo Menyiapkan database ^(sinkron skema aman, TIDAK menghapus data^)...
call npx prisma generate >>"%LOG%" 2>&1
call npx prisma db push  >>"%LOG%" 2>&1
call npm run db:seed     >>"%LOG%" 2>&1

rem --- Production build if needed ---
if not exist "%ROOT%\.next\BUILD_ID" (
  echo Membangun aplikasi ^(production build^)... pertama kali bisa beberapa menit.
  call npm run build >>"%LOG%" 2>&1 || (echo [ERROR] Build gagal. Lihat detail di %LOG%.& popd & pause & exit /b 1)
)

rem --- Start server detached, capture PID via PowerShell ---
echo Menjalankan server di %URL% ...
set "NEWPID="
for /f "delims=" %%i in ('powershell -NoProfile -Command "$env:PORT='%PORT%'; $p=Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','start' -WorkingDirectory '%ROOT%' -WindowStyle Hidden -PassThru -RedirectStandardOutput '%LOG%' -RedirectStandardError '%ERRLOG%'; $p.Id"') do set "NEWPID=%%i"
if "%NEWPID%"=="" (echo [ERROR] Gagal memulai server.& popd & pause & exit /b 1)
> "%PIDF%" echo %NEWPID%

rem --- Wait for health ---
echo Menunggu server siap...
set "UP="
for /l %%s in (1,1,90) do (
  if not defined UP (
    powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 '%URL%/api/health' ^| Out-Null; exit 0}catch{exit 1}" >nul 2>nul
    if not errorlevel 1 set "UP=1"
    if not defined UP timeout /t 1 /nobreak >nul
  )
)
if defined UP (
  echo [OK] Server siap di %URL%  ^(PID %NEWPID%^)
  echo Buka di browser: %URL%
  echo Log: %LOG%
) else (
  echo [ERROR] Server belum merespons dalam 90 detik. Cek log: %LOG%
  popd & pause & exit /b 1
)
popd
exit /b 0

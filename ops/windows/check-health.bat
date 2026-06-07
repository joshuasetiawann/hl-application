@echo off
setlocal enableextensions enabledelayedexpansion
title HL Sales ^& Receivables - Health Check

pushd "%~dp0..\.." || (echo [ERROR] Tidak bisa masuk folder proyek.& pause & exit /b 1)
set "ROOT=%CD%"
set "PIDF=%ROOT%\ops\runtime\server.pid"
if "%PORT%"=="" set "PORT=3000"
set "URL=http://localhost:%PORT%"
set "STATUS=OK"

echo HL Sales ^& Receivables - Pemeriksaan kesehatan
echo Folder proyek: %ROOT%
echo.

where node >nul 2>nul && (for /f "delims=" %%v in ('node -v') do echo Node.js        : %%v) || (echo Node.js        : TIDAK TERPASANG & set "STATUS=ERROR")
if exist "%ROOT%\package.json" (echo package.json   : ada) else (echo package.json   : TIDAK ADA & set "STATUS=ERROR")
if exist "%ROOT%\.env" (echo .env           : ada) else (echo .env           : TIDAK ADA & if "!STATUS!"=="OK" set "STATUS=WARNING")
if exist "%ROOT%\node_modules" (echo node_modules   : ada) else (echo node_modules   : belum dipasang & if "!STATUS!"=="OK" set "STATUS=WARNING")

rem --- Server process ---
set "RUNNING="
if exist "%PIDF%" (
  set /p SPID=<"%PIDF%"
  tasklist /fi "PID eq !SPID!" 2>nul | find "!SPID!" >nul && set "RUNNING=1"
)
if defined RUNNING (echo Proses server  : berjalan ^(PID !SPID!^)) else (echo Proses server  : mati & if "!STATUS!"=="OK" set "STATUS=WARNING")

rem --- HTTP health ---
powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 '%URL%/api/health' ^| Out-Null; exit 0}catch{exit 1}" >nul 2>nul
if not errorlevel 1 (echo HTTP health    : OK ^(%URL%/api/health^)) else (echo HTTP health    : tidak merespons & if "!STATUS!"=="OK" set "STATUS=WARNING")

echo.
echo Status keseluruhan: !STATUS!
if "!STATUS!"=="ERROR" (popd & exit /b 1)
if "!STATUS!"=="WARNING" (popd & exit /b 2)
popd
exit /b 0

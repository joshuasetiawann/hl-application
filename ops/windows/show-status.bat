@echo off
setlocal enableextensions enabledelayedexpansion
title HL Sales ^& Receivables - Status

pushd "%~dp0..\.." || (echo [ERROR] Tidak bisa masuk folder proyek.& pause & exit /b 1)
set "ROOT=%CD%"
set "PIDF=%ROOT%\ops\runtime\server.pid"
set "LOG=%ROOT%\ops\logs\server.log"
if "%PORT%"=="" set "PORT=3000"
set "URL=http://localhost:%PORT%"

echo HL Sales ^& Receivables - Status
echo Folder proyek : %ROOT%

set "RUNNING="
if exist "%PIDF%" (
  set /p SPID=<"%PIDF%"
  tasklist /fi "PID eq !SPID!" 2>nul | find "!SPID!" >nul && set "RUNNING=1"
)
if defined RUNNING (echo Server        : BERJALAN ^(PID !SPID!^)) else (echo Server        : MATI)
echo URL           : %URL%
echo Package mgr   : npm
where node >nul 2>nul && (for /f "delims=" %%v in ('node -v') do echo Node          : %%v) || echo Node          : tidak terpasang
if exist "%ROOT%\.env" (echo File .env     : ada) else (echo File .env     : TIDAK ADA)
if exist "%ROOT%\node_modules" (echo node_modules  : ada) else (echo node_modules  : belum dipasang)
if exist "%ROOT%\.next\BUILD_ID" (echo Build (.next) : ada) else (echo Build (.next) : belum di-build)
echo Log terbaru   : %LOG%
popd
exit /b 0

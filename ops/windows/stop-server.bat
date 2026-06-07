@echo off
setlocal enableextensions enabledelayedexpansion
title HL Sales ^& Receivables - Stop Server

pushd "%~dp0..\.." || (echo [ERROR] Tidak bisa masuk folder proyek.& pause & exit /b 1)
set "ROOT=%CD%"
set "RUNDIR=%ROOT%\ops\runtime"
set "PIDF=%RUNDIR%\server.pid"
if "%PORT%"=="" set "PORT=3000"

rem --- Stop by recorded PID (kills the whole process tree with /T) ---
if exist "%PIDF%" (
  set /p SPID=<"%PIDF%"
  if not "!SPID!"=="" (
    tasklist /fi "PID eq !SPID!" 2>nul | find "!SPID!" >nul && (
      echo Menghentikan server ^(PID !SPID!^)...
      taskkill /PID !SPID! /T /F >nul 2>nul
      del "%PIDF%" >nul 2>nul
      echo [OK] Server dihentikan.
      popd & exit /b 0
    )
  )
  del "%PIDF%" >nul 2>nul
)

rem --- Fallback: stop only the process on our port ---
set "PORTPID="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"LISTENING" ^| findstr ":%PORT% "') do set "PORTPID=%%p"
if "%PORTPID%"=="" (
  echo [OK] Tidak ada server yang berjalan ^(port %PORT% kosong^).
  popd & exit /b 0
)
echo [WARNING] Tidak ada PID tersimpan, menghentikan proses pada port %PORT% ^(PID %PORTPID%^)...
taskkill /PID %PORTPID% /T /F >nul 2>nul
echo [OK] Selesai.
popd
exit /b 0

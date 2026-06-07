@echo off
setlocal enableextensions
title HL Sales ^& Receivables - Restart Server

echo Memulai ulang server...
call "%~dp0stop-server.bat"
timeout /t 1 /nobreak >nul
call "%~dp0run-server.bat"
exit /b %errorlevel%

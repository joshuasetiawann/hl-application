@echo off
rem Convenience launcher - starts the HL app. Delegates to ops\windows\run-server.bat.
call "%~dp0ops\windows\run-server.bat" %*
exit /b %errorlevel%

@echo off
rem Convenience launcher - stops the HL app. Delegates to ops\windows\stop-server.bat.
call "%~dp0ops\windows\stop-server.bat" %*
exit /b %errorlevel%

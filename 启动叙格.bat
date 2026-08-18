@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-storyboard.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. See the message above.
  pause
)
endlocal

@echo off
setlocal
cd /d "%~dp0"
node "%~dp0scripts\start-storyboard.mjs"
if errorlevel 1 (
  echo.
  echo Startup failed. See the message above.
  pause
)
endlocal

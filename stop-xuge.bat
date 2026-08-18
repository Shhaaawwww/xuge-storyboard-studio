@echo off
setlocal
cd /d "%~dp0"
node "%~dp0scripts\stop-storyboard.mjs"
if errorlevel 1 (
  echo.
  pause
)
endlocal

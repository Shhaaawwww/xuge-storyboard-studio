@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if not defined NODE_EXE if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_EXE=%NVM_SYMLINK%\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo Node.js was not found, so Xuge could not run the stop command.
  if not defined CI pause
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "PATH=%%~dpI;%PATH%"
"%NODE_EXE%" "%~dp0scripts\stop-storyboard.mjs"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  if not defined CI pause
)
endlocal & exit /b %EXIT_CODE%

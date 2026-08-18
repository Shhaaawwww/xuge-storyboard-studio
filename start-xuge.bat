@echo off
setlocal
cd /d "%~dp0"

if not exist "%~dp0scripts\start-storyboard.mjs" (
  echo.
  echo Xuge cannot find the project files.
  echo If you opened this file inside a ZIP archive, choose "Extract All" first,
  echo then run start-xuge.bat from the extracted folder.
  if not defined CI pause
  exit /b 1
)

set "NODE_EXE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if not defined NODE_EXE if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_EXE=%NVM_SYMLINK%\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo.
  echo Node.js was not found. Xuge needs Node.js 20.19+ or 22.12+.
  echo The official download page will open now. Install the LTS version,
  echo then double-click start-xuge.bat again.
  if not defined XUGE_NO_OPEN start "" "https://nodejs.org/en/download"
  if not defined CI pause
  exit /b 1
)

for %%I in ("%NODE_EXE%") do set "PATH=%%~dpI;%PATH%"
"%NODE_EXE%" "%~dp0scripts\start-storyboard.mjs"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Startup failed. See the message above.
  if not defined CI pause
)
endlocal & exit /b %EXIT_CODE%

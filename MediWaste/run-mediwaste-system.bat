@echo off
setlocal EnableExtensions EnableDelayedExpansion
title MedWaste VerifyPoint - full system
cd /d "%~dp0"

set "APP_PORT=3000"

echo ============================================================
echo  MedWaste VerifyPoint - full local system
echo  Folder: %CD%
echo ------------------------------------------------------------
echo  Starts the web app and opens the station simulator page.
echo  Everything runs on the built-in demo data - no Firebase,
echo  no Java, no emulators required.
echo ============================================================
echo.

call :check_node
if errorlevel 1 goto :failed

call :ensure_deps
if errorlevel 1 goto :failed

call :ensure_env
call :pick_port
call :run_app

echo.
echo Dev server stopped.
endlocal
exit /b 0

rem ===========================================================================
:check_node
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH.
  echo         Install Node.js 20 or newer from https://nodejs.org/ and run this file again.
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set "NODEVER=%%v"
echo [ok]   Node.js !NODEVER!
exit /b 0

rem ===========================================================================
:ensure_deps
if exist "node_modules\" (
  echo [ok]   Dependencies present.
  exit /b 0
)
echo [....] First run - installing npm dependencies ^(this can take a few minutes^)...
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed. Fix the errors above and run this file again.
  exit /b 1
)
echo [ok]   Dependencies installed.
exit /b 0

rem ===========================================================================
:ensure_env
if exist ".env.local" exit /b 0
if not exist ".env.example" exit /b 0
copy /y ".env.example" ".env.local" >nul 2>&1
if exist ".env.local" echo [ok]   Created .env.local from .env.example
exit /b 0

rem ===========================================================================
:pick_port
set "APP_PORT="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\launcher.ps1" free-port 2^>nul`) do set "APP_PORT=%%P"
if "!APP_PORT!"=="" set "APP_PORT=3000"
exit /b 0

rem ===========================================================================
:run_app
echo.
echo ============================================================
echo  App:           http://localhost:!APP_PORT!
echo  Station sim:   http://localhost:!APP_PORT!/simulator
echo  Data:          built-in demo data (no Firebase required)
echo  Stop with Ctrl+C in this window.
echo ============================================================
echo.

start "" /b cmd /c "ping -n 12 127.0.0.1 >nul 2>&1 & explorer http://localhost:!APP_PORT!/simulator"
call npx --no-install next dev --turbopack -p !APP_PORT!
if errorlevel 1 (
  echo.
  echo [ERROR] The Next.js dev server exited unexpectedly.
  exit /b 1
)
exit /b 0

rem ===========================================================================
:failed
echo.
echo Press any key to close this window...
pause >nul
endlocal
exit /b 1

@echo off
chcp 65001 >nul
title AI Video Creation Tool

echo.
echo  ======================================
echo    Welcome to AI Video Creation Tool
echo  ======================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Please install it first:
    echo          https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  [INFO] Dependencies not found. Installing...
    npm install
    echo.
)

echo  [INFO] Starting server...
start /b node server.js

timeout /t 2 /nobreak >nul

echo  [INFO] Opening browser...
start http://localhost:3000

echo.
echo  ======================================
echo  [OK] Server is running!
echo  [TIP] Video directory: config.json - videoDir
echo  [TIP] To change video files, edit config.json
echo  ======================================
echo.
echo  Close this window to stop the server.
echo  Or press Ctrl+C to stop, then close.
echo.
pause >nul

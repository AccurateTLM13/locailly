@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH.
  echo Install Node.js 18 or newer, then run this file again.
  pause
  exit /b 1
)

if "%LOCAL_AI_HOST%"=="" set "LOCAL_AI_HOST=127.0.0.1"
if "%LOCAL_AI_PORT%"=="" set "LOCAL_AI_PORT=31313"

echo Starting Local AI Platform...
echo Server: http://%LOCAL_AI_HOST%:%LOCAL_AI_PORT%
echo.
node companion\server.js

echo.
echo Local AI Platform stopped.
pause

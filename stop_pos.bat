@echo off
title Stop Nani Fry POS Server
echo ===================================================
echo   Stopping NANI FRYS POS Server (Port 5000)...
echo ===================================================
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R ":5000 "') do (
    echo Killing Process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo [+] POS API Server on port 5000 has been stopped.
timeout /t 2 /nobreak >nul

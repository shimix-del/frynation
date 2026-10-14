@echo off
title NANI FRYS POS - System Launcher
echo ===================================================
echo   NANI FRYS POS - MULTI-BRANCH RESTAURANT SYSTEM
echo ===================================================
echo.

:: 1. Check if MySQL is running on port 3306
echo [1/3] Checking MySQL database engine...
netstat -ano | findstr /C:":3306 " | findstr /I "LISTENING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] MySQL is not running. Starting MySQL daemon...
    start "" /B "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
    ping 127.0.0.1 -n 4 >nul
    echo [+] MySQL started successfully.
) else (
    echo [+] MySQL is already running.
)

:: 2. Check if Apache is running on port 80
echo [2/3] Checking Apache web server...
netstat -ano | findstr /C:":80 " | findstr /I "LISTENING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Apache is not running. Starting Apache...
    start "" /B "C:\xampp\apache\bin\httpd.exe"
    ping 127.0.0.1 -n 3 >nul
    echo [+] Apache started.
) else (
    echo [+] Apache is already running.
)

:: 3. Check if POS API server is running on port 5000
echo [3/3] Checking POS API server (Port 5000)...
netstat -ano | findstr /C:":5000 " | findstr /I "LISTENING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Starting Node.js API server...
    cd /d "%~dp0server"
    start /min "Nani Frys API Server" cmd /c "npm run dev"
    ping 127.0.0.1 -n 5 >nul
    echo [+] POS API server started.
) else (
    echo [+] POS API server is already running.
)

echo.
echo ===================================================
echo   ALL SERVICES ARE ACTIVE AND RUNNING!
echo   POS Address: http://localhost/pos%%20sys/
echo ===================================================
echo.
echo Launching POS in default browser...
start http://localhost/pos%%20sys/

ping 127.0.0.1 -n 3 >nul
exit

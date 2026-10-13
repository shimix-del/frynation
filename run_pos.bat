@echo off
title NANI FRYS POS - System Launcher
echo ===================================================
echo   NANI FRYS POS - MULTI-BRANCH RESTAURANT SYSTEM
echo ===================================================
echo.

:: 1. Check if MySQL is running on port 3306
echo [1/3] Checking MySQL database engine...
netstat -ano | findstr /R ":3306 " >nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] MySQL is not running. Starting MySQL daemon...
    start "" /B "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
    timeout /t 3 /nobreak >nul
    echo [+] MySQL started successfully.
) else (
    echo [+] MySQL is already running.
)

:: 2. Check if Apache is running on port 80
echo [2/3] Checking Apache web server...
netstat -ano | findstr /R ":80 " >nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Apache is not running. Starting Apache...
    start "" /B "C:\xampp\apache\bin\httpd.exe"
    timeout /t 2 /nobreak >nul
    echo [+] Apache started.
) else (
    echo [+] Apache is already running.
)

:: 3. Check if POS API server is running on port 5000
echo [3/3] Checking POS API server (Port 5000)...
netstat -ano | findstr /R ":5000 " >nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Starting Node.js API server...
    cd /d "%~dp0server"
    start "Nani Frys API Server" cmd /c "npm run dev"
    timeout /t 3 /nobreak >nul
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

timeout /t 3 /nobreak >nul
exit

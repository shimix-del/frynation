Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "  NANI FRYS POS - MULTI-BRANCH RESTAURANT SYSTEM" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Yellow

# 1. Check MySQL on port 3306
$mysql = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if (-not $mysql) {
    Write-Host "[!] Starting MySQL on port 3306..." -ForegroundColor Cyan
    Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList '--defaults-file="C:\xampp\mysql\bin\my.ini" --standalone' -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "[+] MySQL is already running." -ForegroundColor Green
}

# 2. Check Apache on port 80
$apache = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
if (-not $apache) {
    Write-Host "[!] Starting Apache web server..." -ForegroundColor Cyan
    Start-Process -FilePath "C:\xampp\apache\bin\httpd.exe" -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[+] Apache is already running." -ForegroundColor Green
}

# 3. Check Node Server on port 5000
$server = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if (-not $server) {
    Write-Host "[!] Starting POS API Server on port 5000..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$PSScriptRoot\server`" && npm run dev" -WindowStyle Minimized
    Start-Sleep -Seconds 4
} else {
    Write-Host "[+] POS API Server is already running." -ForegroundColor Green
}

# 4. Launch Browser
Write-Host "[+] Opening NANI FRYS POS in browser..." -ForegroundColor Yellow
Start-Process "http://localhost/pos%20sys/"

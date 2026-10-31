$ErrorActionPreference = 'Continue'

Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "  STOPPING NANI FRYS POS & XAMPP SERVICES" -ForegroundColor Red
Write-Host "===================================================" -ForegroundColor Yellow

# 1. Stop Node Server on Port 5000
$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Host "[!] Stopping POS API server (PID: $($port5000.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $port5000.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "[+] POS API server stopped." -ForegroundColor Green
} else {
    Write-Host "[-] POS API server was not running." -ForegroundColor Gray
}

# 2. Stop Apache (httpd.exe)
$apache = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
if ($apache) {
    Write-Host "[!] Stopping Apache web server..." -ForegroundColor Yellow
    Stop-Process -Name "httpd" -Force -ErrorAction SilentlyContinue
    Write-Host "[+] Apache stopped." -ForegroundColor Green
} else {
    Write-Host "[-] Apache was not running." -ForegroundColor Gray
}

# 3. Stop MySQL (mysqld.exe)
$mysql = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if ($mysql) {
    Write-Host "[!] Stopping MySQL database..." -ForegroundColor Yellow
    Stop-Process -Name "mysqld" -Force -ErrorAction SilentlyContinue
    Write-Host "[+] MySQL stopped." -ForegroundColor Green
} else {
    Write-Host "[-] MySQL was not running." -ForegroundColor Gray
}

Write-Host "===================================================" -ForegroundColor Green
Write-Host "  All POS and XAMPP services have been stopped." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Start-Sleep -Seconds 2

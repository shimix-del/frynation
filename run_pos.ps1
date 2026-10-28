$ErrorActionPreference = 'Continue'

Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "  NANI FRYS POS - LOCAL RESTAURANT SYSTEM" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Yellow

$installRoot = $PSScriptRoot

# 1. Check MySQL on port 3306
$mysql = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if (-not $mysql) {
    Write-Host "[!] Starting MySQL on port 3306..." -ForegroundColor Cyan
    $mysqlExe = "C:\xampp\mysql\bin\mysqld.exe"
    $mysqlIni = "C:\xampp\mysql\bin\my.ini"
    if (Test-Path -LiteralPath $mysqlExe) {
        Start-Process -FilePath $mysqlExe -ArgumentList "--defaults-file=`"$mysqlIni`" --standalone" -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "[+] MySQL database is active." -ForegroundColor Green
}

# 2. Check Apache on port 80
$apache = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
if (-not $apache) {
    Write-Host "[!] Starting Apache web server..." -ForegroundColor Cyan
    $apacheExe = "C:\xampp\apache\bin\httpd.exe"
    if (Test-Path -LiteralPath $apacheExe) {
        Start-Process -FilePath $apacheExe -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "[+] Apache web server is active." -ForegroundColor Green
}

# 3. Check POS Node API Server on port 5000
$server = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if (-not $server) {
    Write-Host "[!] Starting POS API Server on port 5000..." -ForegroundColor Cyan
    $nodePath = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if (-not $nodePath) { $nodePath = 'node.exe' }
    $serverDist = Join-Path $installRoot 'server\dist\index.js'
    Start-Process -FilePath $nodePath -ArgumentList "`"$serverDist`"" -WorkingDirectory (Join-Path $installRoot 'server') -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[+] POS API server is active." -ForegroundColor Green
}

# 4. Open POS application
$targetUrl = "http://localhost/pos%20sys/"
Write-Host "[+] Opening Nani Frys POS: $targetUrl" -ForegroundColor Yellow

$edgePath = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList "--app=$targetUrl"
} else {
    Start-Process $targetUrl
}

Write-Host "POS is running!" -ForegroundColor Green
Start-Sleep -Seconds 2

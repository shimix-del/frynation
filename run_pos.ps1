$ErrorActionPreference = 'Continue'

Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "  NANI FRYS POS - LOCAL RESTAURANT SYSTEM" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Yellow

$installRoot = $PSScriptRoot

function Test-Port([int]$port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect('127.0.0.1', $port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(400, $false)
        if ($success -and $tcp.Connected) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    } catch {
        return $false
    }
}

# 1. Start MySQL on port 3306 if not running
if (-not (Test-Port 3306)) {
    Write-Host "[!] Starting MySQL database on port 3306..." -ForegroundColor Cyan
    $mysqlExe = "C:\xampp\mysql\bin\mysqld.exe"
    $mysqlIni = "C:\xampp\mysql\bin\my.ini"
    if (Test-Path -LiteralPath $mysqlExe) {
        Start-Process -FilePath $mysqlExe -ArgumentList "--defaults-file=`"$mysqlIni`" --standalone" -WorkingDirectory "C:\xampp\mysql" -WindowStyle Hidden
        $ready = $false
        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Milliseconds 500
            if (Test-Port 3306) { $ready = $true; break }
        }
        if ($ready) {
            Write-Host "[+] MySQL database is now ready." -ForegroundColor Green
        } else {
            Write-Host "[!] MySQL is taking longer to start, continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[-] MySQL executable not found at $mysqlExe" -ForegroundColor Red
    }
} else {
    Write-Host "[+] MySQL database is active." -ForegroundColor Green
}

# 2. Start Apache on port 80 if not running
if (-not (Test-Port 80)) {
    Write-Host "[!] Starting Apache web server on port 80..." -ForegroundColor Cyan
    $apacheExe = "C:\xampp\apache\bin\httpd.exe"
    if (Test-Path -LiteralPath $apacheExe) {
        Start-Process -FilePath $apacheExe -WorkingDirectory "C:\xampp\apache" -WindowStyle Hidden
        $ready = $false
        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Milliseconds 500
            if (Test-Port 80) { $ready = $true; break }
        }
        if ($ready) {
            Write-Host "[+] Apache web server is now ready." -ForegroundColor Green
        } else {
            Write-Host "[!] Apache is taking longer to start, continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[-] Apache executable not found at $apacheExe" -ForegroundColor Red
    }
} else {
    Write-Host "[+] Apache web server is active." -ForegroundColor Green
}

# 3. Start POS Node API Server on port 5000 if not running
if (-not (Test-Port 5000)) {
    Write-Host "[!] Starting POS API Server on port 5000..." -ForegroundColor Cyan
    $nodePath = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if (-not $nodePath) { $nodePath = 'node.exe' }
    $serverDist = Join-Path $installRoot 'server\dist\index.js'
    Start-Process -FilePath $nodePath -ArgumentList "`"$serverDist`"" -WorkingDirectory (Join-Path $installRoot 'server') -WindowStyle Hidden
    
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/health' -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($health.status -eq 'healthy') {
                $ready = $true
                break
            }
        } catch {}
    }
    if ($ready) {
        Write-Host "[+] POS API server is now ready." -ForegroundColor Green
    } else {
        Write-Host "[!] POS API server starting in background..." -ForegroundColor Yellow
    }
} else {
    Write-Host "[+] POS API server is active." -ForegroundColor Green
}

# 4. Open POS application in dedicated Edge POS app window or default browser
$targetUrl = "http://localhost/pos%20sys/"
Write-Host "[+] Opening Nani Frys POS: $targetUrl" -ForegroundColor Yellow

$edgeCandidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
$edgePath = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if ($edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList "--app=$targetUrl"
} else {
    Start-Process $targetUrl
}

Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Nani Frys POS is running!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Start-Sleep -Seconds 2

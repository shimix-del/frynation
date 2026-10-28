$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$installRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$statusWindow = New-Object Windows.Forms.Form
$statusWindow.Text = 'Nani Frys POS'
$statusWindow.Size = New-Object Drawing.Size(430,160)
$statusWindow.StartPosition = 'CenterScreen'
$statusLabel = New-Object Windows.Forms.Label
$statusLabel.Text = 'Starting Nani Frys POS. Please wait...'
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object Drawing.Point(24,35)
$statusWindow.Controls.Add($statusLabel)
$statusWindow.Show()
[Windows.Forms.Application]::DoEvents()

try {
  # 1. Start MySQL on port 3306 if not running
  $mysqlListening = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
  if (-not $mysqlListening) {
    $statusLabel.Text = 'Starting MySQL database...'
    [Windows.Forms.Application]::DoEvents()
    $mysqlExe = 'C:\xampp\mysql\bin\mysqld.exe'
    $mysqlIni = 'C:\xampp\mysql\bin\my.ini'
    if (Test-Path -LiteralPath $mysqlExe) {
      Start-Process -FilePath $mysqlExe -ArgumentList "--defaults-file=`"$mysqlIni`" --standalone" -WindowStyle Hidden
    }
  }

  # 2. Start Apache on port 80 if not running
  $apacheListening = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
  if (-not $apacheListening) {
    $statusLabel.Text = 'Starting Apache web server...'
    [Windows.Forms.Application]::DoEvents()
    $apacheExe = 'C:\xampp\apache\bin\httpd.exe'
    if (Test-Path -LiteralPath $apacheExe) {
      Start-Process -FilePath $apacheExe -WindowStyle Hidden
    }
  }

  # 3. Start Node POS API Server on port 5000 if not running
  $nodeListening = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
  if (-not $nodeListening) {
    $statusLabel.Text = 'Starting POS API server...'
    [Windows.Forms.Application]::DoEvents()
    $nodePath = Join-Path $installRoot 'runtime\node.exe'
    if (!(Test-Path -LiteralPath $nodePath)) {
      $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    }
    $serverDist = Join-Path $installRoot 'server\dist\index.js'
    Start-Process -FilePath $nodePath -ArgumentList "`"$serverDist`"" -WorkingDirectory (Join-Path $installRoot 'server') -WindowStyle Hidden
  }

  # 4. Wait for local API to respond
  $statusLabel.Text = 'Connecting to POS...'
  [Windows.Forms.Application]::DoEvents()
  $ready = $false
  for ($attempt=0; $attempt -lt 40; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/health' -TimeoutSec 2
      if ($health.status -eq 'healthy') {
        $ready = $true
        break
      }
    } catch {}
    [Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 500
  }

  # 5. Launch in dedicated Edge POS app window or default browser
  $targetUrl = 'http://localhost/pos%20sys/'
  $edgePath = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList "--app=$targetUrl"
  } else {
    Start-Process $targetUrl
  }
} catch {
  [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Nani Frys needs attention') | Out-Null
} finally {
  $statusWindow.Close()
}

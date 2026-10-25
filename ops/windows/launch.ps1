$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$installRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$statusWindow = New-Object Windows.Forms.Form
$statusWindow.Text = 'Nani Frys POS'
$statusWindow.Size = New-Object Drawing.Size(430,160)
$statusWindow.StartPosition = 'CenterScreen'
$statusLabel = New-Object Windows.Forms.Label
$statusLabel.Text = 'Starting Nani Frys. Please wait...'
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object Drawing.Point(24,35)
$statusWindow.Controls.Add($statusLabel)
$statusWindow.Show()
[Windows.Forms.Application]::DoEvents()
try {
  $nodePath = Join-Path $installRoot 'runtime\node.exe'
  if (!(Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe -ErrorAction Stop).Source }
  Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $PSScriptRoot 'supervisor.cjs') + '"') -WorkingDirectory $installRoot -WindowStyle Hidden
  $ready = $false
  for ($attempt=0; $attempt -lt 60; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:5050/api/health' -TimeoutSec 2
      if ($health.database -eq 'connected' -and $health.system -like '*NANI FRYS*') { $ready = $true; break }
    } catch {}
    [Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'The local database or POS server could not start. Contact the manager and try the icon again.' }
  $edgePath = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($edgePath) { Start-Process -FilePath $edgePath -ArgumentList '--app=http://127.0.0.1:5050/' }
  else { Start-Process 'http://127.0.0.1:5050/' }
} catch { [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Nani Frys needs attention') | Out-Null }
finally { $statusWindow.Close() }

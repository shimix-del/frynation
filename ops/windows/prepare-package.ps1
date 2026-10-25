param([string]$Destination = 'C:\xampp\htdocs\nanifrys-shop-installer', [string]$RuntimeSource)
$ErrorActionPreference = 'Stop'
$source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (!$RuntimeSource) { $RuntimeSource = Join-Path $source 'release\shop-runtime\node-v22.23.4-win-x64' }
if (!(Test-Path -LiteralPath "$RuntimeSource\node.exe")) { throw 'A verified Windows Node 22 runtime must be prepared first.' }
if (Test-Path -LiteralPath $Destination) { throw 'Package destination already exists; choose a fresh directory.' }
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
'Require all denied' | Set-Content -LiteralPath (Join-Path $Destination '.htaccess') -Encoding ASCII
foreach ($folder in @('server', 'client', 'ops')) { New-Item -ItemType Directory -Path (Join-Path $Destination $folder) | Out-Null }
foreach ($item in @('dist', 'node_modules', 'prisma', 'package.json', 'package-lock.json')) {
  Copy-Item -LiteralPath (Join-Path "$source\server" $item) -Destination "$Destination\server" -Recurse
}
Copy-Item -LiteralPath "$source\client\dist" -Destination "$Destination\client" -Recurse
Copy-Item -LiteralPath "$source\ops\windows" -Destination "$Destination\ops" -Recurse
Copy-Item -LiteralPath "$source\ops\replica-schema.sql" -Destination "$Destination\ops"
New-Item -ItemType Directory -Path "$Destination\runtime" | Out-Null
Copy-Item -LiteralPath "$RuntimeSource\node.exe", "$RuntimeSource\LICENSE" -Destination "$Destination\runtime"
(Get-FileHash -LiteralPath "$Destination\runtime\node.exe" -Algorithm SHA256).Hash | Set-Content -LiteralPath "$Destination\runtime\node.exe.sha256" -Encoding ASCII
@'
@echo off
call "%~dp0ops\windows\Install Nani Frys.cmd"
'@ | Set-Content -LiteralPath "$Destination\Install Nani Frys.cmd" -Encoding ASCII
Copy-Item -LiteralPath "$PSScriptRoot\README.md" -Destination "$Destination\READ-ME-FIRST.md"
$commit = & git -C $source rev-parse HEAD
@{ sourceCommit=$commit; preparedAt=(Get-Date).ToString('o'); target='Windows 10 or 11 x64 main shop computer'; database='mombasam_nanifrys'; privateCredentialsIncluded=$false; cloudModeChanged=$false } | ConvertTo-Json | Set-Content -LiteralPath "$Destination\package-info.json" -Encoding UTF8
$forbidden = Get-ChildItem -LiteralPath $Destination -Recurse -Force -File | Where-Object { $_.Name -in @('.env','shop.env','backup.cnf','private-backend-credentials.json') }
if ($forbidden) { throw 'Unexpected private configuration found. Do not distribute this package.' }
Write-Output "Prepared shop installation package: $Destination"

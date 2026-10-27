$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (!(Test-Path -LiteralPath (Join-Path $env:ProgramData 'NaniFrys\shop.env'))) { throw 'Complete private shop setup and pairing first.' }
$nodePath = Join-Path $root 'runtime\node.exe'
if (!(Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe -ErrorAction Stop).Source }
Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $PSScriptRoot 'supervisor.cjs') + '"') -WorkingDirectory $root -WindowStyle Hidden

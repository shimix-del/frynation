$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$env:DOTENV_CONFIG_PATH = Join-Path $env:ProgramData 'NaniFrys\shop.env'
Push-Location "$root\server"
try {
  $nodePath = Join-Path $root 'runtime\node.exe'
  if (!(Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe).Source }
  & $nodePath -r dotenv/config dist/replica/bootstrap.js
  if ($LASTEXITCODE -ne 0) { throw 'Pairing failed; the shop is not ready to trade.' }
} finally { Pop-Location }

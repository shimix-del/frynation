$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$nodePath = Join-Path $root 'runtime\node.exe'
if (!(Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe -ErrorAction Stop).Source }
$process = Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $PSScriptRoot 'supervisor.cjs') + '"') -WorkingDirectory $root -WindowStyle Hidden -PassThru -Wait
exit $process.ExitCode

param([Parameter(Mandatory=$true)][string]$Backup, [string]$AdminDefaultsFile)
$ErrorActionPreference = 'Stop'
$backupPath = (Resolve-Path -LiteralPath $Backup).Path
$expected = (Get-Content -LiteralPath ($backupPath + '.sha256') -Raw).Trim()
if ((Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash -ne $expected) { throw 'Backup checksum does not match. Nothing restored.' }
$recoveryDatabase = 'nanifrys_recovery_' + (Get-Date -Format yyyyMMdd_HHmmss)
$mysql = 'C:\xampp\mysql\bin\mysql.exe'
$arguments = @('--host=127.0.0.1', '--user=root')
if ($AdminDefaultsFile) { $arguments = @('--defaults-extra-file=' + (Resolve-Path -LiteralPath $AdminDefaultsFile).Path) }
& $mysql @arguments --execute="CREATE DATABASE $recoveryDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
if ($LASTEXITCODE -ne 0) { throw 'Could not create the separate recovery database.' }
$sourcePath = $backupPath.Replace('\','/')
& $mysql @arguments $recoveryDatabase --execute="source $sourcePath"
if ($LASTEXITCODE -ne 0) { throw "Restore failed. Inspect the separate database $recoveryDatabase. The working shop database was not replaced." }
& $mysql @arguments $recoveryDatabase --execute='SELECT (SELECT COUNT(*) FROM `Order`) AS orders, (SELECT COUNT(*) FROM Payment) AS payments, (SELECT COUNT(*) FROM User) AS staff;'
Write-Output "Backup restored into $recoveryDatabase. Compare records before a manager changes the app configuration. The working shop database was not replaced."

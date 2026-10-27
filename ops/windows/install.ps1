param([string]$InstallRoot = 'C:\xampp\htdocs\nanifrys', [string]$BackupDirectory, [string]$BaseDataFile)
$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
foreach ($required in @('server\dist\index.js', 'server\node_modules\prisma\build\index.js', 'client\dist\index.html')) {
  if (!(Test-Path -LiteralPath (Join-Path $sourceRoot $required))) { throw 'The installation package is incomplete. Build and package it first.' }
}
$privateRoot = Join-Path $env:ProgramData 'NaniFrys'
if (Test-Path -LiteralPath $InstallRoot) { throw 'Installation folder already exists. Back up and use a reviewed upgrade; it will not be overwritten.' }
if (Test-Path -LiteralPath (Join-Path $privateRoot 'shop.env')) { throw 'Private configuration already exists; refusing to overwrite it.' }
if (![Environment]::Is64BitOperatingSystem) { throw 'This package requires 64-bit Windows 10 or 11.' }
$nodePath = Join-Path $sourceRoot 'runtime\node.exe'
if (!(Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe).Source }
if ((& $nodePath -p 'process.versions.node.split(".")[0]') -ne '22') { throw 'Install the Node.js 22 runtime on the shop computer first.' }
$mysql = 'C:\xampp\mysql\bin\mysql.exe'
$dump = 'C:\xampp\mysql\bin\mysqldump.exe'
if (!(Test-Path $mysql) -or !(Test-Path $dump)) { throw 'XAMPP database tools are missing.' }
& $mysql --host=127.0.0.1 --user=root --batch --skip-column-names --execute='SELECT VERSION()'
if ($LASTEXITCODE -ne 0) { throw 'Local database administrator access is needed. Do not put its password in chat.' }
$existing = & $mysql --host=127.0.0.1 --user=root --batch --skip-column-names --execute="SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='mombasam_nanifrys'"
if ($LASTEXITCODE -ne 0) { throw 'Could not check the local database safely.' }
if ($existing) { throw 'mombasam_nanifrys already exists; it must be reconciled, not replaced.' }
if ($BaseDataFile) {
  $BaseDataFile = (Resolve-Path -LiteralPath $BaseDataFile).Path
  $baseHash = (Get-Content -LiteralPath ($BaseDataFile + '.sha256') -Raw).Trim()
  if ((Get-FileHash -LiteralPath $BaseDataFile -Algorithm SHA256).Hash -ne $baseHash) { throw 'Base data checksum does not match.' }
  $baseSql = [IO.File]::ReadAllText($BaseDataFile)
  if ($baseSql -match '(?im)^\s*(USE\s|CREATE\s|DROP\s|ALTER\s|GRANT\s|REVOKE\s|UPDATE\s|DELETE\s|REPLACE\s)') { throw 'Use the reviewed data-only export, not a full database dump.' }
}
$existingLogin = & $mysql --host=127.0.0.1 --user=root --batch --skip-column-names --execute="SELECT User FROM mysql.user WHERE User='nanifrys_shop' AND Host='127.0.0.1'"
if ($LASTEXITCODE -ne 0 -or $existingLogin) { throw 'The dedicated database login already exists or could not be checked. It will not be overwritten.' }
if (Get-ScheduledTask -TaskName 'Nani Frys Shop Server' -ErrorAction SilentlyContinue) { throw 'A shop startup task already exists. Review that installation first.' }
New-Item -ItemType Directory -Force -Path $privateRoot | Out-Null
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $privateRoot /inheritance:r /grant:r "*${currentSid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Private folder permissions could not be secured.' }
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
function New-PrivateSecret { $bytes = New-Object byte[] 48; $random.GetBytes($bytes); return ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant() }
$databasePassword = New-PrivateSecret
$jwt = New-PrivateSecret
$pairing = New-PrivateSecret
$sqlFile = Join-Path $privateRoot 'provision.sql'
@"
CREATE DATABASE mombasam_nanifrys CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nanifrys_shop'@'127.0.0.1' IDENTIFIED BY '$databasePassword';
GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON mombasam_nanifrys.* TO 'nanifrys_shop'@'127.0.0.1';
"@ | Set-Content -LiteralPath $sqlFile -Encoding ASCII
try {
  $sqlPath = $sqlFile.Replace('\','/')
  & $mysql --host=127.0.0.1 --user=root --execute="source $sqlPath" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Database provisioning failed. Existing databases have not been changed.' }
} finally { Remove-Item -LiteralPath $sqlFile -ErrorAction SilentlyContinue }
$backupRoot = if ($BackupDirectory) { [IO.Path]::GetFullPath($BackupDirectory) } else { Join-Path $privateRoot 'backups' }
if ($backupRoot.StartsWith('C:\xampp\htdocs', [StringComparison]::OrdinalIgnoreCase)) { throw 'Backups must be outside the web directory.' }
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
& icacls.exe $backupRoot /inheritance:r /grant:r "*${currentSid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Backup folder permissions could not be secured.' }
$defaults = Join-Path $privateRoot 'backup.cnf'
@"
[client]
host=127.0.0.1
user=nanifrys_shop
password=$databasePassword
"@ | Set-Content -LiteralPath $defaults -Encoding ASCII
$configFile = Join-Path $privateRoot 'shop.env'
@"
NODE_ENV=production
SITE_MODE=shop
BIND_HOST=127.0.0.1
PORT=5050
DATABASE_URL=mysql://nanifrys_shop:${databasePassword}@127.0.0.1:3306/mombasam_nanifrys?connection_limit=3
JWT_SECRET=$jwt
REPLICA_SHOP_ID=nani-frys-main-shop
REPLICA_CLOUD_URL=https://nanifrys.com/api
REPLICA_SECRET=$pairing
BACKUP_DIRECTORY=$($backupRoot.Replace('\','/'))
BACKUP_DEFAULTS_FILE=$($defaults.Replace('\','/'))
MYSQLDUMP_PATH=$($dump.Replace('\','/'))
LOCAL_DATABASE_NAME=mombasam_nanifrys
"@ | Set-Content -LiteralPath $configFile -Encoding ASCII
New-Item -ItemType Directory -Force -Path "$InstallRoot\server", "$InstallRoot\client", "$InstallRoot\ops\windows" | Out-Null
# Apache must never expose backend code, dependencies, or installer files.
'Require all denied' | Set-Content -LiteralPath "$InstallRoot\.htaccess" -Encoding ASCII
foreach ($item in @('dist','node_modules','prisma','package.json','package-lock.json')) { Copy-Item -LiteralPath (Join-Path "$sourceRoot\server" $item) -Destination "$InstallRoot\server" -Recurse }
Copy-Item -LiteralPath "$sourceRoot\client\dist" -Destination "$InstallRoot\client" -Recurse
if (Test-Path -LiteralPath "$sourceRoot\runtime") { Copy-Item -LiteralPath "$sourceRoot\runtime" -Destination $InstallRoot -Recurse; $nodePath = Join-Path $InstallRoot 'runtime\node.exe' }
Copy-Item -Path "$PSScriptRoot\*.ps1","$PSScriptRoot\*.cjs" -Destination "$InstallRoot\ops\windows"
$env:DATABASE_URL = "mysql://nanifrys_shop:${databasePassword}@127.0.0.1:3306/mombasam_nanifrys?connection_limit=3"
Push-Location "$InstallRoot\server"
try {
  & $nodePath 'node_modules\prisma\build\index.js' db push --skip-generate
  if ($LASTEXITCODE -ne 0) { throw 'Schema installation failed. No seed or destructive reset was run.' }
} finally { Pop-Location; Remove-Item Env:DATABASE_URL }
if ($BaseDataFile) {
  $basePath = $BaseDataFile.Replace('\','/')
  $importOutput = & $mysql "--defaults-extra-file=$defaults" --abort-source-on-error mombasam_nanifrys --execute="source $basePath" 2>&1
  if ($LASTEXITCODE -ne 0 -or $importOutput -match '^ERROR') { throw 'Base data import failed; no sync was enabled. Keep the database for review.' }
}
$action = New-ScheduledTaskAction -Execute $nodePath -Argument ('"' + "$InstallRoot\ops\windows\supervisor.cjs" + '"') -WorkingDirectory $InstallRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'Nani Frys Shop Server' -Action $action -Trigger $trigger -Settings $settings -Description 'Starts the local POS, database checks, hourly backups and two-way synchronization six times daily.' | Out-Null
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Nani Frys POS.lnk'))
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + "$InstallRoot\ops\windows\launch.ps1" + '"'
$shortcut.WorkingDirectory = $InstallRoot
$shortcut.Save()
Start-Process -FilePath $nodePath -ArgumentList ('"' + "$InstallRoot\ops\windows\supervisor.cjs" + '"') -WorkingDirectory $InstallRoot -WindowStyle Hidden
Write-Output 'Nani Frys installed. Fresh cloud pairing is required before trading. Source and other XAMPP applications were preserved.'

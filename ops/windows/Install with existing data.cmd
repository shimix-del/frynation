@echo off
setlocal
set "NF_INSTALLER=%~dp0..\nanifrys-shop-installer\ops\windows\install.ps1"
if not exist "%NF_INSTALLER%" set "NF_INSTALLER=%~dp0nanifrys-shop-installer\ops\windows\install.ps1"
if not exist "%NF_INSTALLER%" (
  echo Extract the POS installer and private database ZIP into the same parent folder first.
  pause
  exit /b 1
)
if not exist "%~dp0mombasam_nanifrys-data-only.sql" (
  echo The private data-only SQL file must be beside this launcher.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%NF_INSTALLER%" -BaseDataFile "%~dp0mombasam_nanifrys-data-only.sql"
if errorlevel 1 pause
endlocal

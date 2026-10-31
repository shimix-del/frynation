@echo off
title Stop NANI FRYS POS & Services
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop_pos.ps1"

@echo off
REM HYDEV SE launcher (batch wrapper).
REM Double-clicking a .ps1 directly is blocked by Windows' default
REM PowerShell execution policy; this .bat sidesteps that safely by
REM passing -ExecutionPolicy Bypass for THIS PROCESS ONLY (it does not
REM change any system-wide setting).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-hydev.ps1"

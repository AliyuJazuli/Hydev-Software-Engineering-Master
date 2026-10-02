@echo off
REM Run this once. It adds a "HYDEV SE" icon to your Desktop that both
REM starts the local server (only if it isn't already running) and opens
REM the app -- see create-desktop-shortcut.ps1 for details.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-desktop-shortcut.ps1"

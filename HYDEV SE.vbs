' HYDEV SE launcher (silent).
' This is the file to point a desktop/Start Menu/taskbar shortcut at if you
' want a clean, single-click "app icon" experience with no console window
' flashing on screen. It just runs se-start.bat's PowerShell script hidden.
'
' To create the shortcut: right-click this file -> "Create shortcut", then
' move the shortcut to your Desktop or pin it to Start/Taskbar. You can set
' a custom icon on the shortcut via Properties -> Change Icon -> browse to
' assets\hydev-icon.ico in this folder.
Set shell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
command = "powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & scriptDir & "\start-hydev.ps1"""
shell.Run command, 0, False

# Run this once to add a "HYDEV SE" icon to your Desktop. The shortcut
# points at the silent VBS launcher, so double-clicking (or pinning) it
# gives the single-icon behavior: starts the server only if it isn't
# already running, then opens HYDEV SE as its own app window.

$RootDir = $PSScriptRoot
$DesktopDir = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopDir 'HYDEV SE.lnk'
$TargetPath = Join-Path $RootDir 'HYDEV SE.vbs'
$IconPath = Join-Path $RootDir 'assets\hydev-icon.ico'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $TargetPath
$shortcut.WorkingDirectory = $RootDir
if (Test-Path $IconPath) {
    $shortcut.IconLocation = $IconPath
}
$shortcut.Description = 'Open HYDEV SE (starts the local server if needed)'
$shortcut.Save()

Write-Host "Created desktop shortcut: $ShortcutPath"
Write-Host "You can now drag it onto your Taskbar or Start Menu too."
Read-Host "Press Enter to close"

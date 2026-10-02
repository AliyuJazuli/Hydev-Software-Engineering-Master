# HYDEV SE - smart launcher
#
# This is what the desktop/Start Menu icon should point to (via
# se-start.bat, or the silent "HYDEV SE.vbs" wrapper). Behavior:
#   1. Check whether the server is already listening on the configured port.
#      - If it is: do nothing to the server, just open the app.
#      - If it isn't: start it in the background, wait until it responds,
#        then open the app.
#   2. "Open the app":
#      - If HYDEV SE has been installed as a PWA (via Chrome/Edge's own
#        "Install" button), this finds the shortcut that install created
#        and launches it directly -- that opens the real installed app
#        (its own window, its own taskbar icon), never a generic browser.
#      - If it hasn't been installed yet, this opens a normal browser tab
#        (with the address bar visible) instead of a chromeless app
#        window, so the browser's install icon/menu is actually visible
#        and you can install it properly.
#
# Safe to run repeatedly (e.g. from a pinned taskbar icon or a Start Menu
# shortcut) -- clicking it again while HYDEV SE is already open just
# reopens/refocuses the app instead of spawning a second server.

$ErrorActionPreference = 'SilentlyContinue'

$Port = 4173
$HostName = '127.0.0.1'
$Url = "http://$($HostName):$($Port)/"
$RootDir = $PSScriptRoot
$AppName = 'HYDEV SE'

function Test-PortOpen {
    param([string]$TargetHost, [int]$TargetPort)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $task = $client.ConnectAsync($TargetHost, $TargetPort)
        $completed = $task.Wait(500)
        $isOpen = $completed -and $client.Connected
        $client.Close()
        return [bool]$isOpen
    } catch {
        return $false
    }
}

# Installing a PWA via Chrome/Edge's own "Install" button creates a Start
# Menu (and sometimes Desktop) shortcut whose target is chrome.exe/msedge.exe
# with a "--app-id=<hash>" argument. Finding that shortcut is how we tell
# "genuinely installed as an app" apart from "just open in a browser".
function Find-InstalledPwaShortcut {
    param([string]$Name)

    $searchDirs = @(
        (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'),
        (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'),
        [Environment]::GetFolderPath('Desktop'),
        [Environment]::GetFolderPath('CommonDesktopDirectory')
    )

    $shell = New-Object -ComObject WScript.Shell
    foreach ($dir in $searchDirs) {
        if (-not $dir -or -not (Test-Path $dir)) { continue }
        $candidates = Get-ChildItem -Path $dir -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.BaseName -match [regex]::Escape($Name) }
        foreach ($item in $candidates) {
            try {
                $sc = $shell.CreateShortcut($item.FullName)
                if ($sc.Arguments -match '--app-id=') {
                    return $item.FullName
                }
            } catch {
                continue
            }
        }
    }
    return $null
}

function Open-Hydev {
    param([string]$TargetUrl, [string]$Name)

    $installedShortcut = Find-InstalledPwaShortcut -Name $Name
    if ($installedShortcut) {
        Write-Host "Found the installed HYDEV SE app -- opening it."
        Start-Process -FilePath $installedShortcut
        return
    }

    Write-Host "HYDEV SE isn't installed as an app yet -- opening it in your browser."
    Write-Host "Look for an install icon in the address bar (or the browser menu -> Install HYDEV SE...) to install it as an app. After that, this launcher will open the installed app directly instead."
    Start-Process $TargetUrl
}

Write-Host "HYDEV SE launcher"

if (Test-PortOpen -TargetHost $HostName -TargetPort $Port) {
    Write-Host "Server already running on port $Port -- not starting a second one."
    Open-Hydev -TargetUrl $Url -Name $AppName
    exit 0
}

Write-Host "Starting HYDEV SE server..."
$ServerScript = Join-Path $RootDir 'server\index.js'
$QuotedServerScript = '"' + $ServerScript + '"'
Start-Process -FilePath 'node' -ArgumentList $QuotedServerScript `
    -WorkingDirectory $RootDir -WindowStyle Hidden

$maxWaitSeconds = 15
$waited = 0
$ready = $false
while ($waited -lt $maxWaitSeconds) {
    Start-Sleep -Milliseconds 500
    $waited += 0.5
    if (Test-PortOpen -TargetHost $HostName -TargetPort $Port) {
        $ready = $true
        break
    }
}

if (-not $ready) {
    Write-Host "HYDEV SE did not start within $maxWaitSeconds seconds."
    Write-Host "Check that Node.js is installed and on PATH, then try running:"
    Write-Host "    node `"$RootDir\server\index.js`""
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "Server is up -- opening HYDEV SE."
Open-Hydev -TargetUrl $Url -Name $AppName

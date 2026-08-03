<#
    .SYNOPSIS
    Watcher del bridge de notificaciones de Claude Code (Docker dentro de WSL2 -> Windows).

    .DESCRIPTION
    Cuando Claude Code corre DENTRO de un contenedor Docker (por ejemplo: WSL2 -> `docker run` ->
    Claude adentro), el hook notify-desktop.js no puede disparar un toast directo porque el
    contenedor no ve el escritorio de Windows. En su lugar escribe un archivo JSON chico
    ({"title": "...", "body": "..."}) en una carpeta compartida.

    Este script corre del lado de Windows, mira esa carpeta con un FileSystemWatcher, y dispara
    un toast real (BurntToast) por cada archivo nuevo. Borra cada archivo despues de procesarlo.

    .PARAMETER WatchDir
    Carpeta de Windows que coincide con el volumen montado en el contenedor. Por default
    "$env:USERPROFILE\ClaudeNotify", pensada para levantar el contenedor con:
        docker run -v /mnt/c/Users/<TU_USUARIO_WINDOWS>/ClaudeNotify:/claude-notify ...

    .PARAMETER MaxAgeMinutes
    Si el watcher estuvo apagado y se acumularon archivos viejos, los descarta en silencio en vez
    de disparar un toast por cada uno al arrancar. Default: 10 minutos.

    .EXAMPLE
    Probar en primer plano (Ctrl+C para cortar):
        powershell -ExecutionPolicy Bypass -File notify-bridge-watcher.ps1

    .EXAMPLE
    Dejarlo corriendo siempre (una sola vez, en una PowerShell con tu usuario):
        $scriptPath = "$env:USERPROFILE\.claude\hooks\windows\notify-bridge-watcher.ps1"
        $action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
            -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
        $trigger = New-ScheduledTaskTrigger -AtLogOn
        Register-ScheduledTask -TaskName 'ClaudeNotifyBridgeWatcher' -Action $action -Trigger $trigger `
            -Description 'Watcher de notificaciones de Claude Code (Docker/WSL2 bridge)'
#>

param(
    [string]$WatchDir = "$env:USERPROFILE\ClaudeNotify",
    [int]$MaxAgeMinutes = 10
)

if (-not (Get-Module -ListAvailable -Name BurntToast)) {
    Write-Error 'Falta BurntToast. Corre: Install-Module -Name BurntToast -Scope CurrentUser -Force'
    exit 1
}
Import-Module BurntToast

New-Item -ItemType Directory -Path $WatchDir -Force | Out-Null

# Definida en scope GLOBAL a proposito: el scriptblock de Register-ObjectEvent
# corre en su propio runspace y no ve funciones/variables de script normales,
# solo las que estan en Global. Es el gotcha clasico de FileSystemWatcher +
# PowerShell eventing.
function global:Show-ClaudeNotifyFile {
    param([string]$FilePath, [int]$MaxAgeMinutes)

    try {
        if (-not (Test-Path -LiteralPath $FilePath)) {
            return
        }
        $age = (Get-Date) - (Get-Item -LiteralPath $FilePath).LastWriteTime
        if ($age.TotalMinutes -le $MaxAgeMinutes) {
            $data = Get-Content -Raw -LiteralPath $FilePath | ConvertFrom-Json
            New-BurntToastNotification -Text $data.title, $data.body
        }
    } catch {
        # archivo corrupto o a medio escribir del lado del contenedor -- se ignora
    } finally {
        Remove-Item -LiteralPath $FilePath -Force -ErrorAction SilentlyContinue
    }
}

# Barrido inicial: procesa (o descarta si son viejos) los archivos que hayan
# quedado pendientes de cuando este watcher no estaba corriendo.
Get-ChildItem -Path $WatchDir -Filter '*.json' -File -ErrorAction SilentlyContinue | ForEach-Object {
    Show-ClaudeNotifyFile -FilePath $_.FullName -MaxAgeMinutes $MaxAgeMinutes
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $WatchDir
$watcher.Filter = '*.json'
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$action = {
    # Pequeno margen para el rename atomico del lado del contenedor.
    Start-Sleep -Milliseconds 100
    Show-ClaudeNotifyFile -FilePath $Event.SourceEventArgs.FullPath -MaxAgeMinutes $Event.MessageData
}

Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action -MessageData $MaxAgeMinutes | Out-Null

Write-Host "Escuchando notificaciones de Claude Code en $WatchDir (Ctrl+C para salir)"
while ($true) {
    Start-Sleep -Seconds 3600
}

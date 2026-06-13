# ==========================================
#  Sticky Note Board - Build & Auto-Start
# ==========================================

$ErrorActionPreference = "Stop"
$TaskName = "StickyNoteBoardAutoStart"

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Sticky Note Board - Build & Setup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build frontend
Write-Host "[1/3] Building frontend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  -> Frontend build done" -ForegroundColor Green

# Step 2: Package with @electron/packager
Write-Host "[2/3] Packaging Electron app..." -ForegroundColor Cyan
npx @electron/packager . "便利签看板" --platform=win32 --arch=x64 --out=release --overwrite --asar
if ($LASTEXITCODE -ne 0) {
    Write-Host "Packaging failed!" -ForegroundColor Red
    exit 1
}

# Fix asar: ensure semver/functions/prerelease.js is included
$AsarPath = Join-Path (Get-Location) "release\便利签看板-win32-x64\resources\app.asar"
$SemverFuncSrc = Join-Path (Get-Location) "node_modules\electron-updater\node_modules\semver\functions\prerelease.js"

if ((Test-Path $AsarPath) -and (Test-Path $SemverFuncSrc)) {
    # Check if prerelease.js is missing from asar
    $asarList = npx asar list $AsarPath 2>$null
    if ($asarList -notmatch "prerelease") {
        Write-Host "  -> Fixing asar (adding missing semver module)..." -ForegroundColor Yellow
        $extractDir = Join-Path (Get-Location) "release\_asar_fix_tmp"
        npx asar extract $AsarPath $extractDir 2>$null
        $destFunc = Join-Path $extractDir "node_modules\electron-updater\node_modules\semver\functions"
        if (Test-Path $destFunc) {
            Copy-Item $SemverFuncSrc $destFunc -Force
            npx asar pack $extractDir $AsarPath 2>$null
            Write-Host "  -> asar fixed!" -ForegroundColor Green
        }
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$ExePath = Join-Path (Get-Location) "release\便利签看板-win32-x64\便利签看板.exe"
Write-Host "  -> App path: $ExePath" -ForegroundColor Green

if (-not (Test-Path $ExePath)) {
    Write-Host "Cannot find exe!" -ForegroundColor Red
    exit 1
}

# Step 3: Register scheduled task (needs admin for COM API)
Write-Host "[3/3] Registering auto-start (30s delay)..." -ForegroundColor Cyan

# Write a temp script using COM API (handles Chinese paths correctly)
# IMPORTANT: must be saved with UTF-8 BOM for PowerShell 5.1 to read Chinese chars
$tempScript = Join-Path $env:TEMP "reg-autostart.ps1"
$scriptContent = @"
`$ExePath = "$ExePath"
`$TaskName = "$TaskName"

try { Unregister-ScheduledTask -TaskName `$TaskName -Confirm:`$false -ErrorAction Stop } catch {}

`$svc = New-Object -ComObject('Schedule.Service')
`$svc.Connect()
`$folder = `$svc.GetFolder('\')
`$td = `$svc.NewTask(0)

`$act = `$td.Actions.Create(0)
`$act.Path = `$ExePath
`$act.Arguments = '--silent'
`$act.WorkingDirectory = Split-Path `$ExePath

`$trig = `$td.Triggers.Create(9)
`$trig.Delay = 'PT30S'

`$td.Settings.DisallowStartIfOnBatteries = `$false
`$td.Settings.StopIfGoingOnBatteries = `$false
`$td.Settings.StartWhenAvailable = `$true
`$td.Settings.ExecutionTimeLimit = 'PT0S'

`$folder.RegisterTaskDefinition(`$TaskName, `$td, 6, `$null, `$null, 3) | Out-Null

`$t = `$folder.GetTask(`$TaskName)
`$p = `$t.Definition.Actions.Item(1).Path
if (Test-Path `$p) { Write-Host "OK" } else { Write-Host "FAIL" }
Start-Sleep 2
"@
# Save with UTF-8 BOM (critical for Chinese path support in PS 5.1)
$utf8BOM = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($tempScript, $scriptContent, $utf8BOM)

Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy","Bypass","-File",$tempScript -Wait
Start-Sleep -Seconds 2

# Verify by reading path via COM API
try {
    $svc = New-Object -ComObject("Schedule.Service")
    $svc.Connect()
    $task = $svc.GetFolder("\").GetTask($TaskName)
    $storedPath = $task.Definition.Actions.Item(1).Path
    if (Test-Path $storedPath) {
        Write-Host "  -> Auto-start registered! Path OK" -ForegroundColor Green
    } else {
        Write-Host "  -> WARNING: Task registered but path not found: $storedPath" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  -> WARNING: Could not verify auto-start." -ForegroundColor Yellow
}

Remove-Item $tempScript -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host "  - Run now: double-click the exe" -ForegroundColor White
Write-Host "  - Auto-start: launches 30s after login (hidden to tray)" -ForegroundColor White
Write-Host "  - Close button: minimizes to system tray" -ForegroundColor White
Write-Host "  - Quit: right-click tray icon -> Quit" -ForegroundColor White
Write-Host ""

# Launch now?
$Launch = Read-Host "Launch the app now? (Y/n)"
if ($Launch -ne 'n' -and $Launch -ne 'N') {
    Start-Process $ExePath
    Write-Host "Launched!" -ForegroundColor Green
}

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

# Step 3: Register scheduled task via schtasks (needs admin)
Write-Host "[3/3] Registering auto-start (30s delay)..." -ForegroundColor Cyan
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$regScript = Join-Path $ScriptDir "register-autostart-admin.ps1"

# Write a temp script with the correct exe path
$tempScript = Join-Path $env:TEMP "reg-autostart.ps1"
@"
schtasks /Delete /TN "$TaskName" /F 2>`$null
schtasks /Create /TN "$TaskName" /TR "'$ExePath' --silent" /SC ONLOGON /DELAY 0000:30 /RL LIMITED /F
"@ | Set-Content -Path $tempScript -Encoding UTF8

Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy","Bypass","-File",$tempScript -Wait
Start-Sleep -Seconds 2
Remove-Item $tempScript -Force -ErrorAction SilentlyContinue

# Verify
$taskInfo = schtasks /Query /TN $TaskName /FO CSV /NH 2>$null
if ($taskInfo -match $TaskName) {
    Write-Host "  -> Auto-start registered!" -ForegroundColor Green
} else {
    Write-Host "  -> WARNING: Could not register auto-start. Try running as Administrator." -ForegroundColor Yellow
}

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

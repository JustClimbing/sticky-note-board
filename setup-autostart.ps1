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

# Step 2: Package Electron
Write-Host "[2/3] Packaging Electron app..." -ForegroundColor Cyan
npx electron-builder --win --dir
if ($LASTEXITCODE -ne 0) {
    Write-Host "Packaging failed! Try running as Administrator." -ForegroundColor Red
    Write-Host "If Windows Defender blocks it, disable real-time protection temporarily." -ForegroundColor Yellow
    exit 1
}
Write-Host "  -> Packaging done" -ForegroundColor Green

# Find the exe
$ExePath = Join-Path (Get-Location) "release\win-unpacked\sticky-note-board.exe"
$AltPath = Join-Path (Get-Location) "release\win-unpacked\便利签看板.exe"

if (Test-Path $AltPath) {
    $ExePath = $AltPath
}

if (-not (Test-Path $ExePath)) {
    Write-Host "Cannot find exe in release\win-unpacked\" -ForegroundColor Red
    exit 1
}

Write-Host "  -> App path: $ExePath" -ForegroundColor Green

# Step 3: Register scheduled task
Write-Host "[3/3] Registering auto-start (30s delay)..." -ForegroundColor Cyan

# Remove old task
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
} catch {
    # Task didn't exist, that's fine
}

# Create action
$Action = New-ScheduledTaskAction -Execute $ExePath -Argument "--silent"

# Create trigger with delay
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Trigger.Delay = "PT30S"

# Create settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Sticky Note Board auto-start" -RunLevel Highest -Force | Out-Null

Write-Host "  -> Auto-start registered!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host "  - Run now: double-click the exe" -ForegroundColor White
Write-Host "  - Auto-start: configured, launches 30s after login (hidden to tray)" -ForegroundColor White
Write-Host "  - Close button: minimizes to system tray, not quit" -ForegroundColor White
Write-Host "  - Quit: right-click tray icon -> Quit" -ForegroundColor White
Write-Host ""
Write-Host "To disable auto-start:" -ForegroundColor White
Write-Host '  Unregister-ScheduledTask -TaskName "StickyNoteBoardAutoStart" -Confirm:$false' -ForegroundColor Gray
Write-Host ""

# Launch now?
$Launch = Read-Host "Launch the app now? (Y/n)"
if ($Launch -ne 'n' -and $Launch -ne 'N') {
    Start-Process $ExePath
    Write-Host "Launched!" -ForegroundColor Green
}

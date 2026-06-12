# Run as Administrator: Register Sticky Note Board auto-start
$TaskName = "StickyNoteBoardAutoStart"
$ExePath = 'E:\007-创意小项目\sticky-note-board\release\便利签看板-win32-x64\便利签看板.exe'

# Remove old task if exists
schtasks /Delete /TN $TaskName /F 2>$null

# Create scheduled task: run at logon with 30s delay, current user
schtasks /Create /TN $TaskName /TR "'$ExePath' --silent" /SC ONLOGON /DELAY 0000:30 /RL LIMITED /F

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Task registered. App will auto-start 30s after login."
} else {
    Write-Host "FAILED: Could not register task."
}

Start-Sleep -Seconds 3

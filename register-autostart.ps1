# Register Sticky Note Board auto-start via Windows Task Scheduler
$TaskName = "StickyNoteBoardAutoStart"
$ExePath = "E:\007-创意小项目\sticky-note-board\release\便利签看板-win32-x64\便利签看板.exe"

# Remove old task if exists
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Create action: run the exe with --silent flag
$Action = New-ScheduledTaskAction -Execute $ExePath -Argument "--silent" -WorkingDirectory (Split-Path $ExePath)

# Create trigger: at logon with 30 second delay
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Trigger.Delay = "PT30S"

# Settings: don't stop on battery, allow start on demand
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)

# Register the task for current user
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Limited -Description "Auto-start Sticky Note Board after login (30s delay)"

Write-Host "SUCCESS: Scheduled task '$TaskName' registered."
Write-Host "Exe: $ExePath"
Write-Host "The app will auto-start 30 seconds after you log in."

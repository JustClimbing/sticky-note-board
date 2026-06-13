# Run as Administrator: Register Sticky Note Board auto-start
# Uses PowerShell COM API to handle Chinese characters in path correctly

$TaskName = "StickyNoteBoardAutoStart"
$ExePath = "E:\007-创意小项目\sticky-note-board\release\便利签看板-win32-x64\便利签看板.exe"

# Verify exe exists
if (-not (Test-Path $ExePath)) {
    Write-Host "ERROR: exe not found at $ExePath" -ForegroundColor Red
    exit 1
}

# Remove old task if exists
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Host "Removed old task." -ForegroundColor Yellow
} catch {
    # Task didn't exist, that's fine
}

# Build task using COM API (preserves Unicode in paths)
$service = New-Object -ComObject("Schedule.Service")
$service.Connect()
$folder = $service.GetFolder("\")

$taskDef = $service.NewTask(0)

# Action: run the exe with --silent
$action = $taskDef.Actions.Create(0)
$action.Path = $ExePath
$action.Arguments = "--silent"
$action.WorkingDirectory = Split-Path $ExePath

# Trigger: at logon with 30s delay
$trigger = $taskDef.Triggers.Create(9)
$trigger.Delay = "PT30S"

# Settings
$settings = $taskDef.Settings
$settings.AllowHardTerminate = $true
$settings.StartWhenAvailable = $true
$settings.DisallowStartIfOnBatteries = $false
$settings.StopIfGoingOnBatteries = $false
$settings.ExecutionTimeLimit = "PT0S"

# Register for current user (6 = create or update, 3 = interactive logon)
$folder.RegisterTaskDefinition(
    $TaskName,
    $taskDef,
    6,
    $null,
    $null,
    3
) | Out-Null

# Verify
$registered = $folder.GetTask($TaskName)
if ($registered) {
    $actualPath = $registered.Definition.Actions.Item(1).Path
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "  Task:    $TaskName"
    Write-Host "  Exe:     $actualPath"
    Write-Host "  Args:    --silent"
    Write-Host "  Trigger: At logon + 30s delay"
} else {
    Write-Host "FAILED" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 3

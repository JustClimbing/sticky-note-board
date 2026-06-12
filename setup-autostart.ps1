# ═══════════════════════════════════════════════════
#  便利签看板 — 一键打包 + 配置开机自启动
#  双击运行或在 PowerShell 中执行：
#  .\setup-autostart.ps1
# ═══════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$TaskName = "StickyNoteBoardAutoStart"

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  便利签看板 — 打包 & 自启动配置工具" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# ── Step 1: Build Vite frontend ──
Write-Host "[1/3] 构建前端资源..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "前端构建失败！" -ForegroundColor Red
    exit 1
}
Write-Host "  -> 前端构建完成" -ForegroundColor Green

# ── Step 2: Package Electron app ──
Write-Host "[2/3] 打包 Electron 应用（首次需要下载 Electron 二进制，请耐心等待）..." -ForegroundColor Cyan
npx electron-builder --win --dir
if ($LASTEXITCODE -ne 0) {
    Write-Host "打包失败！请尝试以管理员身份运行此脚本。" -ForegroundColor Red
    Write-Host "如果是 Windows Defender 导致的问题，请临时关闭实时保护后重试。" -ForegroundColor Yellow
    exit 1
}
Write-Host "  -> 打包完成" -ForegroundColor Green

# Get the exe path
$ExePath = Join-Path (Get-Location) "release\win-unpacked\便利签看板.exe"
if (-not (Test-Path $ExePath)) {
    # Fallback name
    $ExePath = Join-Path (Get-Location) "release\win-unpacked\sticky-note-board.exe"
}

if (-not (Test-Path $ExePath)) {
    Write-Host "找不到打包后的 exe 文件，请检查 release\win-unpacked 目录" -ForegroundColor Red
    exit 1
}

Write-Host "  -> 应用路径: $ExePath" -ForegroundColor Green

# ── Step 3: Create scheduled task ──
Write-Host "[3/3] 注册开机自启动（延迟 30 秒，不影响开机速度）..." -ForegroundColor Cyan

# Remove existing task if any
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Create new task: run at logon with 30s delay, silent mode
$Action = New-ScheduledTaskAction -Execute $ExePath -Argument "--silent"
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Days 0)

# Set delay to 30 seconds via XML manipulation
$TriggerXml = [System.Management.Automation.Language.Parser]::ParseInput("", [ref]$null, [ref]$null)
$Trigger.Delay = "PT30S"

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "便利签看板 - 开机延迟自启动（不拖慢系统）" `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host "  -> 自启动已注册！" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  全部完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "使用方式：" -ForegroundColor White
Write-Host "  - 立即运行：双击 $ExePath" -ForegroundColor White
Write-Host "  - 开机自启：已配置，登录后 30 秒自动静默启动到托盘" -ForegroundColor White
Write-Host "  - 关闭窗口：不会退出，而是最小化到系统托盘" -ForegroundColor White
Write-Host "  - 彻底退出：右键托盘图标 -> 退出" -ForegroundColor White
Write-Host ""
Write-Host "取消自启动：" -ForegroundColor White
Write-Host '  PowerShell: Unregister-ScheduledTask -TaskName "StickyNoteBoardAutoStart" -Confirm:$false' -ForegroundColor Gray
Write-Host ""

# Optional: launch the app now
$Launch = Read-Host "是否现在启动便利签看板？(Y/n)"
if ($Launch -ne 'n' -and $Launch -ne 'N') {
    Start-Process $ExePath
    Write-Host "已启动！" -ForegroundColor Green
}

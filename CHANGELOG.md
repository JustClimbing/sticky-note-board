# 变更日志

本文件记录「便利签看板」项目的所有重要变更。

---

## 未发布 (Unreleased)

### 改进

- 开机自启动（`--silent` 模式）现在会自动显示桌面挂件，用户点击挂件即可弹出看板，不再只藏在系统托盘里

---

## v1.0.0 — 2026-06-12 首次发布

### 核心功能

- 看板模式（待办/进行中/已完成三栏）与自由布局双模式切换
- 便利贴拖拽移动、双击创建、6 种柔和配色、内联编辑
- 窗口置顶（📍 按钮）
- 挂件模式（🎈 按钮）：缩小为桌面浮标，点击弹出完整看板，支持拖拽和右键菜单
- 托盘常驻：关闭按钮最小化到系统托盘而非退出
- 开机自启动：通过 Windows 任务计划延迟 30 秒静默启动
- 自动更新：检测 GitHub Releases 新版本，右下角弹窗通知，支持下载进度显示和一键重启安装

### 技术架构

- Electron 28 + React 18 + Vite 5
- 主进程（`electron/main.js`）：窗口管理、系统托盘、IPC、数据持久化、自启动、自动更新
- 渲染进程（`src/`）：React UI 组件（Board、Note、Toolbar、UpdateNotification）
- 安全桥接：`preload.js` 通过 contextBridge 暴露白名单 API
- 挂件窗口：`widget.html` 独立透明窗口，nodeIntegration 直接调 IPC
- 数据持久化：`%APPDATA%/sticky-note-board/notes.json`，300ms 防抖自动保存

### 构建与发布

- 本地打包：`@electron/packager`（`npm run pack`），输出到 `release/便利签看板-win32-x64/`
- 发版打包：`electron-builder`（`npm run dist/release`），输出 NSIS 安装包
- GitHub Actions：推 `v*` tag 自动在 Windows 环境中构建并发布到 GitHub Releases
- 一键脚本：`setup-autostart.ps1` 完成构建 + 打包 + asar 修复 + 注册自启动

### 文档

- `README.md`：架构说明、文件结构、开发指南、修改指南、发版流程
- `AGENTS.md`：AI 助手详细上下文（双进程模型、IPC 约定、打包机制、常见坑）
- `.cursorrules` / `.clinerules`：精简版 AI 助手规则
- `CHANGELOG.md`：本文件

### 已知问题与修复

- electron-builder 在 Windows 本地打包有 EPERM 文件锁问题，已改用 @electron/packager 本地打包
- @electron/packager 打出的 asar 偶尔缺失 `semver/functions/prerelease.js`，`setup-autostart.ps1` 已内置自动修复
- PowerShell 5.1 中文路径编码问题：含中文路径的 .ps1 文件必须保存为 UTF-8 with BOM，计划任务注册必须使用 COM API 而非 schtasks 命令行（已修复）

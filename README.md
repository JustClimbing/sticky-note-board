# 📌 便利签看板

一个温馨可爱风格的桌面便利贴看板应用，基于 Electron + React 构建。支持看板分栏与自由布局双模式，窗口置顶、开机自启、挂件模式、GitHub 自动更新。

## ✨ 功能特性

- **双模式布局** — 看板模式（待办/进行中/已完成三栏）和自由模式（便利贴随意摆放）
- **拖拽交互** — 拖拽移动便利贴，看板模式下自动吸附到对应列
- **双击创建** — 双击空白区域创建新便利贴，随机分配柔和配色
- **6种配色** — 阳光黄、樱花粉、薄荷绿、天空蓝、蜜桃橙、嫩草绿
- **窗口置顶** — 让看板始终浮在其他窗口上方
- **挂件模式** — 缩小为桌面浮标，点击弹出完整看板
- **托盘常驻** — 关闭按钮不会退出应用，而是最小化到系统托盘
- **开机自启动** — 通过 Windows 任务计划延迟 30 秒静默启动，自动显示桌面挂件，点击挂件弹出看板
- **自动更新** — 检测到 GitHub 新版本后右下角弹窗通知，一键下载更新

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────┐
│                 Electron 主进程               │
│  electron/main.js                           │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ 主窗口    │ │ 挂件窗口  │ │ 系统托盘     │ │
│  │ (React)  │ │ (HTML)   │ │ (Tray Icon) │ │
│  └────┬─────┘ └────┬─────┘ └─────────────┘ │
│       │             │                        │
│  ┌────┴─────────────┴───────────────────┐   │
│  │           IPC 通信层                   │   │
│  │  preload.js (contextBridge)          │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  数据持久化 (notes.json)              │   │
│  │  自启动管理 (schtasks)                │   │
│  │  自动更新 (electron-updater)          │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**技术栈：**
- **Electron 28** — 桌面应用壳，管理窗口、托盘、系统交互
- **React 18** — 渲染主窗口的看板 UI
- **Vite 5** — 构建前端资源（开发热更新 + 生产打包）
- **@electron/packager** — 本地打包成免安装目录（`npm run pack`，已验证稳定）
- **electron-builder** — GitHub Actions 发版打包成 NSIS 安装包（`npm run dist/release`）
- **electron-updater** — 检测 GitHub Releases 新版本并自动下载更新

> **为什么本地用 @electron/packager 而不是 electron-builder？**
> 在 Windows 上 electron-builder 打包时会因为文件锁导致 EPERM rename 错误（`win-unpacked.tmp` → `win-unpacked`），即使关闭 Windows Defender 也无法稳定复现。@electron/packager 不经过 .tmp rename 步骤，打包稳定可靠。GitHub Actions 的干净环境没有此问题，所以发版仍用 electron-builder。

**为什么不用 Electron Forge / electron-vite？**
为了保持简单透明，直接用最基础的方式：Vite 打包前端到 `dist-renderer/`，Electron 加载它。没有额外的抽象层，改代码时你能清楚看到每个文件在做什么。

## 📁 项目结构

```
sticky-note-board/
├── electron/                       # Electron 主进程代码
│   ├── main.js                    # 入口：窗口管理、托盘、IPC、自启动、自动更新
│   ├── preload.js                 # 安全桥接：通过 contextBridge 暴露 API 给渲染进程
│   ├── widget.html                # 挂件窗口：独立 HTML，桌面浮标 UI（自包含 CSS+JS）
│
├── src/                            # React 渲染进程代码（主窗口 UI）
│   ├── main.jsx                   # React 入口
│   ├── App.jsx                    # 根组件：状态管理、笔记 CRUD、自动保存
│   ├── index.css                  # 全局样式（温馨可爱风格的所有 CSS 都在这里）
│   └── components/
│       ├── Toolbar.jsx            # 顶部工具栏：模式切换、功能按钮、窗口控制
│       ├── Board.jsx              # 看板容器：看板模式（三栏）和自由模式的布局
│       ├── Note.jsx               # 单张便利贴：拖拽、编辑、换色、删除
│       └── UpdateNotification.jsx # 更新通知弹窗（右下角 toast）
│
├── .github/workflows/
│   └── release.yml                # GitHub Actions：推 tag 时自动打包发布
│
├── release/                        # 打包输出目录（gitignore）
│   └── 便利签看板-win32-x64/      # @electron/packager 生成的免安装目录
│       └── 便利签看板.exe         # 可直接双击运行
│
├── index.html                     # Vite 入口 HTML（加载 React 和 Google Fonts）
├── vite.config.js                 # Vite 配置：输出到 dist-renderer/，base 为 ./
├── package.json                   # 依赖、脚本、electron-builder 发版配置
├── setup-autostart.ps1            # PowerShell 一键打包+注册自启动脚本
├── register-autostart-admin.ps1   # UAC 提权注册计划任务脚本
├── CHANGELOG.md                   # 项目变更日志
├── AGENTS.md                      # AI 助手上下文（详细版）
├── .cursorrules                   # Cursor 编辑器 AI 规则
├── .clinerules                    # Cline 插件 AI 规则
└── .gitignore
```

## 🚀 开发指南

### 环境要求

- Node.js 18+
- npm（随 Node.js 安装）

### 安装依赖

```bash
npm install
```

### 启动开发模式

```bash
npm run dev
```

这会同时启动两个进程：
- Vite 开发服务器（localhost:5173，支持热更新）
- Electron 窗口（加载 Vite 服务器页面）

改 `src/` 下的文件会即时刷新，改 `electron/` 下的文件需要重启 Electron（Ctrl+C 后重新 `npm run dev`）。

### 常用命令

| 命令 | 作用 | 打包工具 |
|------|------|---------|
| `npm run dev` | 开发模式（热更新） | — |
| `npm run build` | 只构建前端到 `dist-renderer/` | Vite |
| `npm run pack` | 构建 + 打包到 `release/便利签看板-win32-x64/`（推荐本地使用） | @electron/packager |
| `npm run dist` | 构建 + 打包成 NSIS 安装包 .exe | electron-builder |
| `npm run release` | 构建 + 发布到 GitHub Releases（需要 GH_TOKEN） | electron-builder |
| `.\setup-autostart.ps1` | 一键打包 + 注册开机自启动（需管理员） | @electron/packager |

## 📝 如何修改

### 改界面样式

所有 CSS 都在 `src/index.css` 里，按功能分区注释了。改颜色变量找 `:root` 区块，改便利贴外观找 `.sticky-note` 区块，改工具栏找 `.toolbar` 区块。

### 改便利贴配色

在 `src/App.jsx` 的 `addNote` 函数里有一个 `colors` 数组，增删颜色就行。`src/components/Note.jsx` 里也有 `NOTE_COLORS` 数组（换色面板用的），两边保持一致。

### 改看板列

在 `src/components/Board.jsx` 的 `KANBAN_COLUMNS` 数组里增删列。每列需要 `id`、`label`、`emoji` 三个字段。

### 改挂件外观

挂件是独立的 `electron/widget.html`，所有 CSS 和 JS 都内联在里面。它是一个透明背景的 80×90px 小窗口，设置了 `alwaysOnTop: true`。

### 加新功能

1. 如果需要跟 Electron 交互（窗口控制、文件读写等）：在 `electron/main.js` 加 IPC handler，在 `preload.js` 暴露 API，然后在 React 组件里通过 `window.electronAPI.xxx()` 调用
2. 如果是纯 UI 功能：直接在 `src/components/` 下加组件，在 `App.jsx` 里引入

### 数据怎么存的

笔记数据保存在 `%APPDATA%/sticky-note-board/notes.json`（Windows），由主进程通过 `fs` 读写。每次笔记变更后 300ms 自动保存（防抖）。

## 📦 发版流程

### 完整流程（你只需要做这些）

```bash
# 1. 改完代码，确认 npm run dev 运行正常

# 2. 升版本号（三选一）
npm version patch   # 1.0.0 → 1.0.1（修 bug）
npm version minor   # 1.0.0 → 1.1.0（加功能）
npm version major   # 1.0.0 → 2.0.0（大改）

# 3. 推送代码和 tag
git push && git push --tags
```

### 然后自动发生的事

1. GitHub Actions 检测到 `v*` tag → 自动在 Windows 虚拟机上运行
2. `npm ci` 安装依赖 → `npm run build` 构建前端 → `electron-builder` 打包
3. 生成 `便利签看板 Setup X.X.X.exe` 安装包 → 发布到 GitHub Releases
4. 已安装的用户下次打开应用 5 秒后检测到新版本 → 右下角弹通知

### 自动更新链路图

```
你 git push --tags
    ↓
GitHub Actions 自动构建
    ↓
发布到 GitHub Releases（带 .exe + latest.yml）
    ↓
用户的应用启动 → electron-updater 检查 Releases
    ↓
发现新版本 → 右下角弹出 "发现新版本 vX.X.X"
    ↓
用户点 "立即更新" → 显示下载进度条
    ↓
下载完成 → 弹出 "重启安装"
    ↓
用户点 "立即重启" → 自动安装并重启应用
```

### 本地手动打包（不走 GitHub Actions）

**推荐方式 — 一键打包+注册自启动：**

```powershell
# PowerShell 管理员权限
.\setup-autostart.ps1
```

此脚本会自动：构建前端 → 用 @electron/packager 打包 → 修复 asar 缺失模块 → 注册开机自启动。

**只打包不自启：**

```bash
npm run pack
```

打包后的 exe 在 `release/便利签看板-win32-x64/便利签看板.exe`，双击即可运行。

**打 NSIS 安装包（需要发版时用）：**

```bash
npm run dist
```

> 注意：`npm run dist` 使用 electron-builder，在 Windows 本地可能遇到 EPERM 文件锁错误。如果遇到，临时关闭 Windows Defender 实时扫描后重试。GitHub Actions 环境不会有此问题。

## 🤖 AI 辅助开发

本项目适合 vibe coding。如果你使用 AI 编程助手，以下上下文文件可帮助 AI 理解项目：

- `.cursorrules` — Cursor 编辑器读取
- `.clinerules` — Cline 插件读取
- `AGENTS.md` — 通用格式，其他 AI 工具也可参考

## ⚠️ 已知问题与解决方案

### electron-builder EPERM 文件锁

`npm run dist` 在 Windows 本地打包时，electron-builder 会将解压目录从 `win-unpacked.tmp` 重命名为 `win-unpacked`，但 Windows Defender 或文件系统可能锁定其中的文件，导致 `EPERM: operation not permitted, rename` 错误。

**解决方案：** 本地打包用 `npm run pack`（@electron/packager），GitHub Actions 发版用 `npm run dist`（electron-builder，干净环境无此问题）。

### @electron/packager asar 缺失 semver 模块

@electron/packager 打出的 asar 偶尔会缺失 `electron-updater/node_modules/semver/functions/prerelease.js`，导致启动报 `Cannot find module './functions/prerelease'`。

**解决方案：** `setup-autostart.ps1` 脚本已内置自动检测和修复逻辑——提取 asar、补入缺失文件、重新打包。手动打包时如遇此问题，执行以下命令修复：

```bash
cd release/便利签看板-win32-x64/resources
npx asar extract app.asar app_fix
cp ../../../node_modules/electron-updater/node_modules/semver/functions/prerelease.js app_fix/node_modules/electron-updater/node_modules/semver/functions/
npx asar pack app_fix app.asar
rm -rf app_fix
```

### PowerShell 5.1 中文路径编码损坏

Windows 默认的 PowerShell 5.1 读取无 BOM 标记的 UTF-8 文件时，会按系统默认编码（中文系统为 GBK）解析，导致中文路径被损坏。此外 `schtasks` 命令行工具也会在存储路径时破坏中文字符。表现为计划任务注册成功但启动时找不到 exe 文件（错误码 `-2147024894`）。

**解决方案：** 所有包含中文路径的 `.ps1` 文件必须保存为 **UTF-8 with BOM**（文件头 `EF BB BF`）。注册计划任务时使用 PowerShell COM API（`Schedule.Service`）替代 `schtasks` 命令行。项目的 `setup-autostart.ps1` 和 `register-autostart-admin.ps1` 已预置 BOM 编码和 COM API 方式。

## 📋 变更日志

详见 [CHANGELOG.md](CHANGELOG.md)，记录了每次版本更新的内容。

## 📄 License

MIT

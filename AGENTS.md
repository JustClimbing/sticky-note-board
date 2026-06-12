# 便利签看板 — AI 助手上下文

你是一个正在协助开发「便利签看板」桌面应用的 AI 编程助手。以下是你需要了解的项目上下文。

## 项目概述

这是一个 Electron + React 桌面便利贴看板应用，温馨可爱风格。用户在 Windows 桌面上使用，用于管理个人待办事项。

## 技术栈

- **Electron 28** — 桌面壳，管理窗口/托盘/系统交互
- **React 18** — 主窗口 UI
- **Vite 5** — 前端构建（输出到 `dist-renderer/`，`base: './'`）
- **electron-builder** — 打包 Windows NSIS 安装包
- **electron-updater** — GitHub Releases 自动更新
- 无状态管理库，所有状态在 `App.jsx` 用 useState 管理
- 无路由，单页面应用
- 无 Tailwind/CSS 框架，所有样式在 `src/index.css` 手写

## 架构要点

### 双进程模型

- **主进程** (`electron/main.js`)：Node.js 环境，管理窗口、文件读写、系统托盘、任务计划、自动更新
- **渲染进程** (`src/`)：浏览器环境，React UI。通过 `window.electronAPI` 调用主进程功能
- **preload.js**：安全桥接层，用 `contextBridge.exposeInMainWorld` 暴露白名单 API
- **挂件窗口** (`electron/widget.html`)：独立的透明小窗口，用 `nodeIntegration: true` 直接调 `ipcRenderer`

### IPC 通信约定

- 主进程 → 渲染进程：`mainWindow.webContents.send('channel', data)`
- 渲染进程 → 主进程（请求/响应）：`ipcMain.handle('channel', handler)` + `ipcRenderer.invoke('channel')`
- 渲染进程 → 主进程（单向通知）：`ipcMain.on('channel', handler)` + `ipcRenderer.send('channel')`
- 所有 IPC channel 命名格式：`模块:动作`，如 `window:minimize`、`notes:save`、`update:available`

### 数据持久化

- 笔记数据存储在 `%APPDATA%/sticky-note-board/notes.json`
- 通过 `notes:load` / `notes:save` IPC 读写
- 渲染进程有 300ms 防抖自动保存

### 自启动机制

- 使用 Windows `schtasks` 注册 `onlogon` 触发器，延迟 30 秒
- 启动参数 `--silent` 表示静默模式（窗口隐藏，只在托盘显示）
- 通过 `isAutoLaunchEnabled()` / `enableAutoLaunch()` / `disableAutoLaunch()` 管理

### 自动更新机制

- `electron-updater` 的 `autoUpdater` 在 app ready 后 5 秒检查一次，之后每 4 小时检查
- 开发模式下（`NODE_ENV=development`）跳过更新检查
- 更新状态通过 IPC 发送到渲染进程的 `UpdateNotification` 组件

## 文件修改指南

| 要改的东西 | 改哪个文件 |
|-----------|-----------|
| 界面样式/颜色 | `src/index.css`（`:root` 变量 + 各组件区块） |
| 便利贴颜色选项 | `src/App.jsx` 的 `colors` 数组 + `src/components/Note.jsx` 的 `NOTE_COLORS` |
| 看板列定义 | `src/components/Board.jsx` 的 `KANBAN_COLUMNS` 数组 |
| 工具栏按钮 | `src/components/Toolbar.jsx` |
| 窗口行为 | `electron/main.js` 的 `createWindow()` |
| 托盘菜单 | `electron/main.js` 的 `createTray()` / `refreshTrayMenu()` |
| 挂件外观 | `electron/widget.html`（自包含 HTML+CSS+JS） |
| 新增 Electron API | `electron/main.js` 加 handler → `electron/preload.js` 暴露 → React 里调 `window.electronAPI.xxx()` |

## 编码约定

- 组件文件用 PascalCase（`Toolbar.jsx`），函数名用 camelCase
- CSS 类名用 kebab-case（`sticky-note`、`kanban-column-header`）
- IPC channel 用冒号分隔（`notes:save`、`widget:click`）
- 注释用中文
- 使用函数组件 + Hooks，不用 class 组件
- Electron 窗口 `frame: false`（无边框），拖动通过 `-webkit-app-region: drag` 实现

## 开发命令

```bash
npm run dev       # 开发模式（Vite 热更新 + Electron）
npm run build     # 只构建前端
npm run pack      # 打包到 release/win-unpacked/（测试用）
npm run dist      # 打包成 NSIS 安装包
npm run release   # 打包 + 发布到 GitHub Releases
```

## 发版流程

```bash
npm version patch  # 升版本号
git push && git push --tags  # 推送后 GitHub Actions 自动构建发布
```

## 常见坑

1. **electron-builder 打包失败**：Windows Defender 实时扫描锁定文件，临时关闭后重试
2. **修改 electron/ 下的文件**：需要重启 Electron 进程，Vite 热更新只覆盖 src/ 下的文件
3. **挂件窗口不能热更新**：widget.html 是独立文件，修改后需重启 Electron
4. **自动更新只在打包后生效**：开发模式下 `autoUpdater` 被跳过
5. **自启动需要管理员权限**：`schtasks` 创建任务需要管理员权限
6. **Vite base 必须是 `./`**：因为 Electron 用 `file://` 协议加载 HTML，相对路径才能正确解析资源

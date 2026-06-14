# 便利签看板 — AI 助手上下文

你是一个正在协助开发「便利签看板」桌面应用的 AI 编程助手。以下是你需要了解的项目上下文。

## 项目概述

这是一个 Electron + React 桌面便利贴看板应用，温馨可爱风格。用户在 Windows 桌面上使用，用于管理个人待办事项。

## 技术栈

- **Electron 28** — 桌面壳，管理窗口/托盘/系统交互
- **React 18** — 主窗口 UI
- **Vite 5** — 前端构建（输出到 `dist-renderer/`，`base: './'`）
- **@electron/packager** — 本地打包工具（`npm run pack`，输出到 `release/便利签看板-win32-x64/`）
- **electron-builder** — GitHub Actions 发版打包（`npm run dist/release`，输出 NSIS 安装包）
- **electron-updater** — GitHub Releases 自动更新
- **marked** — Markdown 解析库，用于 `md-editor.html` 中块级即时渲染
- 无状态管理库，所有状态在 `App.jsx` 用 useState 管理
- 无路由，单页面应用
- 无 Tailwind/CSS 框架，所有样式在 `src/index.css` 手写

## 架构要点

### 双进程模型

- **主进程** (`electron/main.js`)：Node.js 环境，管理窗口、文件读写、系统托盘、任务计划、自动更新
- **渲染进程** (`src/`)：浏览器环境，React UI。通过 `window.electronAPI` 调用主进程功能
- **preload.js**：安全桥接层，用 `contextBridge.exposeInMainWorld` 暴露白名单 API
- **挂件窗口** (`electron/widget.html`)：独立的透明小窗口，用 `nodeIntegration: true` 直接调 `ipcRenderer`

### Markdown 编辑器窗口

- **文件**：`electron/md-editor.html`，独立的 Electron 窗口，与挂件窗口类似使用 `nodeIntegration: true` 直接调 `ipcRenderer`
- **块级即时渲染**（Typora 风格）：
  - 将 Markdown 文本按空行分割为"块"（保护代码块不被拆开，用占位符替换后再 split）
  - 每个块渲染为 `<div>`，显示 `marked` 解析后的 HTML；点击任意块切换为 `<textarea>` 编辑态
  - 失焦（blur）、Escape、Enter（在非 Shift 时分割块）时重新渲染
  - Backspace 在块首时与前一块合并；方向键上下在块间导航
- **图片粘贴**：`handlePaste()` 拦截剪贴板图片 → 读取 base64 → 通过 `md:save-image` IPC 存盘 → 返回 `md-notes://images/xxx.png` 路径 → 插入 Markdown 图片语法
- **自定义协议 `md-notes://`**：
  - 在 `app.whenReady()` 之前调用 `protocol.registerSchemesAsPrivileged` 注册为 standard + secure
  - 在 `app.whenReady()` 中调用 `protocol.registerFileProtocol` 将 URL 映射到笔记存储目录下的文件
  - 解决了编辑器 HTML 从 `electron/` 目录加载时无法解析笔记目录中图片路径的问题
- **配置管理**：`config.json` 存储在 `userData` 目录，保存笔记文件夹路径等偏好。通过 `loadConfig()` / `saveConfig()` 读写
- **笔记存储**：默认路径 `%APPDATA%/sticky-note-board/markdown-notes/`，用户可通过 `md:select-folder` 自定义
- **自动保存**：编辑后 600ms 防抖自动保存到磁盘

### IPC 通信约定

- 主进程 → 渲染进程：`mainWindow.webContents.send('channel', data)`
- 渲染进程 → 主进程（请求/响应）：`ipcMain.handle('channel', handler)` + `ipcRenderer.invoke('channel')`
- 渲染进程 → 主进程（单向通知）：`ipcMain.on('channel', handler)` + `ipcRenderer.send('channel')`
- 所有 IPC channel 命名格式：`模块:动作`，如 `window:minimize`、`notes:save`、`update:available`
- Markdown 编辑器 IPC：`md:list`（列表）、`md:create`（新建）、`md:read`（读取）、`md:save`（保存）、`md:delete`（删除）、`md:select-folder`（选文件夹）、`md:get-folder`（获取路径）、`md:save-image`（保存图片）
- 编辑器窗口控制 IPC：`md-editor:open`、`md-editor:minimize`、`md-editor:close`、`md-editor:toggle-always-on-top`

### 数据持久化

- 笔记数据存储在 `%APPDATA%/sticky-note-board/notes.json`
- 通过 `notes:load` / `notes:save` IPC 读写
- 渲染进程有 300ms 防抖自动保存
- Markdown 笔记默认存储在 `%APPDATA%/sticky-note-board/markdown-notes/`
- 用户偏好（含笔记文件夹路径）存储在 `%APPDATA%/sticky-note-board/config.json`
- 图片保存在笔记目录的 `images/` 子文件夹中，通过 `md-notes://` 协议引用

### 自启动机制

- 使用 Windows `schtasks` 注册 `onlogon` 触发器，延迟 30 秒
- 启动参数 `--silent` 表示静默模式：主窗口隐藏（只在托盘），**自动开启挂件模式**（桌面浮标）
- 用户点击桌面挂件 → 弹出完整看板；右键挂件可关闭挂件或退出应用
- 通过 `isAutoLaunchEnabled()` / `enableAutoLaunch()` / `disableAutoLaunch()` 管理

### 自动更新机制

- `electron-updater` 的 `autoUpdater` 在 app ready 后 5 秒检查一次，之后每 4 小时检查
- 开发模式下（`NODE_ENV=development`）跳过更新检查
- 更新状态通过 IPC 发送到渲染进程的 `UpdateNotification` 组件

### 打包机制

- **本地打包（`npm run pack`）**：使用 `@electron/packager`，命令为 `npx @electron/packager . 便利签看板 --platform=win32 --arch=x64 --out=release --overwrite --asar`
  - 输出目录：`release/便利签看板-win32-x64/`
  - 不会经过 .tmp rename 步骤，避免了 electron-builder 的 EPERM 文件锁问题
  - 已知问题：asar 偶尔缺失 `semver/functions/prerelease.js`，`setup-autostart.ps1` 内置了自动修复逻辑
- **发版打包（`npm run dist/release`）**：使用 `electron-builder`，由 GitHub Actions 在干净 Windows 环境中执行
  - 输出：NSIS 安装包 `便利签看板 Setup X.X.X.exe` + `latest.yml`
  - electron-builder 配置在 `package.json` 的 `build` 字段中

### 开机自启动注册流程

```
setup-autostart.ps1
    ↓ npm run build（Vite 构建前端）
    ↓ npx @electron/packager（打包 Electron 应用）
    ↓ asar 缺失检测+修复（补入 prerelease.js）
    ↓ 写入临时 PS1 脚本（含 schtasks 命令）
    ↓ Start-Process -Verb RunAs（UAC 提权弹窗）
    ↓ schtasks /Create（注册 ONLOGON + 30s 延迟任务）
    ↓ 验证任务是否注册成功
```

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
| Markdown 编辑器 | `electron/md-editor.html`（自包含 HTML+CSS+JS，使用 `marked` 库） |
| Markdown 笔记存储路径 | `electron/main.js` 的 `getMdNotesFolder()` / `config.json` |
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
npm run pack      # 打包到 release/便利签看板-win32-x64/（@electron/packager，推荐）
npm run dist      # 打包成 NSIS 安装包（electron-builder，本地可能 EPERM）
npm run release   # 打包 + 发布到 GitHub Releases
.\setup-autostart.ps1  # 一键打包 + 注册开机自启动
```

## 发版流程

```bash
npm version patch  # 升版本号
git push && git push --tags  # 推送后 GitHub Actions 自动构建发布
```

## 常见坑

1. **electron-builder EPERM 文件锁**：Windows Defender 扫描锁定文件导致 rename 失败，本地打包改用 `npm run pack`（@electron/packager），发版走 GitHub Actions
2. **@electron/packager asar 缺文件**：打包后 asar 可能缺失 `semver/functions/prerelease.js`，启动报 `Cannot find module`。`setup-autostart.ps1` 已内置自动修复，手动修复见 README
3. **修改 electron/ 下的文件**：需要重启 Electron 进程，Vite 热更新只覆盖 src/ 下的文件
4. **挂件窗口不能热更新**：widget.html 是独立文件，修改后需重启 Electron
5. **自动更新只在打包后生效**：开发模式下 `autoUpdater` 被跳过
6. **自启动需要管理员权限**：`schtasks` 创建任务需要管理员权限，`setup-autostart.ps1` 通过 UAC 提权处理
7. **Vite base 必须是 `./`**：因为 Electron 用 `file://` 协议加载 HTML，相对路径才能正确解析资源
8. **PowerShell 脚本中 `$` 变量被 bash 吞掉**：从 bash 调用 PowerShell 时，`$` 变量会被 bash 解释。解决方案：将 PowerShell 脚本写入 .ps1 文件后用 `-File` 参数执行，而非用 `-Command` 内联
9. **PowerShell 5.1 中文路径乱码（致命）**：PowerShell 5.1 读取无 BOM 的 UTF-8 文件时按 GBK 解析，导致中文路径损坏，计划任务注册后 exe 找不到文件。**解决方案**：
   - 含中文路径的 .ps1 文件必须保存为 **UTF-8 with BOM**（`EF BB BF` 开头）
   - 注册计划任务使用 PowerShell COM API（`Schedule.Service`），不用 `schtasks` 命令行
   - `setup-autostart.ps1` 和 `register-autostart-admin.ps1` 已预置 BOM
10. **Markdown 编辑器图片路径**：编辑器 HTML 从 `electron/` 目录加载，无法用相对路径引用笔记目录中的图片。必须使用自定义 `md-notes://` 协议解析图片路径，不要用 `file://` 或相对路径
11. **Markdown 编辑器窗口不能热更新**：`md-editor.html` 是独立文件，修改后需重启 Electron

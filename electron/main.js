const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  screen,
  dialog,
  protocol,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let tray;
let widgetWindow = null;
let widgetEnabled = false;
let mdEditorWindow = null;
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'notes.json');

// ──────────── Config & Markdown Notes ────────────
const configFilePath = path.join(userDataPath, 'config.json');
const defaultMdFolder = path.join(userDataPath, 'markdown-notes');

function loadConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      return JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save config:', e);
    return false;
  }
}

function getMdNotesFolder() {
  const config = loadConfig();
  return config.mdNotesFolder || defaultMdFolder;
}

function ensureMdFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

// ──────────── Single Instance Lock ────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// ──────────── Custom Protocol for Images ────────────
protocol.registerSchemesAsPrivileged([
  { scheme: 'md-notes', privileges: { standard: true, secure: true } }
]);

// ──────────── Auto-launch Helpers ────────────
const TASK_NAME = 'StickyNoteBoardAutoStart';

function isAutoLaunchEnabled() {
  try {
    const output = execSync(
      `schtasks /query /tn "${TASK_NAME}" /fo CSV /nh 2>nul`,
      { encoding: 'utf-8', windowsHide: true }
    );
    return output.includes(TASK_NAME);
  } catch {
    return false;
  }
}

function enableAutoLaunch() {
  const exePath = process.execPath;
  // Use Task Scheduler with 30s delay — doesn't block boot
  const cmd = `schtasks /create /tn "${TASK_NAME}" /tr "\\"${exePath}\\" --silent" /sc onlogon /delay 0000:30 /f /rl highest`;
  try {
    execSync(cmd, { windowsHide: true });
    return true;
  } catch (e) {
    console.error('Failed to enable auto-launch:', e.message);
    return false;
  }
}

function disableAutoLaunch() {
  try {
    execSync(`schtasks /delete /tn "${TASK_NAME}" /f`, { windowsHide: true });
    return true;
  } catch (e) {
    console.error('Failed to disable auto-launch:', e.message);
    return false;
  }
}

// Check if launched with --silent flag (start hidden to tray)
const isSilentLaunch = process.argv.includes('--silent');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 480,
    frame: false,
    backgroundColor: '#FFF8F0',
    show: false,
    skipTaskbar: isSilentLaunch,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'));
  }

  // Show window when ready (skip if silent launch — stay in tray)
  mainWindow.once('ready-to-show', () => {
    if (!isSilentLaunch) {
      mainWindow.show();
    }
  });

  // Close to tray instead of quitting
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ──────────── Widget Window ────────────

function createWidgetWindow() {
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;

  widgetWindow = new BrowserWindow({
    width: 80,
    height: 90,
    x: screenW - 100,
    y: screenH - 120,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  widgetWindow.loadFile(path.join(__dirname, 'widget.html'));

  widgetWindow.on('blur', () => {
    // Widget stays visible even when losing focus
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

function destroyWidgetWindow() {
  if (widgetWindow) {
    widgetWindow.destroy();
    widgetWindow = null;
  }
}

function showMainWindow() {
  if (mainWindow) {
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
  }
}

// ──────────── Markdown Editor Window ────────────

function createMdEditorWindow() {
  if (mdEditorWindow) {
    mdEditorWindow.show();
    mdEditorWindow.focus();
    return;
  }

  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;

  mdEditorWindow = new BrowserWindow({
    width: 680,
    height: 720,
    minWidth: 420,
    minHeight: 360,
    x: Math.round(screenW / 2 - 340),
    y: Math.round(screenH / 2 - 360),
    frame: false,
    backgroundColor: '#FFF8F0',
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mdEditorWindow.loadFile(path.join(__dirname, 'md-editor.html'));

  mdEditorWindow.on('closed', () => {
    mdEditorWindow = null;
  });
}

function openMdEditorAndCreateNote() {
  createMdEditorWindow();
  // Wait for editor to fully load, then send a create-note signal
  if (mdEditorWindow) {
    mdEditorWindow.webContents.once('did-finish-load', () => {
      mdEditorWindow.webContents.send('md-editor:auto-create');
    });
  }
}

// ──────────── Tray ────────────

function createTray() {
  // Create a 32x32 tray icon — sticky note with warm color
  const size = 32;
  const canvas = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Rounded rectangle with padding
      const px = x - 3, py = y - 3, pw = size - 6, ph = size - 6;
      const inRect = px >= 0 && px < pw && py >= 0 && py < ph;
      const r = 4; // corner radius
      const inCorner =
        (px < r && py < r && Math.hypot(px - r, py - r) > r) ||
        (px >= pw - r && py < r && Math.hypot(px - (pw - r - 1), py - r) > r) ||
        (px < r && py >= ph - r && Math.hypot(px - r, py - (ph - r - 1)) > r) ||
        (px >= pw - r && py >= ph - r &&
          Math.hypot(px - (pw - r - 1), py - (ph - r - 1)) > r);

      if (inRect && !inCorner) {
        canvas[idx] = 255; // R — warm yellow
        canvas[idx + 1] = 210; // G
        canvas[idx + 2] = 100; // B
        canvas[idx + 3] = 255; // A
        // Add subtle fold in bottom-right
        if (px > pw - 8 && py > ph - 8) {
          canvas[idx] = 240;
          canvas[idx + 1] = 195;
          canvas[idx + 2] = 85;
        }
      } else {
        canvas[idx + 3] = 0; // transparent
      }
    }
  }
  const icon = nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size,
  });

  tray = new Tray(icon);
  tray.setToolTip('便利签看板');
  refreshTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.setSkipTaskbar(false);
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function refreshTrayMenu() {
  const autoLaunchOn = isAutoLaunchEnabled();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📌 显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.setSkipTaskbar(false);
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: '📝 Markdown 笔记',
      click: () => createMdEditorWindow(),
    },
    { type: 'separator' },
    {
      label: autoLaunchOn ? '✅ 开机自启动（已开启）' : '⬜ 开机自启动（未开启）',
      click: () => {
        if (autoLaunchOn) {
          disableAutoLaunch();
        } else {
          enableAutoLaunch();
        }
        refreshTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  if (tray) tray.setContextMenu(contextMenu);
}

// ──────────── IPC Handlers ────────────

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:toggle-always-on-top', async () => {
  if (!mainWindow) return false;
  const current = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!current);
  return !current;
});

ipcMain.handle('window:close', () => {
  // Minimize to tray, not quit
  if (mainWindow) {
    mainWindow.hide();
    mainWindow.setSkipTaskbar(true);
  }
});

// Auto-launch management
ipcMain.handle('autolaunch:get', () => {
  return isAutoLaunchEnabled();
});

ipcMain.handle('autolaunch:toggle', () => {
  if (isAutoLaunchEnabled()) {
    disableAutoLaunch();
    refreshTrayMenu();
    return false;
  } else {
    enableAutoLaunch();
    refreshTrayMenu();
    return true;
  }
});

// ──── Widget Mode ────
ipcMain.handle('widget:get', () => {
  return widgetEnabled;
});

ipcMain.handle('widget:toggle', () => {
  widgetEnabled = !widgetEnabled;
  if (widgetEnabled) {
    createWidgetWindow();
    // Hide main window when widget is activated from toolbar
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }
  } else {
    destroyWidgetWindow();
    // Show main window when widget is deactivated
    showMainWindow();
  }
  return widgetEnabled;
});

// Widget sends drag events (using ipcMain.on, not handle)
ipcMain.on('widget:drag', (event, { x, y }) => {
  if (widgetWindow) {
    widgetWindow.setPosition(x - 40, y - 40);
  }
});

// Widget clicked — show main window
ipcMain.on('widget:click', () => {
  showMainWindow();
});

// Widget right-click context menu
ipcMain.on('widget:context-menu', () => {
  if (!widgetWindow) return;
  const menu = Menu.buildFromTemplate([
    {
      label: '📌 显示看板',
      click: () => showMainWindow(),
    },
    {
      label: '📝 新建 Markdown 笔记',
      click: () => openMdEditorAndCreateNote(),
    },
    {
      label: '📂 打开 Markdown 编辑器',
      click: () => createMdEditorWindow(),
    },
    { type: 'separator' },
    {
      label: '关闭挂件',
      click: () => {
        widgetEnabled = false;
        destroyWidgetWindow();
        showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  menu.popup({ window: widgetWindow });
});

// Notes data persistence
ipcMain.handle('notes:load', () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      return JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load notes:', e);
  }
  return null;
});

ipcMain.handle('notes:save', (event, data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save notes:', e);
    return false;
  }
});

// ──── Widget Markdown quick-create ────
ipcMain.on('widget:md-new', () => {
  createMdEditorWindow();
});

// ──────────── Markdown Notes IPC ────────────

// List all markdown notes
ipcMain.handle('md:list', () => {
  const folder = getMdNotesFolder();
  ensureMdFolder(folder);
  try {
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.md'));
    const notes = files.map(fileName => {
      const filePath = path.join(folder, fileName);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      // Extract title from first line if it's a heading
      const firstLine = content.split('\n')[0] || '';
      const title = firstLine.replace(/^#+\s*/, '').trim() || fileName.replace('.md', '');
      return {
        id: fileName.replace('.md', ''),
        title,
        fileName,
        createdAt: stat.birthtimeMs,
        updatedAt: stat.mtimeMs,
      };
    });
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    console.error('Failed to list markdown notes:', e);
    return [];
  }
});

// Create a new markdown note
ipcMain.handle('md:create', (event, initialContent) => {
  const folder = getMdNotesFolder();
  ensureMdFolder(folder);
  const timestamp = Date.now();
  const id = `note-${timestamp}`;
  const fileName = `${id}.md`;
  const filePath = path.join(folder, fileName);
  const content = initialContent || '';
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return {
      id,
      title: '无标题',
      fileName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  } catch (e) {
    console.error('Failed to create markdown note:', e);
    return null;
  }
});

// Read a markdown note
ipcMain.handle('md:read', (event, noteId) => {
  const folder = getMdNotesFolder();
  const filePath = path.join(folder, `${noteId}.md`);
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (e) {
    console.error('Failed to read markdown note:', e);
  }
  return '';
});

// Save a markdown note
ipcMain.handle('md:save', (event, noteId, content, title) => {
  const folder = getMdNotesFolder();
  const filePath = path.join(folder, `${noteId}.md`);
  try {
    // Prepend title as H1 if not already present
    let finalContent = content;
    if (title && !content.startsWith('# ')) {
      finalContent = `# ${title}\n\n${content}`;
    }
    fs.writeFileSync(filePath, finalContent, 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save markdown note:', e);
    return false;
  }
});

// Delete a markdown note
ipcMain.handle('md:delete', (event, noteId) => {
  const folder = getMdNotesFolder();
  const filePath = path.join(folder, `${noteId}.md`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (e) {
    console.error('Failed to delete markdown note:', e);
  }
  return false;
});

// Select storage folder
ipcMain.handle('md:select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: '选择 Markdown 笔记存储文件夹',
      defaultPath: getMdNotesFolder(),
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const folder = result.filePaths[0];
      const config = loadConfig();
      config.mdNotesFolder = folder;
      saveConfig(config);
      return folder;
    }
  } catch (e) {
    console.error('Failed to select folder:', e);
  }
  return null;
});

// Get current storage folder
ipcMain.handle('md:get-folder', () => {
  return getMdNotesFolder();
});

// Save pasted image to disk
ipcMain.handle('md:save-image', (event, base64Data, ext) => {
  try {
    const folder = getMdNotesFolder();
    const imagesDir = path.join(folder, 'images');
    ensureMdFolder(imagesDir);
    const timestamp = Date.now();
    const fileName = `paste-${timestamp}.${ext || 'png'}`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return { relativePath: `md-notes://images/${fileName}` };
  } catch (e) {
    console.error('Failed to save image:', e);
    return null;
  }
});

// Markdown editor window controls
ipcMain.handle('md-editor:toggle-always-on-top', () => {
  if (!mdEditorWindow) return false;
  const current = mdEditorWindow.isAlwaysOnTop();
  mdEditorWindow.setAlwaysOnTop(!current);
  return !current;
});

ipcMain.on('md-editor:minimize', () => {
  if (mdEditorWindow) {
    mdEditorWindow.minimize();
  }
});

ipcMain.on('md-editor:close', () => {
  if (mdEditorWindow) {
    mdEditorWindow.close();
  }
});

// Open markdown editor from main window
ipcMain.handle('md-editor:open', () => {
  createMdEditorWindow();
  return true;
});

// ──────────── Auto Update ────────────

function initAutoUpdater() {
  // Don't check for updates in development mode
  if (process.env.NODE_ENV === 'development') return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseNotes: info.releaseNotes || '',
      });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:progress', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:downloaded', {
        version: info.version,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
  });

  // Check for updates 5 seconds after startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);

  // Then check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

ipcMain.handle('update:download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('update:install', () => {
  app.isQuitting = true;
  autoUpdater.quitAndInstall();
});

ipcMain.handle('update:check', () => {
  return autoUpdater.checkForUpdates();
});

// ──────────── App Lifecycle ────────────

app.whenReady().then(() => {
  // Register custom protocol for serving images from notes folder
  protocol.registerFileProtocol('md-notes', (request, callback) => {
    const url = request.url.replace('md-notes://', '');
    const filePath = path.join(getMdNotesFolder(), decodeURIComponent(url));
    callback({ path: filePath });
  });

  createWindow();
  createTray();
  initAutoUpdater();

  // 静默启动时自动开启挂件模式（桌面浮标，点击弹出看板）
  if (isSilentLaunch) {
    widgetEnabled = true;
    createWidgetWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Focus existing window when second instance is launched
app.on('second-instance', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.setSkipTaskbar(false);
    mainWindow.focus();
  }
});

// Don't quit when windows are closed — stay in tray
app.on('window-all-closed', () => {
  // Only quit on macOS when explicitly requested
  if (process.platform === 'darwin') return;
  // On Windows, keep running in tray
});

// Minimize to tray instead of closing
app.on('before-quit', () => {
  app.isQuitting = true;
});

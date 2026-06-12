const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  close: () => ipcRenderer.invoke('window:close'),
  loadNotes: () => ipcRenderer.invoke('notes:load'),
  saveNotes: (data) => ipcRenderer.invoke('notes:save', data),
  getAutoLaunch: () => ipcRenderer.invoke('autolaunch:get'),
  toggleAutoLaunch: () => ipcRenderer.invoke('autolaunch:toggle'),
  getWidgetMode: () => ipcRenderer.invoke('widget:get'),
  toggleWidgetMode: () => ipcRenderer.invoke('widget:toggle'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_, info) => cb(info)),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', (_, info) => cb(info)),
});

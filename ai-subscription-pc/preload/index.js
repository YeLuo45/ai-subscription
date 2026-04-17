/**
 * Electron Preload Script - 暴露安全的 IPC 通道给 Renderer
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 存储
  store: {
    getAll: () => ipcRenderer.invoke('store:getAll'),
    setSubscriptions: (subs) => ipcRenderer.invoke('store:setSubscriptions', subs),
    setModels: (models) => ipcRenderer.invoke('store:setModels', models),
    setPushSettings: (settings) => ipcRenderer.invoke('store:setPushSettings', settings),
    setContents: (subId, contents) => ipcRenderer.invoke('store:setContents', subId, contents),
  },

  // 内容抓取
  fetch: {
    rss: (url, type) => ipcRenderer.invoke('fetch:rss', url, type),
  },

  // 系统通知
  notification: {
    show: (title, body, onClick) => ipcRenderer.invoke('notification:show', title, body, onClick),
  },

  // 邮件
  email: {
    send: (options) => ipcRenderer.invoke('email:send', options),
    test: (smtpConfig) => ipcRenderer.invoke('email:test', smtpConfig),
  },

  // 推送历史
  history: {
    add: (record) => ipcRenderer.invoke('history:add', record),
  },

  // 事件监听
  on: (channel, callback) => {
    const validChannels = ['fetch-all', 'trigger-push', 'notification-clicked'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

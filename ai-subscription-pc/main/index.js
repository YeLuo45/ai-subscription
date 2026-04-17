/**
 * Electron Main Process - AI Subscription PC App
 */
const { app, BrowserWindow, ipcMain, Notification, Menu } = require('electron');
const path = require('path');
const cron = require('node-cron');
const Store = require('electron-store');
const Parser = require('rss-parser');
const nodemailer = require('nodemailer');

// 初始化存储
const store = new Store({
  name: 'ai-subscription-data',
  defaults: {
    subscriptions: [],
    models: [],
    pushSettings: {
      enabled: false,
      pushTime: '09:00',
      pushChannel: 'notification',
      contentType: 'title_summary',
    },
    contents: {},
    pushHistory: [],
  },
});

let mainWindow = null;
let cronJob = null;

// 开发模式判断
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AI 订阅助手',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
    },
  });

  // 加载页面
  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // 创建菜单
  const menuTemplate = [
    {
      label: '文件',
      submenu: [
        { label: '刷新内容', click: () => mainWindow.webContents.send('fetch-all') },
        { type: 'separator' },
        { label: '退出', click: () => app.quit() },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '全屏', click: () => mainWindow.setFullScreen(true) },
        { label: '退出全屏', click: () => mainWindow.setFullScreen(false) },
        { type: 'separator' },
        { label: '开发者工具', click: () => mainWindow.webContents.toggleDevTools() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  startCronJob();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopCronJob();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ========== 定时任务 ==========
function startCronJob() {
  stopCronJob();
  
  const settings = store.get('pushSettings');
  if (!settings.enabled) return;

  // 每天在指定时间执行
  const [hour, minute] = settings.pushTime.split(':');
  const cronExpression = `${minute} ${hour} * * *`;

  cronJob = cron.schedule(cronExpression, async () => {
    console.log('[Cron] 触发定时推送');
    mainWindow?.webContents.send('trigger-push');
  });

  console.log(`[Cron] 已启动定时推送任务: ${settings.pushTime}`);
}

function stopCronJob() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
}

// ========== IPC 处理器 ==========

// 获取所有数据
ipcMain.handle('store:getAll', () => {
  return store.store;
});

// 保存订阅源
ipcMain.handle('store:setSubscriptions', (event, subscriptions) => {
  store.set('subscriptions', subscriptions);
  return true;
});

// 保存模型
ipcMain.handle('store:setModels', (event, models) => {
  store.set('models', models);
  return true;
});

// 保存推送设置
ipcMain.handle('store:setPushSettings', (event, pushSettings) => {
  store.set('pushSettings', pushSettings);
  startCronJob(); // 重新启动定时任务
  return true;
});

// 保存内容
ipcMain.handle('store:setContents', (event, subscriptionId, contents) => {
  const allContents = store.get('contents') || {};
  allContents[subscriptionId] = contents;
  store.set('contents', allContents);
  return true;
});

// 抓取 RSS
ipcMain.handle('fetch:rss', async (event, url, type) => {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL(url);
    
    const items = feed.items.slice(0, 20).map((item, index) => ({
      id: item.guid || item.link || `${Date.now()}-${index}`,
      title: item.title || '无标题',
      link: item.link || '',
      description: item.contentSnippet || item.content || item.summary || '',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
    }));

    return { success: true, items, title: feed.title || '未知来源' };
  } catch (error) {
    console.error('[Fetch] RSS 抓取失败:', error);
    return { success: false, error: error.message };
  }
});

// 发送系统通知
ipcMain.handle('notification:show', (event, title, body, onClick) => {
  if (!Notification.isSupported()) {
    return { success: false, error: '通知不支持' };
  }

  const notification = new Notification({
    title,
    body,
    silent: false,
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      if (onClick) {
        mainWindow.webContents.send('notification-clicked', onClick);
      }
    }
  });

  notification.show();
  return { success: true };
});

// 发送邮件
ipcMain.handle('email:send', async (event, options) => {
  try {
    const { smtpConfig, to, subject, html } = options;
    
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.useTLS,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.email,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('[Email] 发送失败:', error);
    return { success: false, error: error.message };
  }
});

// 测试邮件
ipcMain.handle('email:test', async (event, smtpConfig) => {
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.useTLS,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.email,
      to: smtpConfig.email,
      subject: 'AI 订阅助手 - 测试邮件',
      html: '<h1>测试成功！</h1><p>这是一封来自 AI 订阅助手的测试邮件。</p>',
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 记录推送历史
ipcMain.handle('history:add', (event, record) => {
  const history = store.get('pushHistory') || [];
  history.unshift({
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pushedAt: new Date().toISOString(),
  });
  // 只保留最近 100 条
  store.set('pushHistory', history.slice(0, 100));
  return true;
});

console.log('[Main] Electron 主进程已启动');

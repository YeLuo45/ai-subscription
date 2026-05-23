/**
 * PC Channel Adapter - Electron 桌面端适配器
 * 
 * 基于 nanobot MessageBus + thunderbolt PowerSync 架构
 * PC 端使用 SQLite 本地存储 + WebSocket 云端同步
 */

import { EventEmitter } from 'eventemitter3'
import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { CloudSyncClient, type ChangePayload, type StorageAdapter } from '../../cloud-sync/client'

// ============ Storage Adapter (Electron Store) ============

export class PCStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map()
  private filePath: string

  constructor(dataPath?: string) {
    this.filePath = dataPath || path.join(app.getPath('userData'), 'sync-data.json')
    this.load()
  }

  private load(): void {
    try {
      const fs = require('fs')
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
        this.store = new Map(Object.entries(data))
      }
    } catch (e) {
      console.error('[PCStorage] Load error:', e)
    }
  }

  private persist(): void {
    try {
      const fs = require('fs')
      const data = Object.fromEntries(this.store)
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2))
    } catch (e) {
      console.error('[PCStorage] Persist error:', e)
    }
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
    this.persist()
  }

  removeItem(key: string): void {
    this.store.delete(key)
    this.persist()
  }
}

// ============ IPC Bridge (主进程 <-> 渲染进程) ============

/**
 * IPC Bridge for PC Channel Adapter
 * 处理 Electron 主进程和渲染进程之间的通信
 */
export class IPCBridge {
  constructor(
    private mainWindow: BrowserWindow,
    private cloudClient: CloudSyncClient
  ) {
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // 渲染进程请求同步
    ipcMain.handle('sync:push', async (_event, changes: ChangePayload[]) => {
      return this.cloudClient.pushChanges(changes)
    })

    ipcMain.handle('sync:force', async () => {
      return this.cloudClient.forceSync()
    })

    ipcMain.handle('sync:status', () => {
      return {
        clientId: this.cloudClient.getClientId(),
        isConnected: this.cloudClient.isConnected
      }
    })

    // 监听云端变更，推送到渲染进程
    this.cloudClient.on('sync', (changes: ChangePayload[]) => {
      this.mainWindow.webContents.send('sync:changes', changes)
    })

    this.cloudClient.on('connect', () => {
      this.mainWindow.webContents.send('sync:connected')
    })

    this.cloudClient.on('disconnect', () => {
      this.mainWindow.webContents.send('sync:disconnected')
    })
  }

  destroy(): void {
    ipcMain.removeHandler('sync:push')
    ipcMain.removeHandler('sync:force')
    ipcMain.removeHandler('sync:status')
  }
}

// ============ PC Channel Adapter ============

export class PCChannelAdapter {
  private storage: PCStorageAdapter
  private cloudClient: CloudSyncClient | null = null
  private ipcBridge: IPCBridge | null = null
  private mainWindow: BrowserWindow | null = null

  constructor(
    private serverUrl: string = 'http://localhost:8001'
  ) {
    this.storage = new PCStorageAdapter()
  }

  /**
   * 初始化适配器 (主进程调用)
   */
  async initialize(mainWindow: BrowserWindow): Promise<void> {
    console.log('[PCAdapter] Initializing...')
    this.mainWindow = mainWindow

    // 初始化云端同步客户端
    await this.initCloudSync()

    // 设置 IPC 桥接
    if (this.cloudClient && mainWindow) {
      this.ipcBridge = new IPCBridge(mainWindow, this.cloudClient)
    }

    // 注册系统事件监听
    this.registerSystemListeners()

    console.log('[PCAdapter] Initialized')
  }

  /**
   * 初始化云端同步
   */
  private async initCloudSync(): Promise<void> {
    try {
      this.cloudClient = new CloudSyncClient({
        serverUrl: this.serverUrl,
        clientType: 'pc',
        storage: this.storage,
        onSync: (changes) => this.handleRemoteChanges(changes),
        onConnect: () => {
          console.log('[PCAdapter] Cloud connected')
          this.mainWindow?.webContents.send('sync:connected')
        },
        onDisconnect: () => {
          console.log('[PCAdapter] Cloud disconnected')
          this.mainWindow?.webContents.send('sync:disconnected')
        }
      })

      await this.cloudClient.connect()
    } catch (error) {
      console.error('[PCAdapter] Cloud init failed:', error)
    }
  }

  /**
   * 注册系统事件监听
   */
  private registerSystemListeners(): void {
    // 应用激活 (macOS dock click / Windows taskbar)
    app.on('activate', () => {
      console.log('[PCAdapter] App activated')
      this.cloudClient?.forceSync()
    })

    // 应用将要退出
    app.on('before-quit', () => {
      console.log('[PCAdapter] App quitting')
      this.cloudClient?.disconnect()
    })

    // 网络状态变化
    this.monitorNetwork()
  }

  private monitorNetwork(): void {
    const { net } = require('electron')
    
    // 定期检测网络连接
    setInterval(async () => {
      try {
        const result = await net.isOnline()
        if (result && !this.cloudClient) {
          // 网络恢复，重连
          await this.initCloudSync()
        }
      } catch (e) {
        // ignore
      }
    }, 30000) // 每 30 秒检测一次
  }

  /**
   * 处理云端变更
   */
  private handleRemoteChanges(changes: ChangePayload[]): void {
    console.log('[PCAdapter] Remote changes:', changes.length)
    
    for (const change of changes) {
      switch (change.entity_type) {
        case 'subscription':
          this.handleSubscriptionChange(change)
          break
        case 'article':
          this.handleArticleChange(change)
          break
        case 'read_status':
          this.handleReadStatusChange(change)
          break
      }
    }

    // 通知渲染进程
    this.mainWindow?.webContents.send('sync:changes', changes)
  }

  private handleSubscriptionChange(change: ChangePayload): void {
    if (change.operation === 'create' || change.operation === 'update') {
      this.saveSubscription(change.entity_id, change.data)
    } else if (change.operation === 'delete') {
      this.removeSubscription(change.entity_id)
    }
  }

  private handleArticleChange(change: ChangePayload): void {
    // 文章变更处理
    console.log('[PCAdapter] Article change:', change.entity_id)
  }

  private handleReadStatusChange(change: ChangePayload): void {
    const { is_read, is_bookmarked } = change.data as Record<string, boolean>
    
    if (is_read !== undefined) {
      this.updateArticleReadStatus(change.entity_id, is_read)
    }
    if (is_bookmarked !== undefined) {
      this.updateArticleBookmarkStatus(change.entity_id, is_bookmarked)
    }
  }

  // ============ Storage Operations ============

  private saveSubscription(id: string, data: Record<string, unknown>): void {
    const key = `subscription:${id}`
    this.storage.setItem(key, JSON.stringify(data))
  }

  private removeSubscription(id: string): void {
    const key = `subscription:${id}`
    this.storage.removeItem(key)
  }

  private updateArticleReadStatus(articleId: string, isRead: boolean): void {
    const key = `article:${articleId}`
    const existing = this.storage.getItem(key)
    if (existing) {
      const data = JSON.parse(existing)
      data.is_read = isRead
      this.storage.setItem(key, JSON.stringify(data))
    }
  }

  private updateArticleBookmarkStatus(articleId: string, isBookmarked: boolean): void {
    const key = `article:${articleId}`
    const existing = this.storage.getItem(key)
    if (existing) {
      const data = JSON.parse(existing)
      data.is_bookmarked = isBookmarked
      this.storage.setItem(key, JSON.stringify(data))
    }
  }

  // ============ Public API ============

  /**
   * 推送本地变更
   */
  async pushChange(change: ChangePayload): Promise<boolean> {
    if (this.cloudClient) {
      return this.cloudClient.pushChanges([change])
    }
    return false
  }

  /**
   * 强制同步
   */
  async forceSync(): Promise<void> {
    await this.cloudClient?.forceSync()
  }

  /**
   * 获取同步状态
   */
  getStatus(): { clientId: string; isConnected: boolean } {
    return {
      clientId: this.cloudClient?.getClientId() || '',
      isConnected: (this.cloudClient as unknown as { ws?: { readyState: number } })?.ws?.readyState === 1
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.ipcBridge?.destroy()
    this.cloudClient?.disconnect()
  }

  /**
   * 销毁适配器
   */
  destroy(): void {
    this.disconnect()
    this.mainWindow = null
  }
}

// ============ Factory ============

let adapterInstance: PCChannelAdapter | null = null

export function getPCChannelAdapter(): PCChannelAdapter {
  if (!adapterInstance) {
    adapterInstance = new PCChannelAdapter()
  }
  return adapterInstance
}

export function initializePCAdapter(mainWindow: BrowserWindow): Promise<void> {
  return getPCChannelAdapter().initialize(mainWindow)
}

export default PCChannelAdapter
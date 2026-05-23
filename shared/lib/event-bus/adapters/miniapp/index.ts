/**
 * MiniApp Channel Adapter
 * 微信小程序适配器 - 基于 ChannelAdapter 接口
 * 
 * 使用微信本地存储 + 事件总线实现跨端同步
 * 对接 shared/lib/event-bus 的 MessageBus 架构
 */

import { EventEmitter } from '@ viesjs/vies'
import { StorageAdapter } from '../types'
import { CloudSyncClient, type ChangePayload } from '../cloud-sync/client'

// ============ Storage Adapter (微信小程序) ============

/**
 * 微信小程序存储适配器
 * 使用 wx.getStorageSync / wx.setStorageSync
 */
export class MiniAppStorageAdapter implements StorageAdapter {
  constructor(private prefix: string = 'ai_sync_') {}

  getItem(key: string): string | null {
    try {
      return wx.getStorageSync(this.prefix + key) || null
    } catch (e) {
      console.error('[MiniAppStorage] getItem error:', e)
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      wx.setStorageSync(this.prefix + key, value)
    } catch (e) {
      console.error('[MiniAppStorage] setItem error:', e)
    }
  }

  removeItem(key: string): void {
    try {
      wx.removeStorageSync(this.prefix + key)
    } catch (e) {
      console.error('[MiniAppStorage] removeItem error:', e)
    }
  }
}

// ============ Channel Adapter Implementation ============

/**
 * MiniAppChannelAdapter
 * 微信小程序端 Channel Adapter 实现
 */
export class MiniAppChannelAdapter {
  private storage: MiniAppStorageAdapter
  private cloudClient: CloudSyncClient | null = null
  
  constructor(
    private serverUrl: string = 'http://localhost:8001'
  ) {
    this.storage = new MiniAppStorageAdapter()
  }

  /**
   * 初始化适配器
   */
  async initialize(): Promise<void> {
    console.log('[MiniAppAdapter] Initializing...')
    
    // 注册微信事件监听
    this.registerWeChatListeners()
    
    // 初始化云端同步客户端 (如果已登录)
    if (this.hasAuthToken()) {
      await this.initCloudSync()
    }
  }

  /**
   * 注册微信事件监听
   */
  private registerWeChatListeners(): void {
    // 监听小程序显示 (前台)
    wx.onAppShow((res) => {
      console.log('[MiniAppAdapter] App show:', res.path)
      // 触发同步
      this.cloudClient?.forceSync()
    })

    // 监听小程序隐藏 (后台)
    wx.onAppHide(() => {
      console.log('[MiniAppAdapter] App hide')
      // 断开 WebSocket 节省资源
      this.cloudClient?.disconnect()
    })
  }

  /**
   * 初始化云端同步
   */
  private async initCloudSync(): Promise<void> {
    try {
      this.cloudClient = new CloudSyncClient({
        serverUrl: this.serverUrl,
        clientType: 'miniapp',
        storage: this.storage,
        onSync: (changes) => this.handleRemoteChanges(changes),
        onConnect: () => console.log('[MiniAppAdapter] Cloud connected'),
        onDisconnect: () => console.log('[MiniAppAdapter] Cloud disconnected')
      })

      await this.cloudClient.connect()
    } catch (error) {
      console.error('[MiniAppAdapter] Cloud init failed:', error)
    }
  }

  /**
   * 处理云端推送的变更
   */
  private handleRemoteChanges(changes: ChangePayload[]): void {
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
  }

  private handleSubscriptionChange(change: ChangePayload): void {
    // 触发本地事件
    const eventBus = getMiniAppEventBus()
    eventBus.emit('subscription_updated', change.data)
    
    // 更新本地存储
    if (change.operation === 'create' || change.operation === 'update') {
      this.saveSubscription(change.entity_id, change.data)
    } else if (change.operation === 'delete') {
      this.removeSubscription(change.entity_id)
    }
  }

  private handleArticleChange(change: ChangePayload): void {
    const eventBus = getMiniAppEventBus()
    eventBus.emit('article_received', change.data)
  }

  private handleReadStatusChange(change: ChangePayload): void {
    // 更新文章阅读状态
    const articleId = change.entity_id
    const { is_read, is_bookmarked } = change.data as Record<string, boolean>
    
    if (is_read !== undefined) {
      this.updateArticleReadStatus(articleId, is_read)
    }
    if (is_bookmarked !== undefined) {
      this.updateArticleBookmarkStatus(articleId, is_bookmarked)
    }
  }

  // ============ Storage Operations ============

  private hasAuthToken(): boolean {
    try {
      return !!wx.getStorageSync('auth_token')
    } catch {
      return false
    }
  }

  private saveSubscription(id: string, data: Record<string, unknown>): void {
    try {
      const subscriptions = wx.getStorageSync('subscriptions') || {}
      subscriptions[id] = data
      wx.setStorageSync('subscriptions', subscriptions)
    } catch (e) {
      console.error('[MiniAppAdapter] saveSubscription error:', e)
    }
  }

  private removeSubscription(id: string): void {
    try {
      const subscriptions = wx.getStorageSync('subscriptions') || {}
      delete subscriptions[id]
      wx.setStorageSync('subscriptions', subscriptions)
    } catch (e) {
      console.error('[MiniAppAdapter] removeSubscription error:', e)
    }
  }

  private updateArticleReadStatus(articleId: string, isRead: boolean): void {
    try {
      const articles = wx.getStorageSync('articles') || {}
      if (articles[articleId]) {
        articles[articleId].is_read = isRead
        wx.setStorageSync('articles', articles)
      }
    } catch (e) {
      console.error('[MiniAppAdapter] updateArticleReadStatus error:', e)
    }
  }

  private updateArticleBookmarkStatus(articleId: string, isBookmarked: boolean): void {
    try {
      const articles = wx.getStorageSync('articles') || {}
      if (articles[articleId]) {
        articles[articleId].is_bookmarked = isBookmarked
        wx.setStorageSync('articles', articles)
      }
    } catch (e) {
      console.error('[MiniAppAdapter] updateArticleBookmarkStatus error:', e)
    }
  }

  // ============ Public API ============

  /**
   * 推送本地变更到云端
   */
  async pushChange(change: ChangePayload): Promise<void> {
    if (this.cloudClient) {
      await this.cloudClient.pushChanges([change])
    } else {
      // 离线: 存入本地队列
      this.queueOfflineChange(change)
    }
  }

  private queueOfflineChange(change: ChangePayload): void {
    try {
      const queue = wx.getStorageSync('offline_sync_queue') || []
      queue.push(change)
      wx.setStorageSync('offline_sync_queue', queue)
    } catch (e) {
      console.error('[MiniAppAdapter] queueOfflineChange error:', e)
    }
  }

  /**
   * 同步离线队列
   */
  async syncOfflineQueue(): Promise<void> {
    if (!this.cloudClient) return

    try {
      const queue = wx.getStorageSync('offline_sync_queue') || []
      if (queue.length > 0) {
        await this.cloudClient.pushChanges(queue as ChangePayload[])
        wx.setStorageSync('offline_sync_queue', [])
      }
    } catch (e) {
      console.error('[MiniAppAdapter] syncOfflineQueue error:', e)
    }
  }

  /**
   * 登录并连接云端
   */
  async loginAndConnect(token: string): Promise<void> {
    try {
      wx.setStorageSync('auth_token', token)
      await this.initCloudSync()
    } catch (e) {
      console.error('[MiniAppAdapter] loginAndConnect error:', e)
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.cloudClient?.disconnect()
    this.cloudClient = null
  }
}

// ============ MiniApp Event Bus (全局单例) ============

type EventBusListener = (...args: unknown[]) => void

class MiniAppEventBus extends EventEmitter {
  private static instance: MiniAppEventBus

  static getInstance(): MiniAppEventBus {
    if (!MiniAppEventBus.instance) {
      MiniAppEventBus.instance = new MiniAppEventBus()
    }
    return MiniAppEventBus.instance
  }

  // 兼容微信小程序的 emit 签名
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args)
  }

  on(event: string, listener: EventBusListener): this {
    return super.on(event, listener)
  }

  off(event: string, listener: EventBusListener): this {
    return super.off(event, listener)
  }
}

export function getMiniAppEventBus(): MiniAppEventBus {
  return MiniAppEventBus.getInstance()
}

// ============ Factory ============

let adapterInstance: MiniAppChannelAdapter | null = null

export function getMiniAppChannelAdapter(): MiniAppChannelAdapter {
  if (!adapterInstance) {
    adapterInstance = new MiniAppChannelAdapter()
  }
  return adapterInstance
}

export function initializeMiniAppAdapter(): Promise<void> {
  return getMiniAppChannelAdapter().initialize()
}

export default MiniAppChannelAdapter
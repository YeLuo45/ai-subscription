/**
 * Android Channel Adapter - React Native Android 端适配器
 * 
 * 基于 nanobot MessageBus + thunderbolt PowerSync 架构
 * Android 端使用 AsyncStorage 本地存储 + WebSocket 云端同步
 */

import { EventEmitter } from 'eventemitter3'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CloudSyncClient, type ChangePayload, type StorageAdapter } from '../../cloud-sync/client'

// ============ Storage Adapter (React Native AsyncStorage) ============

export class AndroidStorageAdapter implements StorageAdapter {
  private prefix: string

  constructor(prefix: string = 'ai_sync_') {
    this.prefix = prefix
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(this.prefix + key)
      return value
    } catch (e) {
      console.error('[AndroidStorage] getItem error:', e)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.prefix + key, value)
    } catch (e) {
      console.error('[AndroidStorage] setItem error:', e)
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.prefix + key)
    } catch (e) {
      console.error('[AndroidStorage] removeItem error:', e)
    }
  }
}

// ============ Android Channel Adapter ============

export class AndroidChannelAdapter {
  private storage: AndroidStorageAdapter
  private cloudClient: CloudSyncClient | null = null
  private eventBus: EventEmitter
  private serverUrl: string

  constructor(serverUrl: string = 'http://localhost:8001') {
    this.serverUrl = serverUrl
    this.storage = new AndroidStorageAdapter()
    this.eventBus = new EventEmitter()
  }

  /**
   * 初始化适配器
   */
  async initialize(): Promise<void> {
    console.log('[AndroidAdapter] Initializing...')

    // 初始化云端同步客户端
    await this.initCloudSync()

    // 注册 App 生命周期监听
    this.registerLifecycleListeners()

    console.log('[AndroidAdapter] Initialized')
  }

  /**
   * 初始化云端同步
   */
  private async initCloudSync(): Promise<void> {
    try {
      // 创建同步存储适配器 (Promise-based → 同步接口适配)
      const syncStorage = this.createSyncStorageAdapter()

      this.cloudClient = new CloudSyncClient({
        serverUrl: this.serverUrl,
        clientType: 'android',
        storage: syncStorage,
        onSync: (changes) => this.handleRemoteChanges(changes),
        onConnect: () => {
          console.log('[AndroidAdapter] Cloud connected')
          this.eventBus.emit('connect')
        },
        onDisconnect: () => {
          console.log('[AndroidAdapter] Cloud disconnected')
          this.eventBus.emit('disconnect')
        }
      } as Parameters<typeof CloudSyncClient>[0])

      await this.cloudClient.connect()
    } catch (error) {
      console.error('[AndroidAdapter] Cloud init failed:', error)
    }
  }

  /**
   * 将 Promise-based 存储适配器转换为同步接口
   */
  private createSyncStorageAdapter(): StorageAdapter {
    const self = this
    return {
      getItem(key: string): string | null {
        let result: string | null = null
        self.storage.getItem(key).then(val => { result = val })
        return result
      },
      setItem(key: string, value: string): void {
        self.storage.setItem(key, value)
      },
      removeItem(key: string): void {
        self.storage.removeItem(key)
      }
    }
  }

  /**
   * 注册 App 生命周期监听
   */
  private registerLifecycleListeners(): void {
    // 这些是 React Native AppState 事件
    // 在实际使用时通过 AppState.addEventListener 注册
  }

  /**
   * 处理云端变更
   */
  private handleRemoteChanges(changes: ChangePayload[]): void {
    console.log('[AndroidAdapter] Remote changes:', changes.length)

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

    // 触发本地事件
    this.eventBus.emit('sync', changes)
  }

  private handleSubscriptionChange(change: ChangePayload): void {
    if (change.operation === 'create' || change.operation === 'update') {
      this.saveSubscription(change.entity_id, change.data)
    } else if (change.operation === 'delete') {
      this.removeSubscription(change.entity_id)
    }

    this.eventBus.emit('subscription_updated', change.data)
  }

  private handleArticleChange(change: ChangePayload): void {
    this.eventBus.emit('article_received', change.data)
  }

  private handleReadStatusChange(change: ChangePayload): void {
    const { is_read, is_bookmarked } = change.data as Record<string, boolean>

    if (is_read !== undefined) {
      this.updateArticleReadStatus(change.entity_id, is_read)
    }
    if (is_bookmarked !== undefined) {
      this.updateArticleBookmarkStatus(change.entity_id, is_bookmarked)
    }

    this.eventBus.emit('read_status_changed', change.data)
  }

  // ============ Storage Operations ============

  private async saveSubscription(id: string, data: Record<string, unknown>): Promise<void> {
    try {
      const key = `subscription:${id}`
      await this.storage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error('[AndroidAdapter] saveSubscription error:', e)
    }
  }

  private async removeSubscription(id: string): Promise<void> {
    try {
      const key = `subscription:${id}`
      await this.storage.removeItem(key)
    } catch (e) {
      console.error('[AndroidAdapter] removeSubscription error:', e)
    }
  }

  private async updateArticleReadStatus(articleId: string, isRead: boolean): Promise<void> {
    try {
      const key = `article:${articleId}`
      const existing = await this.storage.getItem(key)
      if (existing) {
        const data = JSON.parse(existing)
        data.is_read = isRead
        await this.storage.setItem(key, JSON.stringify(data))
      }
    } catch (e) {
      console.error('[AndroidAdapter] updateArticleReadStatus error:', e)
    }
  }

  private async updateArticleBookmarkStatus(articleId: string, isBookmarked: boolean): Promise<void> {
    try {
      const key = `article:${articleId}`
      const existing = await this.storage.getItem(key)
      if (existing) {
        const data = JSON.parse(existing)
        data.is_bookmarked = isBookmarked
        await this.storage.setItem(key, JSON.stringify(data))
      }
    } catch (e) {
      console.error('[AndroidAdapter] updateArticleBookmarkStatus error:', e)
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
    const ws = (this.cloudClient as unknown as { ws?: { readyState: number } })
    return {
      clientId: this.cloudClient?.getClientId() || '',
      isConnected: ws?.ws?.readyState === 1
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.cloudClient?.disconnect()
    this.cloudClient = null
  }

  /**
   * 事件订阅
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.eventBus.on(event, listener)
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.eventBus.off(event, listener)
  }

  /**
   * 销毁适配器
   */
  destroy(): void {
    this.disconnect()
    this.eventBus.removeAllListeners()
  }
}

// ============ Factory ============

let adapterInstance: AndroidChannelAdapter | null = null

export function getAndroidChannelAdapter(serverUrl?: string): AndroidChannelAdapter {
  if (!adapterInstance && serverUrl) {
    adapterInstance = new AndroidChannelAdapter(serverUrl)
  }
  return adapterInstance!
}

export async function initializeAndroidAdapter(serverUrl?: string): Promise<void> {
  const adapter = getAndroidChannelAdapter(serverUrl)
  await adapter.initialize()
}

export default AndroidChannelAdapter
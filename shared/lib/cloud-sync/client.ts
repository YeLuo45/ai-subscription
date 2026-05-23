/**
 * CloudSyncClient - 客户端同步适配器
 * 基于 thunderbolt PowerSync 架构的增量同步客户端
 * 
 * 使用方式:
 *   import { CloudSyncClient } from './cloud-sync-client'
 *   
 *   const client = new CloudSyncClient({
 *     serverUrl: 'http://localhost:8001',
 *     clientType: 'web',
 *     onSync: (changes) => { ... },
 *     onConflict: (conflict) => { ... }
 *   })
 *   
 *   await client.connect()
 *   await client.pushChanges(localChanges)
 */

import { EventEmitter } from 'eventemitter3'

// ============ Types ============

export type EntityType = 'subscription' | 'article' | 'read_status'
export type Operation = 'create' | 'update' | 'delete'

export interface ChangePayload {
  entity_type: EntityType
  entity_id: string
  operation: Operation
  data: Record<string, unknown>
  timestamp: number
}

export interface SyncServerResponse {
  changes: ChangePayload[]
  server_timestamp: number
  has_more: boolean
}

export interface CloudSyncConfig {
  serverUrl: string
  clientType: 'web' | 'miniapp' | 'pc' | 'android'
  clientId?: string
  storage?: StorageAdapter
  onSync?: (changes: ChangePayload[]) => void
  onConflict?: (conflict: ConflictInfo) => ConflictResolution
  onConnect?: () => void
  onDisconnect?: () => void
}

export interface ConflictInfo {
  local: ChangePayload
  remote: ChangePayload
}

export type ConflictResolution = 'local' | 'remote' | 'merge'

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// ============ Default Storage (localStorage / sessionStorage) ============

class DefaultStorage implements StorageAdapter {
  constructor(private storage: Storage) {}

  getItem(key: string): string | null {
    return this.storage.getItem(key)
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value)
  }

  removeItem(key: string): void {
    this.storage.removeItem(key)
  }
}

// ============ MessageBus Integration ============

/**
 * CloudSyncMessageBus - MessageBus 云端同步通道
 * 
 * 将 CloudSyncClient 桥接到已建立的 MessageBus 架构:
 * - 接收本地事件 → 推送到云端
 * - 接收云端事件 → 分发到 MessageBus
 */
export class CloudSyncMessageBus {
  constructor(
    private messageBus: MessageBus,
    private cloudClient: CloudSyncClient
  ) {
    this.setupSubscriptions()
  }

  private setupSubscriptions() {
    const localEvents = ['article_read', 'article_bookmarked', 'subscription_updated']
    
    localEvents.forEach(event => {
      this.messageBus.subscribe(event, async (data: unknown) => {
        await this.cloudClient.pushChanges([this.eventToChange(event, data)])
      })
    })
  }

  private eventToChange(event: string, data: unknown): ChangePayload {
    const now = Date.now()
    const entityMap: Record<string, EntityType> = {
      'article_read': 'read_status',
      'article_bookmarked': 'read_status',
      'subscription_updated': 'subscription'
    }

    return {
      entity_type: entityMap[event] || 'article',
      entity_id: (data as Record<string, string>)?.id || '',
      operation: 'update',
      data: data as Record<string, unknown>,
      timestamp: now
    }
  }

  async pushRemoteChanges(changes: ChangePayload[]) {
    for (const change of changes) {
      const eventMap: Record<string, string> = {
        'subscription': 'subscription_updated',
        'article': 'article_received',
        'read_status': 'article_read'
      }
      
      const event = eventMap[change.entity_type]
      if (event) {
        this.messageBus.publish(event, change.data)
      }
    }
  }
}

// ============ CloudSyncClient ============

export class CloudSyncClient extends EventEmitter {
  private ws: WebSocket | null = null
  private clientId: string
  private lastSyncTimestamp: number = 0
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000
  private pendingChanges: ChangePayload[] = []
  private storage: StorageAdapter

  constructor(private config: CloudSyncConfig) {
    super()
    
    this.clientId = config.clientId || this.loadClientId()
    this.storage = config.storage || new DefaultStorage(localStorage)
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[CloudSync] Already connected')
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.serverUrl.replace('http', 'ws')}/ws/sync/${this.clientId}`
        console.log('[CloudSync] Connecting to', wsUrl)
        
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('[CloudSync] Connected')
          this.reconnectAttempts = 0
          this.config.onConnect?.()
          this.emit('connect')
          this.performSync().then(resolve)
        }

        this.ws.onmessage = async (event) => {
          const message = JSON.parse(event.data)
          await this.handleMessage(message)
        }

        this.ws.onclose = () => {
          console.log('[CloudSync] Disconnected')
          this.config.onDisconnect?.()
          this.emit('disconnect')
          this.scheduleReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('[CloudSync] Error', error)
          this.emit('error', error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts
    this.ws?.close()
    this.ws = null
  }

  async pushChanges(changes: ChangePayload[]): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[CloudSync] Offline, queuing changes:', changes.length)
      this.pendingChanges.push(...changes)
      this.savePendingChanges()
      return false
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'push',
        payload: { changes }
      }))
      return true
    } catch (error) {
      console.error('[CloudSync] Push failed', error)
      this.pendingChanges.push(...changes)
      this.savePendingChanges()
      return false
    }
  }

  async forceSync(): Promise<SyncServerResponse | null> {
    return this.performSync()
  }

  getClientId(): string {
    return this.clientId
  }

  private async handleMessage(message: Record<string, unknown>): Promise<void> {
    const { type, payload } = message

    switch (type) {
      case 'connected':
        console.log('[CloudSync] Server confirmed connection')
        break

      case 'pong':
        break

      case 'sync':
        await this.handleRemoteChanges(payload.changes as ChangePayload[])
        break

      case 'ack':
        console.log('[CloudSync] Changes acknowledged:', payload.accepted)
        this.clearPendingChanges()
        break

      case 'conflict':
        await this.handleConflict(payload as ConflictInfo)
        break

      default:
        console.log('[CloudSync] Unknown message type:', type)
    }
  }

  private async handleRemoteChanges(changes: ChangePayload[]): Promise<void> {
    console.log('[CloudSync] Received remote changes:', changes.length)
    
    const maxTimestamp = Math.max(...changes.map(c => c.timestamp))
    if (maxTimestamp > this.lastSyncTimestamp) {
      this.lastSyncTimestamp = maxTimestamp
      this.saveLastSyncTimestamp()
    }

    this.config.onSync?.(changes)
    this.emit('sync', changes)
  }

  private async handleConflict(conflict: ConflictInfo): Promise<void> {
    console.log('[CloudSync] Conflict detected:', conflict)
    
    const resolution = this.config.onConflict?.(conflict) || 'local'
    
    if (resolution === 'merge') {
      const mergedChange = this.mergeChanges(conflict.local, conflict.remote)
      await this.pushChanges([mergedChange])
    } else if (resolution === 'local') {
      await this.pushChanges([conflict.local])
    }
    
    this.emit('conflict', conflict, resolution)
  }

  private mergeChanges(local: ChangePayload, remote: ChangePayload): ChangePayload {
    return local.timestamp > remote.timestamp ? local : remote
  }

  private async performSync(): Promise<SyncServerResponse | null> {
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/sync/${this.clientId}?since=${this.lastSyncTimestamp}`
      )
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`)
      }

      const data: SyncServerResponse = await response.json()
      
      if (data.changes.length > 0) {
        await this.handleRemoteChanges(data.changes)
      }

      if (this.pendingChanges.length > 0) {
        await this.pushChanges(this.pendingChanges)
      }

      return data
    } catch (error) {
      console.error('[CloudSync] Sync error:', error)
      this.emit('sync_error', error)
      return null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[CloudSync] Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`[CloudSync] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private loadClientId(): string {
    let id = this.storage.getItem('ai_sync_client_id')
    if (!id) {
      id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.storage.setItem('ai_sync_client_id', id)
    }
    return id
  }

  private saveLastSyncTimestamp(): void {
    this.storage.setItem('ai_sync_last_timestamp', String(this.lastSyncTimestamp))
  }

  private savePendingChanges(): void {
    this.storage.setItem('ai_sync_pending', JSON.stringify(this.pendingChanges))
  }

  private clearPendingChanges(): void {
    this.pendingChanges = []
    this.storage.removeItem('ai_sync_pending')
  }

  static createMessageBusBridge(messageBus: MessageBus, config: CloudSyncConfig): CloudSyncMessageBus {
    const client = new CloudSyncClient(config)
    return new CloudSyncMessageBus(messageBus, client)
  }
}

export default CloudSyncClient
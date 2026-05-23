/**
 * MessageBus - Singleton event bus with EventEmitter pattern
 * Coordinates publish/subscribe between local handlers and ChannelAdapter
 */

import type { 
  BusEvent, 
  ChannelAdapter, 
  MessageBusConfig, 
  SubscriptionCallback,
  SourcePlatform 
} from './types';

type EventHandler = {
  callback: SubscriptionCallback;
  eventType?: string;
};

const DB_NAME = 'ai_subscription_message_bus';
const DB_VERSION = 1;
const FAILED_EVENTS_STORE = 'failed_events';

export class MessageBus {
  private static instance: MessageBus | null = null;
  
  private handlers: Map<string, EventHandler[]> = new Map();
  private adapter: ChannelAdapter | null = null;
  private deviceId: string;
  private source: SourcePlatform;
  private unsubscribeRemote: (() => void) | null = null;
  private isOnline: boolean = navigator.onLine;

  private constructor(config: MessageBusConfig) {
    this.deviceId = config.deviceId;
    this.source = config.source || 'web';
    
    if (config.persistenceAdapter) {
      this.setAdapter(config.persistenceAdapter);
    }

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushFailedEvents();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  static getInstance(config?: MessageBusConfig): MessageBus {
    if (!MessageBus.instance) {
      if (!config) {
        throw new Error('MessageBus must be initialized with config on first access');
      }
      MessageBus.instance = new MessageBus(config);
    }
    return MessageBus.instance;
  }

  static resetInstance(): void {
    if (MessageBus.instance) {
      MessageBus.instance.destroy();
      MessageBus.instance = null;
    }
  }

  registerAdapter(platform: SourcePlatform, adapter: ChannelAdapter): void {
    if (adapter.platform !== platform) {
      console.warn(`[MessageBus] Adapter platform mismatch: expected ${platform}, got ${adapter.platform}`);
    }
    this.setAdapter(adapter);
  }

  setAdapter(adapter: ChannelAdapter): void {
    this.adapter = adapter;
    
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
    }
    
    this.unsubscribeRemote = this.adapter.onRemoteEvent((event: BusEvent) => {
      this.notifyHandlers(event);
    });
  }

  async publish(event: BusEvent): Promise<void> {
    const enrichedEvent: BusEvent = {
      ...event,
      id: event.id || this.generateEventId(),
      timestamp: event.timestamp || Date.now(),
      source: event.source || this.source,
    };

    this.notifyHandlers(enrichedEvent);

    if (this.adapter) {
      try {
        await this.adapter.publish(enrichedEvent);
      } catch (error) {
        console.error('[MessageBus] Failed to publish to adapter:', error);
        await this.persistFailedEvent(enrichedEvent);
      }
    }
  }

  subscribe(eventType: string, callback: SubscriptionCallback): () => void {
    return this.addHandler(eventType, callback);
  }

  private addHandler(eventType: string, callback: SubscriptionCallback): () => void {
    const handler: EventHandler = { callback, eventType };
    
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  private notifyHandlers(event: BusEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler.callback(event);
        } catch (error) {
          console.error('[MessageBus] Handler error:', error);
        }
      });
    }

    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler.callback(event);
        } catch (error) {
          console.error('[MessageBus] Wildcard handler error:', error);
        }
      });
    }
  }

  private generateEventId(): string {
    return `${this.deviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistFailedEvent(event: BusEvent): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(FAILED_EVENTS_STORE, 'readwrite');
      const store = tx.objectStore(FAILED_EVENTS_STORE);
      await store.put(event);
    } catch (error) {
      console.error('[MessageBus] Failed to persist failed event:', error);
    }
  }

  private async flushFailedEvents(): Promise<void> {
    if (!this.adapter || !this.isOnline) return;

    try {
      const db = await this.openDB();
      const tx = db.transaction(FAILED_EVENTS_STORE, 'readonly');
      const store = tx.objectStore(FAILED_EVENTS_STORE);
      const allEvents = await this.getAllFromStore(store);

      for (const event of allEvents) {
        try {
          await this.adapter.publish(event);
          const deleteTx = db.transaction(FAILED_EVENTS_STORE, 'readwrite');
          await deleteTx.objectStore(FAILED_EVENTS_STORE).delete(event.id);
        } catch {
          // Keep in queue for next attempt
        }
      }
    } catch (error) {
      console.error('[MessageBus] Failed to flush failed events:', error);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(FAILED_EVENTS_STORE)) {
          db.createObjectStore(FAILED_EVENTS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  private getAllFromStore(store: IDBObjectStore): Promise<BusEvent[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getState(): Promise<Record<string, unknown>> {
    if (this.adapter) {
      return this.adapter.getState();
    }
    return {};
  }

  destroy(): void {
    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }
    this.handlers.clear();
  }
}

export function createMessageBus(config: MessageBusConfig): MessageBus {
  return MessageBus.getInstance(config);
}

export function getMessageBus(): MessageBus | null {
  return (MessageBus as unknown as { instance: MessageBus | null }).instance;
}

export function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
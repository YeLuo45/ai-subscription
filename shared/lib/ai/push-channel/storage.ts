/**
 * Push Channel Storage
 * IndexedDB implementation for storing channels and send history
 */

import type { PushChannel, SendHistory, ChannelType, TelegramConfig, EmailConfig, WebPushConfig, PushTemplate } from './types';

const DB_NAME = 'PushChannelDB';
const DB_VERSION = 1;
const CHANNELS_STORE = 'channels';
const HISTORY_STORE = 'sendHistory';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { dbInstance = request.result; resolve(request.result); };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHANNELS_STORE)) {
        const store = db.createObjectStore(CHANNELS_STORE, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('enabled', 'enabled', { unique: false });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        historyStore.createIndex('channelId', 'channelId', { unique: false });
        historyStore.createIndex('sentAt', 'sentAt', { unique: false });
      }
    };
  });
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function generateId(): string {
  return `channel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateHistoryId(): string {
  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Channel operations
export async function saveChannel(channel: Partial<PushChannel> & { type: ChannelType; name: string; config: TelegramConfig | EmailConfig | WebPushConfig; template: PushTemplate }): Promise<PushChannel> {
  const now = Date.now();
  const full: PushChannel = {
    ...channel,
    id: channel.id || generateId(),
    createdAt: channel.id ? (channel as PushChannel).createdAt : now,
    updatedAt: now,
  } as PushChannel;
  const store = await getStore(CHANNELS_STORE, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function getChannel(id: string): Promise<PushChannel | undefined> {
  const store = await getStore(CHANNELS_STORE);
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllChannels(): Promise<PushChannel[]> {
  const store = await getStore(CHANNELS_STORE);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getChannelsByType(type: ChannelType): Promise<PushChannel[]> {
  const store = await getStore(CHANNELS_STORE);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []).filter((c: PushChannel) => c.type === type));
    req.onerror = () => reject(req.error);
  });
}

export async function getEnabledChannels(): Promise<PushChannel[]> {
  const store = await getStore(CHANNELS_STORE);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []).filter((c: PushChannel) => c.enabled));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteChannel(id: string): Promise<void> {
  const store = await getStore(CHANNELS_STORE, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Send history operations
export async function saveSendHistory(history: Omit<SendHistory, 'id'> & { id?: string }): Promise<SendHistory> {
  const full: SendHistory = {
    ...history,
    id: history.id || generateHistoryId(),
  };
  const store = await getStore(HISTORY_STORE, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function getSendHistory(channelId?: string, limit: number = 50): Promise<SendHistory[]> {
  const store = await getStore(HISTORY_STORE);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      let results = req.result || [];
      if (channelId) {
        results = results.filter((h: SendHistory) => h.channelId === channelId);
      }
      results.sort((a: SendHistory, b: SendHistory) => b.sentAt - a.sentAt);
      resolve(results.slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearSendHistory(channelId?: string): Promise<void> {
  const store = await getStore(HISTORY_STORE, 'readwrite');
  return new Promise((resolve, reject) => {
    if (channelId) {
      const req = store.index('channelId').openCursor(IDBKeyRange.only(channelId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    } else {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }
  });
}

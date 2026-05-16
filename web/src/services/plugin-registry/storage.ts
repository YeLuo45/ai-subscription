// IndexedDB storage for plugin registry persistence
import type { PluginDefinition, RegistryState } from './types';

const DB_NAME = 'AISubscriptionDB';
const DB_VERSION = 3;  // Incremented for plugins store
const STORE_NAME = 'plugins';
const STATE_KEY = 'plugin_registry_state';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { dbInstance = request.result; resolve(request.result); };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'manifest.id' });
      }
    };
  });
}

async function getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
}

export async function loadRegistryState(): Promise<RegistryState> {
  try {
    const store = await getStore();
    return new Promise((resolve, reject) => {
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result || { plugins: [], lastSyncAt: '' });
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { plugins: [], lastSyncAt: '' };
  }
}

export async function saveRegistryState(state: RegistryState): Promise<void> {
  const store = await getStore('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put({ id: STATE_KEY, ...state });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPlugins(): Promise<PluginDefinition[]> {
  const state = await loadRegistryState();
  return state.plugins;
}

export async function savePlugin(plugin: PluginDefinition): Promise<void> {
  const state = await loadRegistryState();
  const existingIndex = state.plugins.findIndex(p => p.manifest.id === plugin.manifest.id);
  if (existingIndex >= 0) {
    state.plugins[existingIndex] = plugin;
  } else {
    state.plugins.push(plugin);
  }
  state.lastSyncAt = new Date().toISOString();
  await saveRegistryState(state);
}

export async function deletePlugin(pluginId: string): Promise<void> {
  const state = await loadRegistryState();
  state.plugins = state.plugins.filter(p => p.manifest.id !== pluginId);
  state.lastSyncAt = new Date().toISOString();
  await saveRegistryState(state);
}

export async function clearAllPlugins(): Promise<void> {
  const state: RegistryState = { plugins: [], lastSyncAt: new Date().toISOString() };
  await saveRegistryState(state);
}

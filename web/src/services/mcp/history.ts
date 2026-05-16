/**
 * MCP Tool Call History
 * IndexedDB-based storage for MCP tool invocation history
 */

import type { MCPToolCallResult } from './types';

export interface MCPToolCallRecord {
  id: string;
  serverId: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: MCPToolCallResult;
  timestamp: number;
  duration?: number; // ms
}

export interface MCPHistoryFilter {
  serverId?: string;
  toolName?: string;
  limit?: number;
  offset?: number;
}

// IndexedDB configuration
const DB_NAME = 'mcp-history-db';
const DB_VERSION = 1;
const STORE_NAME = 'tool-calls';

/**
 * Open IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('serverId', 'serverId', { unique: false });
        store.createIndex('toolName', 'toolName', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Add a tool call record to history
 */
export async function addToolCallRecord(record: Omit<MCPToolCallRecord, 'id'>): Promise<MCPToolCallRecord> {
  const db = await openDatabase();
  const id = `mcp-call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const fullRecord: MCPToolCallRecord = {
    ...record,
    id,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(fullRecord);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(fullRecord);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Get tool call records with optional filtering
 */
export async function getToolCallRecords(filter: MCPHistoryFilter = {}): Promise<MCPToolCallRecord[]> {
  const db = await openDatabase();
  const { serverId, toolName, limit = 50, offset = 0 } = filter;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    let records: MCPToolCallRecord[] = [];

    if (serverId) {
      const index = store.index('serverId');
      const request = index.getAll(serverId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        records = request.result;
        finish();
      };
    } else if (toolName) {
      const index = store.index('toolName');
      const request = index.getAll(toolName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        records = request.result;
        finish();
      };
    } else {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        records = request.result;
        finish();
      };
    }

    function finish() {
      // Sort by timestamp descending (newest first)
      records.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const paginated = records.slice(offset, offset + limit);
      resolve(paginated);
      tx.oncomplete = () => db.close();
    }
  });
}

/**
 * Get tool call records by server
 */
export async function getRecordsByServer(serverId: string, limit = 50): Promise<MCPToolCallRecord[]> {
  return getToolCallRecords({ serverId, limit });
}

/**
 * Clear all history records
 */
export async function clearHistory(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear history records older than a timestamp
 */
export async function clearHistoryBefore(timestamp: number): Promise<void> {
  const records = await getToolCallRecords({ limit: 10000 });
  const db = await openDatabase();

  const toDelete = records.filter(r => r.timestamp < timestamp);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    let completed = 0;
    if (toDelete.length === 0) {
      resolve();
      tx.oncomplete = () => db.close();
      return;
    }

    for (const record of toDelete) {
      const request = store.delete(record.id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        completed++;
        if (completed === toDelete.length) {
          resolve();
        }
      };
    }

    tx.oncomplete = () => db.close();
  });
}

/**
 * Get history statistics
 */
export async function getHistoryStats(): Promise<{
  totalCalls: number;
  uniqueServers: number;
  uniqueTools: number;
  lastCall?: MCPToolCallRecord;
}> {
  const records = await getToolCallRecords({ limit: 10000 });

  const uniqueServers = new Set(records.map(r => r.serverId)).size;
  const uniqueTools = new Set(records.map(r => `${r.serverId}:${r.toolName}`)).size;

  return {
    totalCalls: records.length,
    uniqueServers,
    uniqueTools,
    lastCall: records[0],
  };
}
/**
 * Multi-Tenant Audit Logging
 * IndexedDB-based audit logging for strategy actions
 */

import type { StrategyAuditLog } from './types';

const DB_NAME = 'ai-subscription-audit';
const STORE_NAME = 'strategy-audit-logs';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the audit database
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('tenantId', 'tenantId', { unique: false });
        store.createIndex('strategyId', 'strategyId', { unique: false });
        store.createIndex('action', 'action', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('performedBy', 'performedBy', { unique: false });
      }
    };
  });
}

/**
 * Get database instance
 */
async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) await initDB();
  return dbInstance!;
}

/**
 * Generate a unique ID for a new audit log entry
 */
function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Log a strategy action to the audit trail
 * @param log - The audit log entry to save
 */
export async function logStrategyAction(log: StrategyAuditLog): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(log);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Create and log a new strategy action
 */
export async function createAuditLog(
  strategyId: string,
  tenantId: string,
  action: StrategyAuditLog['action'],
  performedBy: string,
  details: Record<string, unknown> = {}
): Promise<StrategyAuditLog> {
  const log: StrategyAuditLog = {
    id: generateId(),
    strategyId,
    tenantId,
    action,
    performedBy,
    timestamp: Date.now(),
    details,
  };

  await logStrategyAction(log);
  return log;
}

/**
 * Get audit logs for a specific tenant
 * @param tenantId - The tenant ID to get logs for
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of audit log entries, sorted by timestamp descending
 */
export async function getAuditLogs(tenantId: string, limit: number = 100): Promise<StrategyAuditLog[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('tenantId');
    const request = index.getAll(tenantId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const logs = request.result || [];
      // Sort by timestamp descending and limit
      const sorted = logs
        .sort((a: StrategyAuditLog, b: StrategyAuditLog) => b.timestamp - a.timestamp)
        .slice(0, limit);
      resolve(sorted);
    };
  });
}

/**
 * Get audit logs for a specific strategy
 * @param strategyId - The strategy ID to get logs for
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of audit log entries
 */
export async function getStrategyAuditLogs(strategyId: string, limit: number = 50): Promise<StrategyAuditLog[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('strategyId');
    const request = index.getAll(strategyId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const logs = request.result || [];
      const sorted = logs
        .sort((a: StrategyAuditLog, b: StrategyAuditLog) => b.timestamp - a.timestamp)
        .slice(0, limit);
      resolve(sorted);
    };
  });
}

/**
 * Clear old audit logs (retention policy)
 * @param olderThan - Delete logs older than this timestamp
 * @returns Number of deleted logs
 */
export async function clearOldAuditLogs(olderThan: number): Promise<number> {
  const db = await getDB();
  const allLogs = await getAllAuditLogs();
  const toDelete = allLogs.filter((log: StrategyAuditLog) => log.timestamp < olderThan);

  let deletedCount = 0;
  for (const log of toDelete) {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(log.id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        deletedCount++;
        resolve();
      };
    });
  }

  return deletedCount;
}

/**
 * Get all audit logs (internal use)
 */
async function getAllAuditLogs(): Promise<StrategyAuditLog[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

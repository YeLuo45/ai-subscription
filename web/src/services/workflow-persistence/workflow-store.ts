/**
 * Workflow Persistence Store
 * CRUD operations for workflow metadata using IndexedDB
 */

import type { WorkflowPersistenceMeta, WorkflowSnapshot } from './types';

const DB_NAME = 'ai-workflow-persistence';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Workflow metadata store
      if (!db.objectStoreNames.contains('workflow_meta')) {
        const metaStore = db.createObjectStore('workflow_meta', { keyPath: 'id' });
        metaStore.createIndex('name', 'name', { unique: false });
        metaStore.createIndex('created_at', 'created_at', { unique: false });
        metaStore.createIndex('updated_at', 'updated_at', { unique: false });
        metaStore.createIndex('is_deleted', 'is_deleted', { unique: false });
      }

      // Workflow versions store
      if (!db.objectStoreNames.contains('workflow_versions')) {
        const versionsStore = db.createObjectStore('workflow_versions', { keyPath: 'id' });
        versionsStore.createIndex('workflow_id', 'workflow_id', { unique: false });
        versionsStore.createIndex('version_number', 'version_number', { unique: false });
        versionsStore.createIndex('created_at', 'created_at', { unique: false });
      }
    };
  });
}

function tx(storeName: string, mode: IDBTransactionMode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================
// Workflow Metadata CRUD
// ============================================================

export async function saveWorkflowMeta(
  workflow: Omit<WorkflowPersistenceMeta, 'id' | 'created_at' | 'updated_at' | 'version_count'>
): Promise<WorkflowPersistenceMeta> {
  const { store } = await tx('workflow_meta', 'readwrite');
  const now = Date.now();
  const full: WorkflowPersistenceMeta = {
    ...workflow,
    id: generateId('wfm'),
    created_at: now,
    updated_at: now,
    version_count: 0,
  };
  await promisifyRequest(store.put(full));
  return full;
}

export async function loadById(id: string): Promise<WorkflowPersistenceMeta | undefined> {
  const { store } = await tx('workflow_meta');
  return promisifyRequest<WorkflowPersistenceMeta | undefined>(store.get(id));
}

export async function listWorkflows(includeDeleted = false): Promise<WorkflowPersistenceMeta[]> {
  const { store } = await tx('workflow_meta');
  const all = await promisifyRequest<WorkflowPersistenceMeta[]>(store.getAll());
  if (includeDeleted) {
    return all.sort((a, b) => b.updated_at - a.updated_at);
  }
  return all
    .filter(w => !w.is_deleted)
    .sort((a, b) => b.updated_at - a.updated_at);
}

export async function updateWorkflowMeta(
  id: string,
  updates: Partial<Omit<WorkflowPersistenceMeta, 'id' | 'created_at'>>
): Promise<WorkflowPersistenceMeta | undefined> {
  const existing = await loadById(id);
  if (!existing) return undefined;

  const updated: WorkflowPersistenceMeta = {
    ...existing,
    ...updates,
    updated_at: Date.now(),
  };
  const { store } = await tx('workflow_meta', 'readwrite');
  await promisifyRequest(store.put(updated));
  return updated;
}

export async function softDelete(id: string): Promise<void> {
  await updateWorkflowMeta(id, { is_deleted: true });
}

export async function hardDelete(id: string): Promise<void> {
  const { store } = await tx('workflow_meta', 'readwrite');
  await promisifyRequest(store.delete(id));

  // Also delete associated versions
  const { store: versionsStore } = await tx('workflow_versions', 'readwrite');
  const index = versionsStore.index('workflow_id');
  const keys = await promisifyRequest<IDBValidKey[]>(index.getAllKeys(id));
  for (const key of keys) {
    await promisifyRequest(versionsStore.delete(key));
  }
}

export async function incrementVersionCount(id: string): Promise<void> {
  const meta = await loadById(id);
  if (meta) {
    await updateWorkflowMeta(id, { version_count: meta.version_count + 1 });
  }
}

export async function updateLastRunAt(id: string): Promise<void> {
  await updateWorkflowMeta(id, { last_run_at: Date.now() });
}

// ============================================================
// Version Storage
// ============================================================

export async function saveVersion(
  version: Omit<WorkflowSnapshot, 'id'>
): Promise<WorkflowSnapshot> {
  const { store } = await tx('workflow_versions', 'readwrite');
  const full: WorkflowSnapshot = {
    ...version,
    id: generateId('wfv'),
  };
  await promisifyRequest(store.put(full));
  return full;
}

export async function getVersionsByWorkflowId(workflowId: string): Promise<WorkflowSnapshot[]> {
  const { store } = await tx('workflow_versions');
  const index = store.index('workflow_id');
  const versions = await promisifyRequest<WorkflowSnapshot[]>(index.getAll(workflowId));
  return versions.sort((a, b) => b.version_number - a.version_number);
}

export async function getVersionById(id: string): Promise<WorkflowSnapshot | undefined> {
  const { store } = await tx('workflow_versions');
  return promisifyRequest<WorkflowSnapshot | undefined>(store.get(id));
}

export async function getLatestVersion(workflowId: string): Promise<WorkflowSnapshot | undefined> {
  const versions = await getVersionsByWorkflowId(workflowId);
  return versions[0];
}

export async function deleteVersionsByWorkflowId(workflowId: string): Promise<void> {
  const { store } = await tx('workflow_versions', 'readwrite');
  const index = store.index('workflow_id');
  const keys = await promisifyRequest<IDBValidKey[]>(index.getAllKeys(workflowId));
  for (const key of keys) {
    await promisifyRequest(store.delete(key));
  }
}

export async function pruneOldVersions(workflowId: string, maxVersions: number): Promise<void> {
  const versions = await getVersionsByWorkflowId(workflowId);
  if (versions.length > maxVersions) {
    const toDelete = versions.slice(maxVersions);
    const { store } = await tx('workflow_versions', 'readwrite');
    for (const version of toDelete) {
      await promisifyRequest(store.delete(version.id));
    }
  }
}

export async function getVersionCount(workflowId: string): Promise<number> {
  const versions = await getVersionsByWorkflowId(workflowId);
  return versions.length;
}

// ============================================================
// Utility
// ============================================================

export async function clearAllData(): Promise<void> {
  const { store: metaStore } = await tx('workflow_meta', 'readwrite');
  const { store: versionsStore } = await tx('workflow_versions', 'readwrite');
  await promisifyRequest(metaStore.clear());
  await promisifyRequest(versionsStore.clear());
}
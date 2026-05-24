/**
 * Version History for Workflow Canvas
 * Auto-snapshot version management with max 20 versions per workflow
 */

import type { SVGNode } from './types';
import { loadWorkflow } from './workflow-storage';

export interface Version {
  id: string;
  workflowId: string;
  version: number;
  definition: SVGNode[];
  createdAt: string;
}

const DB_NAME = 'workflow-canvas-db';
const DB_VERSION = 1;
const VERSION_STORE_NAME = 'workflow_versions';
const MAX_VERSIONS_PER_WORKFLOW = 20;

// ============================================================
// Database Initialization
// ============================================================

let dbInstance: IDBDatabase | null = null;

function resetVersionDB(): void {
  dbInstance = null;
}

async function openVersionDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(VERSION_STORE_NAME)) {
        const store = db.createObjectStore(VERSION_STORE_NAME, { keyPath: 'id' });
        store.createIndex('workflowId', 'workflowId', { unique: false });
        store.createIndex('version', 'version', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// ============================================================
// Version Operations
// ============================================================

/**
 * Create a new version snapshot for a workflow
 */
export async function createVersion(workflowId: string, definition: SVGNode[]): Promise<void> {
  const db = await openVersionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VERSION_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VERSION_STORE_NAME);

    // Get the current version count for this workflow
    const countRequest = store.index('workflowId').count(IDBKeyRange.only(workflowId));
    
    countRequest.onerror = () => reject(countRequest.error);
    countRequest.onsuccess = () => {
      const currentCount = countRequest.result;
      let versionCount = currentCount;
      
      // If at max versions, prune the oldest
      if (currentCount >= MAX_VERSIONS_PER_WORKFLOW) {
        pruneOldestVersion(workflowId).then(() => {
          versionCount++;
          insertNewVersion(versionCount);
        }).catch(reject);
      } else {
        insertNewVersion(versionCount);
      }
    };

    function insertNewVersion(count: number): void {
      const versionId = `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const nextVersion = count + 1;

      const version: Version = {
        id: versionId,
        workflowId,
        version: nextVersion,
        definition,
        createdAt: new Date().toISOString(),
      };

      const addRequest = store.add(version);
      addRequest.onerror = () => reject(addRequest.error);
      addRequest.onsuccess = () => resolve();
    }
  });
}

/**
 * Prune the oldest version for a workflow
 */
async function pruneOldestVersion(workflowId: string): Promise<void> {
  const db = await openVersionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VERSION_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VERSION_STORE_NAME);
    const index = store.index('workflowId');

    const cursorRequest = index.openCursor(IDBKeyRange.only(workflowId));
    let oldestVersion: Version | null = null;
    let oldestCreatedAt: string | null = null;

    cursorRequest.onerror = () => reject(cursorRequest.error);
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const version = cursor.value as Version;
        if (!oldestCreatedAt || version.createdAt < oldestCreatedAt) {
          oldestCreatedAt = version.createdAt;
          oldestVersion = version;
        }
        cursor.continue();
      } else {
        // Done iterating, delete the oldest
        if (oldestVersion) {
          const deleteRequest = store.delete(oldestVersion.id);
          deleteRequest.onerror = () => reject(deleteRequest.error);
          deleteRequest.onsuccess = () => resolve();
        } else {
          resolve();
        }
      }
    };
  });
}

/**
 * Get all versions for a workflow, sorted by version descending (newest first)
 */
export async function getVersions(workflowId: string): Promise<Version[]> {
  const db = await openVersionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VERSION_STORE_NAME, 'readonly');
    const store = transaction.objectStore(VERSION_STORE_NAME);
    const index = store.index('workflowId');
    const request = index.getAll(IDBKeyRange.only(workflowId));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const versions = (request.result || []) as Version[];
      // Sort by version descending (newest first)
      versions.sort((a, b) => b.version - a.version);
      resolve(versions);
    };
  });
}

/**
 * Rollback to a specific version
 * Returns the definition of that version
 */
export async function rollback(versionId: string): Promise<SVGNode[]> {
  const db = await openVersionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VERSION_STORE_NAME, 'readonly');
    const store = transaction.objectStore(VERSION_STORE_NAME);
    const request = store.get(versionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const version = request.result as Version | undefined;
      if (!version) {
        reject(new Error(`Version ${versionId} not found`));
        return;
      }
      resolve(version.definition);
    };
  });
}

/**
 * Get a specific version by ID
 */
export async function getVersion(versionId: string): Promise<Version | null> {
  const db = await openVersionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VERSION_STORE_NAME, 'readonly');
    const store = transaction.objectStore(VERSION_STORE_NAME);
    const request = store.get(versionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Delete all versions for a workflow
 */
export async function deleteVersionsByWorkflow(workflowId: string): Promise<void> {
  const db = await openVersionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VERSION_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VERSION_STORE_NAME);
    const index = store.index('workflowId');
    const request = index.openCursor(IDBKeyRange.only(workflowId));

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

/**
 * Clear all versions (for testing)
 */
export async function clearAllVersions(): Promise<void> {
  const db = await openVersionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VERSION_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VERSION_STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Expose reset for testing
export { resetVersionDB };
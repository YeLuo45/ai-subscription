/**
 * IndexedDB CRUD for Workflows (SVG Canvas Format)
 * Handles persistence of workflow canvas definitions using SVGNode[]
 */

import type { SVGNode } from './types';

export interface Workflow {
  id: string;
  name: string;
  definition: SVGNode[];
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'workflow-canvas-db';
const DB_VERSION = 1;
const STORE_NAME = 'workflows';

// ============================================================
// Database Initialization
// ============================================================

let dbInstance: IDBDatabase | null = null;

function resetDB(): void {
  dbInstance = null;
}

async function openDB(): Promise<IDBDatabase> {
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

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// ============================================================
// CRUD Operations
// ============================================================

/**
 * Save a workflow (create or update)
 * Returns the workflow ID
 */
export async function saveWorkflow(name: string, definition: SVGNode[]): Promise<string> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Check if workflow exists with same name to update
    const existingRequest = store.index('name').get(name);
    let workflowId: string;

    existingRequest.onsuccess = () => {
      const existing = existingRequest.result;
      const now = new Date().toISOString();

      if (existing) {
        // Update existing workflow
        workflowId = existing.id;
        const data: Workflow = {
          ...existing,
          definition,
          updatedAt: now,
        };
        const updateRequest = store.put(data);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve(workflowId);
      } else {
        // Create new workflow
        workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const data: Workflow = {
          id: workflowId,
          name,
          definition,
          createdAt: new Date().toISOString(),
          updatedAt: now,
        };
        const addRequest = store.add(data);
        addRequest.onerror = () => reject(addRequest.error);
        addRequest.onsuccess = () => resolve(workflowId);
      }
    };

    existingRequest.onerror = () => reject(existingRequest.error);
  });
}

/**
 * Load a workflow by ID
 */
export async function loadWorkflow(id: string): Promise<Workflow | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * List all workflows
 */
export async function listWorkflows(): Promise<Workflow[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Delete a workflow by ID
 */
export async function deleteWorkflow(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Rename a workflow
 */
export async function renameWorkflow(id: string, name: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const workflow = getRequest.result;
      if (!workflow) {
        reject(new Error(`Workflow ${id} not found`));
        return;
      }

      workflow.name = name;
      workflow.updatedAt = new Date().toISOString();

      const putRequest = store.put(workflow);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
}

/**
 * Clear all workflows (for testing)
 */
export async function clearAllWorkflows(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Expose reset for testing
export { resetDB };
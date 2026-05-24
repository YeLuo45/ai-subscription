/**
 * IndexedDB Storage for Workflow Canvas
 * Handles persistence of workflow definitions
 */

import type { WorkflowDefinition } from './types';

const DB_NAME = 'workflow-canvas-db';
const DB_VERSION = 1;
const STORE_NAME = 'workflows';

// ============================================================
// Database Initialization
// ============================================================

let dbInstance: IDBDatabase | null = null;

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
 * Save a workflow definition (create or update)
 */
export async function saveWorkflow(workflow: WorkflowDefinition): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data = {
      ...workflow,
      updatedAt: new Date().toISOString(),
    };
    
    const request = store.put(data);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(id: string): Promise<WorkflowDefinition | null> {
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
 * Get all workflows
 */
export async function getAllWorkflows(): Promise<WorkflowDefinition[]> {
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
export async function renameWorkflow(id: string, newName: string): Promise<void> {
  const workflow = await getWorkflow(id);
  if (!workflow) throw new Error(`Workflow ${id} not found`);
  
  workflow.name = newName;
  workflow.updatedAt = new Date().toISOString();
  
  await saveWorkflow(workflow);
}

/**
 * Duplicate a workflow
 */
export async function duplicateWorkflow(id: string): Promise<WorkflowDefinition> {
  const original = await getWorkflow(id);
  if (!original) throw new Error(`Workflow ${id} not found`);
  
  const newWorkflow: WorkflowDefinition = {
    ...original,
    id: `workflow_${Date.now()}`,
    name: `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Generate new IDs for nodes and edges
  const idMap: Record<string, string> = {};
  
  newWorkflow.nodes = newWorkflow.nodes.map(node => {
    const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    idMap[node.id] = newId;
    return { ...node, id: newId };
  });
  
  newWorkflow.edges = newWorkflow.edges.map(edge => ({
    ...edge,
    id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: idMap[edge.source] || edge.source,
    target: idMap[edge.target] || edge.target,
  }));
  
  await saveWorkflow(newWorkflow);
  return newWorkflow;
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

// ============================================================
// Export/Import for Backup
// ============================================================

export interface WorkflowExport {
  version: number;
  exportedAt: string;
  workflows: WorkflowDefinition[];
}

export async function exportAllWorkflows(): Promise<string> {
  const workflows = await getAllWorkflows();
  const exportData: WorkflowExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workflows,
  };
  return JSON.stringify(exportData, null, 2);
}

export async function importWorkflows(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString) as WorkflowExport;
  
  if (!data.workflows || !Array.isArray(data.workflows)) {
    throw new Error('Invalid import data format');
  }
  
  let imported = 0;
  for (const workflow of data.workflows) {
    if (workflow.id && workflow.name && Array.isArray(workflow.nodes)) {
      await saveWorkflow(workflow);
      imported++;
    }
  }
  
  return imported;
}
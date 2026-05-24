/**
 * L4 Procedural Memory - Subscription Operation Habits
 * Uses IndexedDB for permanent storage of user workflows
 */

import type { ProceduralMemoryItem } from './types';

const DB_NAME = 'AISubscriptionDB';
const DB_VERSION = 3;
const STORE_NAME = 'procedural_memory';
const CONTEXT_WINDOW = 10; // Remember last N contexts for each action

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    
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
        store.createIndex('action', 'action', { unique: false });
        store.createIndex('frequency', 'frequency', { unique: false });
        store.createIndex('lastUsed', 'lastUsed', { unique: false });
      }
    };
  });
}

function generateId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all procedural memory items
 */
export async function getProceduralActions(action?: string): Promise<ProceduralMemoryItem[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    let request: IDBRequest;
    if (action) {
      const index = store.index('action');
      request = index.getAll(action);
    } else {
      request = store.getAll();
    }
    
    request.onsuccess = () => {
      const results = request.result as ProceduralMemoryItem[];
      // Sort by frequency descending
      results.sort((a, b) => b.frequency - a.frequency);
      resolve(results);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Record an action performed by the user
 */
export async function recordAction(
  action: string,
  context: Record<string, any> = {}
): Promise<ProceduralMemoryItem> {
  const db = await openDB();
  const now = Date.now();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('action');
    const request = index.getAll(action);
    
    request.onsuccess = () => {
      const existing = (request.result as ProceduralMemoryItem[]).filter(
        (item: ProceduralMemoryItem) => item.lastUsed > now - 60000 // Within last minute
      );
      
      if (existing.length > 0) {
        // Update existing action (throttle to once per minute)
        const item = existing[0];
        item.frequency++;
        item.lastUsed = now;
        
        // Update context history
        if (context && Object.keys(context).length > 0) {
          item.context = context;
        }
        
        const putRequest = store.put(item);
        putRequest.onsuccess = () => {
          dispatchMemoryEvent('action_recorded', { action });
          resolve(item);
        };
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        // Create new action entry
        const newItem: ProceduralMemoryItem = {
          id: generateId(),
          action,
          frequency: 1,
          lastUsed: now,
          context,
          workflow: [],
        };
        
        const addRequest = store.add(newItem);
        addRequest.onsuccess = () => {
          dispatchMemoryEvent('action_recorded', { action });
          resolve(newItem);
        };
        addRequest.onerror = () => reject(addRequest.error);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get recommended actions based on context
 */
export async function getRecommendedActions(): Promise<ProceduralMemoryItem[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const results = request.result as ProceduralMemoryItem[];
      
      // Filter to actions used within last 7 days
      const recentThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentActions = results.filter(item => item.lastUsed > recentThreshold);
      
      // Sort by frequency and recency
      recentActions.sort((a, b) => {
        const aScore = a.frequency * (a.lastUsed / Date.now());
        const bScore = b.frequency * (b.lastUsed / Date.now());
        return bScore - aScore;
      });
      
      // Return top 5
      resolve(recentActions.slice(0, 5));
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get workflow for a specific action
 */
export async function getWorkflow(action: string): Promise<string[]> {
  const actions = await getProceduralActions(action);
  
  if (actions.length === 0) return [];
  
  // Find most frequent action
  const mostFrequent = actions.reduce((best, curr) =>
    curr.frequency > best.frequency ? curr : best
  );
  
  return mostFrequent.workflow;
}

/**
 * Update workflow for an action
 */
export async function updateWorkflow(
  action: string,
  workflow: string[]
): Promise<void> {
  const db = await openDB();
  const actions = await getProceduralActions(action);
  
  if (actions.length === 0) return;
  
  const mostFrequent = actions.reduce((best, curr) =>
    curr.frequency > best.frequency ? curr : best
  );
  
  mostFrequent.workflow = workflow;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(mostFrequent);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Record a workflow sequence
 */
export async function recordWorkflowSequence(
  actions: string[],
  context: Record<string, any> = {}
): Promise<void> {
  if (actions.length === 0) return;
  
  // Record each action in sequence
  for (let i = 0; i < actions.length; i++) {
    const actionContext = {
      ...context,
      sequenceIndex: i,
      sequenceLength: actions.length,
    };
    await recordAction(actions[i], actionContext);
  }
  
  // Update workflow for the first action
  await updateWorkflow(actions[0], actions);
}

/**
 * Get action statistics
 */
export async function getActionStats(): Promise<{
  totalActions: number;
  uniqueActions: number;
  mostFrequent: Array<{ action: string; frequency: number }>;
  recentActions: string[];
}> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const results = request.result as ProceduralMemoryItem[];
      
      const recentThreshold = Date.now() - (24 * 60 * 60 * 1000);
      const recentItems = results.filter(item => item.lastUsed > recentThreshold);
      
      const sortedByFreq = [...results].sort((a, b) => b.frequency - a.frequency);
      
      resolve({
        totalActions: results.reduce((sum, item) => sum + item.frequency, 0),
        uniqueActions: results.length,
        mostFrequent: sortedByFreq.slice(0, 5).map(item => ({
          action: item.action,
          frequency: item.frequency,
        })),
        recentActions: recentItems
          .sort((a, b) => b.lastUsed - a.lastUsed)
          .slice(0, 10)
          .map(item => item.action),
      });
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Dispatch memory event for cross-component notification
 */
function dispatchMemoryEvent(type: string, payload: any): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memory-event', {
      detail: { type, payload, timestamp: Date.now() }
    }));
  }
}
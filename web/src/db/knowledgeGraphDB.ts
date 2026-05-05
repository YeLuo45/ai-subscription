/**
 * IndexedDB Database Layer for Knowledge Graph
 * Table: knowledge_graphs
 */

import type { KnowledgeGraph } from '../types/knowledgeGraph';

const DB_NAME = 'ai-subscription';
const DB_VERSION = 4; // Incremented for new table

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

      // knowledge_graphs table
      if (!db.objectStoreNames.contains('knowledge_graphs')) {
        const kgStore = db.createObjectStore('knowledge_graphs', { keyPath: 'id' });
        kgStore.createIndex('articleId', 'articleId', { unique: false });
        kgStore.createIndex('createdAt', 'createdAt', { unique: false });
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

// ============================================================
// Knowledge Graph Operations
// ============================================================

/**
 * Save a knowledge graph to IndexedDB
 */
export async function saveKnowledgeGraph(graph: KnowledgeGraph): Promise<void> {
  const { store } = await tx('knowledge_graphs', 'readwrite');
  await promisifyRequest(store.put(graph));
}

/**
 * Get a knowledge graph by ID
 */
export async function getKnowledgeGraphById(id: string): Promise<KnowledgeGraph | undefined> {
  const { store } = await tx('knowledge_graphs');
  return promisifyRequest(store.get(id));
}

/**
 * Get a knowledge graph by article ID
 */
export async function getKnowledgeGraphByArticleId(articleId: string): Promise<KnowledgeGraph | undefined> {
  const { store } = await tx('knowledge_graphs');
  const index = store.index('articleId');
  const results = await promisifyRequest<KnowledgeGraph[]>(index.getAll(articleId));
  return results[0];
}

/**
 * Get all knowledge graphs (for history)
 */
export async function getAllKnowledgeGraphs(): Promise<KnowledgeGraph[]> {
  const { store } = await tx('knowledge_graphs');
  const all = await promisifyRequest<KnowledgeGraph[]>(store.getAll());
  // Sort by createdAt descending
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get recent knowledge graphs (most recent N)
 */
export async function getRecentKnowledgeGraphs(limit: number = 20): Promise<KnowledgeGraph[]> {
  const all = await getAllKnowledgeGraphs();
  return all.slice(0, limit);
}

/**
 * Delete a knowledge graph by ID
 */
export async function deleteKnowledgeGraph(id: string): Promise<void> {
  const { store } = await tx('knowledge_graphs', 'readwrite');
  await promisifyRequest(store.delete(id));
}

/**
 * Delete knowledge graphs by article ID
 */
export async function deleteKnowledgeGraphsByArticleId(articleId: string): Promise<void> {
  const graph = await getKnowledgeGraphByArticleId(articleId);
  if (graph) {
    await deleteKnowledgeGraph(graph.id);
  }
}

/**
 * Clear all knowledge graphs
 */
export async function clearAllKnowledgeGraphs(): Promise<void> {
  const { store } = await tx('knowledge_graphs', 'readwrite');
  const all = await promisifyRequest<KnowledgeGraph[]>(store.getAll());
  for (const graph of all) {
    await promisifyRequest(store.delete(graph.id));
  }
}

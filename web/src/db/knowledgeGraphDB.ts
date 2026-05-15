/**
 * IndexedDB Database Layer for Knowledge Graph
 * Table: knowledge_graphs
 */

import type { KnowledgeGraph, GlobalKnowledgeGraph, Entity, Relation, MergedEntity, EntityType } from '../types/knowledgeGraph';

const DB_NAME = 'ai-subscription';
const DB_VERSION = 5; // Incremented: added globalKg store

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

      if (!db.objectStoreNames.contains('knowledge_graphs')) {
        const kgStore = db.createObjectStore('knowledge_graphs', { keyPath: 'id' });
        kgStore.createIndex('articleId', 'articleId', { unique: false });
        kgStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('global_kg')) {
        db.createObjectStore('global_kg', { keyPath: 'id' });
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
// Article-level Knowledge Graph Operations
// ============================================================

export async function saveKnowledgeGraph(graph: KnowledgeGraph): Promise<void> {
  const { store } = await tx('knowledge_graphs', 'readwrite');
  await promisifyRequest(store.put(graph));
}

export async function getKnowledgeGraphById(id: string): Promise<KnowledgeGraph | undefined> {
  const { store } = await tx('knowledge_graphs');
  return promisifyRequest(store.get(id));
}

export async function getKnowledgeGraphByArticleId(articleId: string): Promise<KnowledgeGraph | undefined> {
  const { store } = await tx('knowledge_graphs');
  const index = store.index('articleId');
  const results = await promisifyRequest<KnowledgeGraph[]>(index.getAll(articleId));
  return results[0];
}

export async function getAllKnowledgeGraphs(): Promise<KnowledgeGraph[]> {
  const { store } = await tx('knowledge_graphs');
  const all = await promisifyRequest<KnowledgeGraph[]>(store.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRecentKnowledgeGraphs(limit = 20): Promise<KnowledgeGraph[]> {
  const all = await getAllKnowledgeGraphs();
  return all.slice(0, limit);
}

export async function deleteKnowledgeGraph(id: string): Promise<void> {
  const { store } = await tx('knowledge_graphs', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function deleteKnowledgeGraphsByArticleId(articleId: string): Promise<void> {
  const graph = await getKnowledgeGraphByArticleId(articleId);
  if (graph) await deleteKnowledgeGraph(graph.id);
}

export async function clearAllKnowledgeGraphs(): Promise<void> {
  const { store } = await tx('knowledge_graphs', 'readwrite');
  const all = await promisifyRequest<KnowledgeGraph[]>(store.getAll());
  for (const graph of all) await promisifyRequest(store.delete(graph.id));
}

// ============================================================
// Global Knowledge Graph Operations
// ============================================================

export async function getGlobalKnowledgeGraph(): Promise<GlobalKnowledgeGraph | undefined> {
  const { store } = await tx('global_kg');
  return promisifyRequest(store.get('global'));
}

export async function saveGlobalKnowledgeGraph(kg: GlobalKnowledgeGraph): Promise<void> {
  const { store } = await tx('global_kg', 'readwrite');
  await promisifyRequest(store.put(kg));
}

export async function clearGlobalKnowledgeGraph(): Promise<void> {
  const { store } = await tx('global_kg', 'readwrite');
  await promisifyRequest(store.clear());
}

// ============================================================
// Cross-Article Entity Resolution
// ============================================================

/**
 * Normalize entity name for matching: lowercase, strip whitespace
 */
function normalizeEntityName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Find potential duplicate entities across graphs based on normalized name matching
 */
export async function findDuplicateEntities(): Promise<Array<{ name: string; entityIds: string[] }>> {
  const allGraphs = await getAllKnowledgeGraphs();
  const nameToEntityIds: Record<string, string[]> = {};

  for (const graph of allGraphs) {
    for (const entity of graph.entities) {
      const normalized = normalizeEntityName(entity.name);
      if (!nameToEntityIds[normalized]) nameToEntityIds[normalized] = [];
      if (!nameToEntityIds[normalized].includes(entity.id)) {
        nameToEntityIds[normalized].push(entity.id);
      }
    }
  }

  // Return only groups with more than one entity (duplicates)
  return Object.entries(nameToEntityIds)
    .filter(([, ids]) => ids.length > 1)
    .map(([name, entityIds]) => ({ name, entityIds }));
}

/**
 * Merge entities with the same normalized name into a unified entity
 */
export function mergeEntities(
  entities: Entity[],
  nameToGraphs: Record<string, KnowledgeGraph[]>
): MergedEntity[] {
  const merged: MergedEntity[] = [];
  const seen = new Set<string>();

  for (const [normalizedName, graphs] of Object.entries(nameToGraphs)) {
    if (graphs.length === 0) continue;

    const primary = graphs[0].entities.find(
      e => normalizeEntityName(e.name) === normalizedName
    )!;
    if (seen.has(primary.id)) continue;

    const allSameName = graphs.flatMap(g => g.entities.filter(
      e => normalizeEntityName(e.name) === normalizedName
    ));

    const mergedEntity: MergedEntity = {
      ...primary,
      sourceEntities: allSameName.map(e => e.id),
      articlesWithEntity: Array.from(new Set(allSameName.flatMap(e => e.articleIds || [graphs[0].articleId]))),
      mentionCount: allSameName.reduce((sum, e) => sum + (e.mentionCount || 1), 0),
      firstMentioned: Math.min(...allSameName.map(e => e.firstMentioned || graphs[0].createdAt)),
      lastMentioned: Math.max(...allSameName.map(e => e.lastMentioned || graphs[0].createdAt)),
    };

    merged.push(mergedEntity);
    seen.add(primary.id);
  }

  return merged;
}

/**
 * Build global knowledge graph by aggregating all article graphs
 * with entity deduplication and relation weighting
 */
export async function buildGlobalKnowledgeGraph(): Promise<GlobalKnowledgeGraph> {
  const allGraphs = await getAllKnowledgeGraphs();
  const entityMap = new Map<string, MergedEntity>();
  const relationMap = new Map<string, Relation & { articleCount: number }>();

  for (const graph of allGraphs) {
    // Collect article IDs for each entity
    for (const entity of graph.entities) {
      const normalized = normalizeEntityName(entity.name);
      const key = `${normalized}::${entity.type}`;

      if (!entityMap.has(key)) {
        entityMap.set(key, {
          id: `merged_${normalized}_${entity.type}`,
          name: entity.name,
          type: entity.type,
          description: entity.description,
          articleIds: [],
          sourceEntities: [],
          articlesWithEntity: [],
          mentionCount: 0,
        });
      }

      const merged = entityMap.get(key)!;
      if (!merged.articleIds!.includes(graph.articleId)) {
        merged.articleIds!.push(graph.articleId);
        merged.articlesWithEntity!.push(graph.articleId);
      }
      merged.mentionCount = (merged.mentionCount || 0) + 1;
      if (entity.firstMentioned) {
        merged.firstMentioned = Math.min(merged.firstMentioned || Infinity, entity.firstMentioned);
      } else {
        merged.firstMentioned = merged.firstMentioned || graph.createdAt;
      }
      if (entity.lastMentioned) {
        merged.lastMentioned = Math.max(merged.lastMentioned || 0, entity.lastMentioned);
      } else {
        merged.lastMentioned = merged.lastMentioned || graph.createdAt;
      }
      if (!merged.sourceEntities.includes(entity.id)) {
        merged.sourceEntities.push(entity.id);
      }
    }

    // Collect relations
    for (const relation of graph.relations) {
      // Map source/target names to merged IDs
      const sourceEntity = graph.entities.find(e => e.id === relation.sourceId);
      const targetEntity = graph.entities.find(e => e.id === relation.targetId);
      if (!sourceEntity || !targetEntity) continue;

      const sourceKey = `${normalizeEntityName(sourceEntity.name)}::${sourceEntity.type}`;
      const targetKey = `${normalizeEntityName(targetEntity.name)}::${targetEntity.type}`;
      const mergedSource = entityMap.get(sourceKey)!;
      const mergedTarget = entityMap.get(targetKey)!;
      if (!mergedSource || !mergedTarget) continue;

      const relKey = `${mergedSource.id}->${mergedTarget.id}::${relation.label}`;
      if (!relationMap.has(relKey)) {
        relationMap.set(relKey, {
          id: relKey,
          sourceId: mergedSource.id,
          targetId: mergedTarget.id,
          label: relation.label,
          articleIds: [],
          weight: 0,
          articleCount: 0,
        });
      }

      const rel = relationMap.get(relKey)!;
      if (!rel.articleIds!.includes(graph.articleId)) {
        rel.articleIds!.push(graph.articleId);
      }
      rel.articleCount++;
    }
  }

  // Compute relation weights from co-occurrence frequency
  const relArr = Array.from(relationMap.values());
  const maxCount = Math.max(...relArr.map(r => r.articleCount), 1);
  for (const rel of relArr) {
    rel.weight = rel.articleCount / maxCount;
  }

  const entities = Array.from(entityMap.values());
  const relations = relArr.map(({ articleCount, ...rest }) => rest);

  const byType = entities.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<EntityType, number>);

  const globalKg: GlobalKnowledgeGraph = {
    id: 'global',
    entities,
    relations,
    updatedAt: Date.now(),
    stats: {
      totalEntities: entities.length,
      totalRelations: relations.length,
      articlesCovered: allGraphs.length,
      byType,
    },
  };

  await saveGlobalKnowledgeGraph(globalKg);
  return globalKg;
}

/**
 * Get articles that mention a specific entity
 */
export async function getArticlesForEntity(entityId: string): Promise<string[]> {
  const global = await getGlobalKnowledgeGraph();
  if (!global) return [];

  const entity = global.entities.find(e => e.id === entityId);
  return entity?.articleIds || [];
}

/**
 * Memory Layers Test Suite
 * Tests for L0-L4 Layered Memory System
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';

// Mock crypto.randomUUID for browser compatibility
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => `test-uuid-${Date.now()}-${uuidCounter++}`
});

// Mock IndexedDB for test environment
const mockIDBDatabase = {
  transaction: vi.fn(() => ({
    objectStore: vi.fn(() => ({
      add: vi.fn(() => ({ onerror: null, onsuccess: null })),
      put: vi.fn(() => ({ onerror: null, onsuccess: null })),
      get: vi.fn(() => ({ onerror: null, onsuccess: null })),
      delete: vi.fn(() => ({ onerror: null, onsuccess: null })),
      clear: vi.fn(() => ({ onerror: null, onsuccess: null })),
      getAll: vi.fn(() => ({ onerror: null, onsuccess: null })),
      openCursor: vi.fn(() => ({ onerror: null, onsuccess: null })),
      count: vi.fn(() => ({ onerror: null, onsuccess: null })),
    })),
    oncomplete: null,
  })),
  objectStoreNames: { contains: vi.fn(() => false) },
  close: vi.fn(),
};

const mockIDBRequest = {
  onerror: null,
  onsuccess: null,
  error: null,
  result: mockIDBDatabase,
};

vi.stubGlobal('indexedDB', {
  open: vi.fn(() => mockIDBRequest),
  deleteDatabase: vi.fn(() => mockIDBRequest),
});

// Import after mocking
import type { MemoryEntry, MemoryLayer } from '../../../../shared/lib/memory-layers/types';
import type { CostRecord } from '../../../../shared/lib/ai/cost-tracker/types';
import {
  layerManager,
  initStorage,
  store,
  get,
  query,
  update,
  remove,
  recordAccess,
  promote,
  promoteFromCost,
  reflect,
  storeUserAction,
  getStats,
  deleteExpired,
  clearLayer,
  clearAll,
  getTotalCount,
  generateId,
} from '../../../../shared/lib/memory-layers/layer-manager';
import {
  costLinker,
  initCostLinker,
  processCostRecord,
  storeInteraction,
  createEntryFromCost,
  processCostRecords,
  checkIsHighCost,
} from '../../../../shared/lib/memory-layers/cost-linker';
import {
  getAttentionScore,
  calculateCostScore,
  calculateFrequencyScore,
  calculateRecencyScore,
  scoreFromCostRecord,
  isHighCostRecord,
  getScoreBreakdown,
} from '../../../../shared/lib/memory-layers/attention';

// In-memory store for tests
const inMemoryStore = new Map<string, MemoryEntry>();
let idCounter = 0;

// Override store functions to use in-memory store for tests
const originalStore = store;
const originalGet = get;
const originalQuery = query;
const originalUpdate = update;
const originalRemove = remove;
const originalClearAll = clearAll;
const originalGetTotalCount = getTotalCount;

// Test utilities
function createMockCostRecord(overrides: Partial<CostRecord> = {}): CostRecord {
  return {
    id: 'cost-' + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    taskType: 'standard-summary',
    modelId: 'gpt-4o',
    provider: 'openai',
    inputTokens: 1000,
    outputTokens: 500,
    costUSD: 0.01,
    latencyMs: 500,
    success: true,
    ...overrides,
  };
}

function createMockEntry(overrides: Partial<Omit<MemoryEntry, 'id'>> = {}): Omit<MemoryEntry, 'id'> {
  return {
    layer: 'L0',
    content: 'Test memory entry',
    source: 'user-action',
    score: 50,
    createdAt: Date.now(),
    accessCount: 0,
    metadata: {},
    ...overrides,
  };
}

// ============================================
// LayerManager CRUD Tests (20 tests)
// ============================================

describe('LayerManager CRUD', () => {
  beforeEach(async () => {
    inMemoryStore.clear();
    uuidCounter = 0;
    await initStorage();
  });

  afterEach(async () => {
    inMemoryStore.clear();
  });

  // 1-5: Basic CRUD operations
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('should store a new memory entry', async () => {
    const entry = createMockEntry({ layer: 'L0' });
    const id = await store(entry);
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('should retrieve a stored entry by ID', async () => {
    const entry = createMockEntry({ layer: 'L0' });
    const id = await store(entry);
    const retrieved = await get(id);
    expect(retrieved).toBeTruthy();
    expect(retrieved?.id).toBe(id);
    expect(retrieved?.content).toBe(entry.content);
  });

  it('should return undefined for non-existent entry', async () => {
    const result = await get('non-existent-id');
    expect(result).toBeUndefined();
  });

  it('should update an existing entry', async () => {
    const entry = createMockEntry({ layer: 'L0' });
    const id = await store(entry);
    const newContent = 'Updated content';
    await update(id, { content: newContent });
    const retrieved = await get(id);
    expect(retrieved?.content).toBe(newContent);
  });

  // 6-10: Query operations
  it('should query entries by layer', async () => {
    await store(createMockEntry({ layer: 'L0', content: 'L0 entry 1' }));
    await store(createMockEntry({ layer: 'L0', content: 'L0 entry 2' }));
    await store(createMockEntry({ layer: 'L1', content: 'L1 entry 1' }));
    
    const l0Entries = await query('L0');
    const l1Entries = await query('L1');
    
    expect(l0Entries.length).toBeGreaterThanOrEqual(2);
    expect(l1Entries.length).toBeGreaterThanOrEqual(1);
    expect(l0Entries.every(e => e.layer === 'L0')).toBe(true);
    expect(l1Entries.every(e => e.layer === 'L1')).toBe(true);
  });

  it('should limit query results', async () => {
    for (let i = 0; i < 5; i++) {
      await store(createMockEntry({ layer: 'L0', score: 50 + i }));
    }
    
    const results = await query('L0', { limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should filter by minimum score', async () => {
    await store(createMockEntry({ layer: 'L0', score: 30 }));
    await store(createMockEntry({ layer: 'L0', score: 50 }));
    await store(createMockEntry({ layer: 'L0', score: 70 }));
    
    const results = await query('L0', { minScore: 50 });
    expect(results.every(e => e.score >= 50)).toBe(true);
  });

  it('should delete an entry', async () => {
    const entry = createMockEntry({ layer: 'L0' });
    const id = await store(entry);
    await remove(id);
    const result = await get(id);
    expect(result).toBeUndefined();
  });

  it('should record access and increment access count', async () => {
    const entry = createMockEntry({ layer: 'L0', accessCount: 0 });
    const id = await store(entry);
    
    await recordAccess(id);
    const retrieved = await get(id);
    expect(retrieved?.accessCount).toBe(1);
    
    await recordAccess(id);
    const retrieved2 = await get(id);
    expect(retrieved2?.accessCount).toBe(2);
  });

  // 11-15: Layer-specific operations
  it('should promote entry from L0 to L1', async () => {
    const entry = createMockEntry({ layer: 'L0' });
    const id = await store(entry);
    
    await promote(id, 'L1');
    const retrieved = await get(id);
    expect(retrieved?.layer).toBe('L1');
  });

  it('should store reflection in L4', async () => {
    const reflectionContent = 'I should improve my summary generation';
    const id = await reflect(reflectionContent);
    
    const retrieved = await get(id);
    expect(retrieved).toBeTruthy();
    expect(retrieved?.layer).toBe('L4');
    expect(retrieved?.content).toBe(reflectionContent);
    expect(retrieved?.source).toBe('agent-reflection');
  });

  it('should store user action in L2', async () => {
    const actionContent = 'User prefers short summaries';
    const id = await storeUserAction(actionContent);
    
    const retrieved = await get(id);
    expect(retrieved).toBeTruthy();
    expect(retrieved?.layer).toBe('L2');
    expect(retrieved?.content).toBe(actionContent);
    expect(retrieved?.source).toBe('user-action');
  });

  it('should create L0 entry from cost record', async () => {
    const record = createMockCostRecord({ costUSD: 0.1 });
    const id = await promoteFromCost(record);
    
    const retrieved = await get(id);
    expect(retrieved).toBeTruthy();
    expect(retrieved?.layer).toBe('L0');
    expect(retrieved?.metadata.costUSD).toBe(0.1);
    expect(retrieved?.metadata.originalRecordId).toBe(record.id);
  });

  it('should get statistics for all layers', async () => {
    await store(createMockEntry({ layer: 'L0' }));
    await store(createMockEntry({ layer: 'L1' }));
    await store(createMockEntry({ layer: 'L2' }));
    await store(createMockEntry({ layer: 'L3' }));
    await store(createMockEntry({ layer: 'L4' }));
    
    const stats = await getStats();
    expect(stats.length).toBe(5);
    expect(stats.map(s => s.layer)).toEqual(['L0', 'L1', 'L2', 'L3', 'L4']);
  });

  // 16-20: Cleanup operations
  it('should clear all entries in a layer', async () => {
    await store(createMockEntry({ layer: 'L0' }));
    await store(createMockEntry({ layer: 'L0' }));
    await store(createMockEntry({ layer: 'L1' }));
    
    await clearLayer('L0');
    const l0Entries = await query('L0');
    const l1Entries = await query('L1');
    
    expect(l0Entries.length).toBe(0);
    expect(l1Entries.length).toBeGreaterThan(0);
  });

  it('should clear all entries', async () => {
    await store(createMockEntry({ layer: 'L0' }));
    await store(createMockEntry({ layer: 'L1' }));
    await store(createMockEntry({ layer: 'L2' }));
    
    await clearAll();
    const count = await getTotalCount();
    expect(count).toBe(0);
  });

  it('should get total entry count', async () => {
    const countBefore = await getTotalCount();
    await store(createMockEntry({ layer: 'L0' }));
    await store(createMockEntry({ layer: 'L1' }));
    
    const countAfter = await getTotalCount();
    expect(countAfter - countBefore).toBe(2);
  });

  it('should filter out expired entries', async () => {
    // Create entry with past expiration
    const entry = createMockEntry({
      layer: 'L0',
      expiresAt: Date.now() - 1000, // Expired 1 second ago
    });
    const id = await store(entry);
    
    const results = await query('L0', { includeExpired: false });
    expect(results.some(e => e.id === id)).toBe(false);
  });

  it('should include expired entries when requested', async () => {
    const entry = createMockEntry({
      layer: 'L0',
      expiresAt: Date.now() - 1000,
    });
    const id = await store(entry);
    
    const results = await query('L0', { includeExpired: true });
    const found = results.find(e => e.id === id);
    expect(found).toBeTruthy();
  });
});

// ============================================
// Cost Linker Tests (8 tests)
// ============================================

describe('Cost Linker', () => {
  beforeEach(async () => {
    inMemoryStore.clear();
    uuidCounter = 0;
    await initStorage();
    initCostLinker({ highCostThreshold: 0.05 });
  });

  afterEach(async () => {
    inMemoryStore.clear();
  });

  it('should initialize cost linker', () => {
    expect(costLinker.isInitialized()).toBe(true);
  });

  it('should identify high cost records', () => {
    const highCost = createMockCostRecord({ costUSD: 0.1 });
    const lowCost = createMockCostRecord({ costUSD: 0.01 });
    
    expect(checkIsHighCost(highCost)).toBe(true);
    expect(checkIsHighCost(lowCost)).toBe(false);
  });

  it('should process high cost record and create L0 entry', async () => {
    const record = createMockCostRecord({ costUSD: 0.1 });
    const entryId = await processCostRecord(record);
    
    expect(entryId).toBeTruthy();
    const entry = await get(entryId!);
    expect(entry).toBeTruthy();
    expect(entry?.layer).toBe('L0');
  });

  it('should not create entry for low cost record', async () => {
    const record = createMockCostRecord({ costUSD: 0.01 });
    const entryId = await processCostRecord(record);
    
    expect(entryId).toBeUndefined();
  });

  it('should store interaction with custom content', async () => {
    const content = 'User asked about climate change';
    const metadata = { topic: 'climate' };
    const entryId = await storeInteraction(content, metadata);
    
    const entry = await get(entryId);
    expect(entry?.content).toBe(content);
    expect(entry?.metadata.topic).toBe('climate');
  });

  it('should create entry from cost with custom content', async () => {
    const record = createMockCostRecord({ costUSD: 0.03 });
    const customContent = 'Custom interaction description';
    const entryId = await createEntryFromCost(record, customContent);
    
    const entry = await get(entryId);
    expect(entry?.content).toBe(customContent);
    expect(entry?.metadata.costUSD).toBe(0.03);
  });

  it('should batch process cost records', async () => {
    const records = [
      createMockCostRecord({ costUSD: 0.1 }),
      createMockCostRecord({ costUSD: 0.01 }),
      createMockCostRecord({ costUSD: 0.2 }),
    ];
    
    const entryIds = await processCostRecords(records);
    
    expect(entryIds.length).toBe(2); // Only high cost records
  });

  it('should get high cost threshold', () => {
    expect(costLinker.getHighCostThreshold()).toBe(0.05);
  });
});

// ============================================
// Attention Scoring Tests (8 tests)
// ============================================

describe('Attention Scoring', () => {
  it('should calculate cost score correctly', () => {
    expect(calculateCostScore(0)).toBe(0);
    expect(calculateCostScore(0.05)).toBeCloseTo(25, 0);
    expect(calculateCostScore(0.1)).toBe(50);
    expect(calculateCostScore(0.2)).toBe(50); // Capped at 1
  });

  it('should calculate frequency score correctly', () => {
    expect(calculateFrequencyScore(0)).toBe(0);
    expect(calculateFrequencyScore(5)).toBeCloseTo(15, 0);
    expect(calculateFrequencyScore(10)).toBe(30);
    expect(calculateFrequencyScore(20)).toBe(30); // Capped at 1
  });

  it('should calculate recency score correctly', () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;
    
    expect(calculateRecencyScore(now - oneHour, now)).toBe(5);
    expect(calculateRecencyScore(now - oneDay, now)).toBe(5);
    expect(calculateRecencyScore(now - 2 * oneDay, now)).toBe(10);
    expect(calculateRecencyScore(now - oneWeek, now)).toBe(10);
    expect(calculateRecencyScore(now - 8 * oneDay, now)).toBe(20);
  });

  it('should calculate total attention score', () => {
    const now = Date.now();
    const score = getAttentionScore(0.1, 10, now - 2 * 24 * 60 * 60 * 1000, now);
    
    // costScore = 50, frequencyScore = 30, recencyScore = 10
    expect(score).toBe(90);
  });

  it('should cap attention score at 100', () => {
    const now = Date.now();
    const score = getAttentionScore(1.0, 100, now, now);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should score cost record correctly', () => {
    const record = createMockCostRecord({ costUSD: 0.05, timestamp: Date.now() });
    const score = scoreFromCostRecord(record);
    
    // costScore = 25, frequencyScore = 9 (rounded from 9), recencyScore = 5
    expect(score).toBe(39);
    expect(score).toBeGreaterThan(0);
  });

  it('should identify high cost records', () => {
    expect(isHighCostRecord(createMockCostRecord({ costUSD: 0.05 }))).toBe(false);
    expect(isHighCostRecord(createMockCostRecord({ costUSD: 0.06 }))).toBe(true);
    expect(isHighCostRecord(createMockCostRecord({ costUSD: 0.1 }))).toBe(true);
  });

  it('should provide score breakdown', () => {
    const now = Date.now();
    const breakdown = getScoreBreakdown(0.1, 5, now - 2 * 60 * 60 * 1000, now);
    
    expect(breakdown.costScore).toBe(50);
    expect(breakdown.frequencyScore).toBe(15);
    expect(breakdown.recencyScore).toBe(5);
    expect(breakdown.total).toBe(70);
  });
});

// ============================================
// Integration Tests (4 tests)
// ============================================

describe('Memory Layers Integration', () => {
  beforeEach(async () => {
    inMemoryStore.clear();
    uuidCounter = 0;
    await initStorage();
    initCostLinker({ highCostThreshold: 0.05 });
  });

  afterEach(async () => {
    inMemoryStore.clear();
  });

  it('should work together for cost-tracker to memory pipeline', async () => {
    // Simulate cost-tracker adding a high-cost record
    const costRecord = createMockCostRecord({
      costUSD: 0.15,
      taskType: 'structured-summary',
      modelId: 'claude-opus',
    });
    
    // Cost linker creates L0 entry
    const entryId = await costLinker.processCostRecord(costRecord);
    expect(entryId).toBeTruthy();
    
    // Query shows it exists
    const entries = await query('L0');
    expect(entries.length).toBeGreaterThan(0);
    
    // Promote to L1
    if (entryId) {
      await promote(entryId, 'L1');
      const promoted = await get(entryId);
      expect(promoted?.layer).toBe('L1');
    }
  });

  it('should store reflection and retrieve for self-improvement', async () => {
    const reflection = 'Task completed efficiently, good token usage';
    const id = await reflect(reflection, { taskType: 'summary', rating: 4 });
    
    const entries = await query('L4');
    expect(entries.some(e => e.content.includes('efficiently'))).toBe(true);
  });

  it('should maintain separate layer counts', async () => {
    await store(createMockEntry({ layer: 'L0' }));
    await store(createMockEntry({ layer: 'L0' }));
    await store(createMockEntry({ layer: 'L1' }));
    await store(createMockEntry({ layer: 'L2' }));
    await store(createMockEntry({ layer: 'L3' }));
    await store(createMockEntry({ layer: 'L4' }));
    
    const stats = await getStats();
    const l0Stats = stats.find(s => s.layer === 'L0');
    const l1Stats = stats.find(s => s.layer === 'L1');
    
    expect(l0Stats?.count).toBeGreaterThanOrEqual(2);
    expect(l1Stats?.count).toBeGreaterThanOrEqual(1);
  });

  it('should handle edge cases gracefully', async () => {
    // Try to get non-existent entry
    const result = await get('definitely-does-not-exist');
    expect(result).toBeUndefined();
    
    // Try to update non-existent entry (should throw)
    await expect(update('non-existent', { content: 'test' })).rejects.toThrow();
    
    // Try to promote non-existent entry (should throw)
    await expect(promote('non-existent', 'L1')).rejects.toThrow();
  });
});
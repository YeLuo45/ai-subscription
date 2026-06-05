/**
 * MemoryLayerManager.test.ts — Pure unit tests for L0-L4 layered memory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemoryLayerManager,
  LAYER_RANK,
  DEFAULT_LAYER_CONFIGS,
  type MemoryLayer,
  type MemoryItem,
} from '../MemoryLayerManager';

describe('MemoryLayerManager — add and get', () => {
  let mlm: MemoryLayerManager;
  beforeEach(() => {
    mlm = new MemoryLayerManager();
  });

  it('adds item to L0', () => {
    const item = mlm.add('L0', 'hello world');
    expect(item.layer).toBe('L0');
    expect(item.content).toBe('hello world');
    expect(item.importance).toBe(0.5);
  });

  it('adds with custom importance and metadata', () => {
    const item = mlm.add('L1', 'task context', { importance: 0.9, metadata: { user: 'alice' } });
    expect(item.importance).toBe(0.9);
    expect(item.metadata.user).toBe('alice');
  });

  it('get returns item by id and bumps accessCount', () => {
    const item = mlm.add('L0', 'x');
    const fetched = mlm.get(item.id);
    expect(fetched).toBeDefined();
    expect(fetched!.accessCount).toBe(1);
    const again = mlm.get(item.id);
    expect(again!.accessCount).toBe(2);
  });

  it('get returns undefined for unknown id', () => {
    expect(mlm.get('nope')).toBeUndefined();
  });

  it('get removes expired item', () => {
    const item = mlm.add('L0', 'temp', { ttlMs: 50 });
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mlm.get(item.id)).toBeUndefined();
        resolve();
      }, 100);
    });
  });

  it('list returns all items in a layer', () => {
    mlm.add('L0', 'a');
    mlm.add('L0', 'b');
    mlm.add('L1', 'c');
    expect(mlm.list('L0').length).toBe(2);
    expect(mlm.list('L1').length).toBe(1);
  });

  it('listAll returns all items across layers', () => {
    mlm.add('L0', 'a');
    mlm.add('L1', 'b');
    mlm.add('L2', 'c');
    expect(mlm.listAll().length).toBe(3);
  });

  it('evicts least-important item when over capacity', () => {
    const small = new MemoryLayerManager({ L0: { capacity: 3 } });
    small.add('L0', 'high', { importance: 0.9 });
    small.add('L0', 'low', { importance: 0.1 });
    small.add('L0', 'med', { importance: 0.5 });
    small.add('L0', 'lowest', { importance: 0.05 });
    const items = small.list('L0');
    expect(items.length).toBe(3);
    expect(items.find((i) => i.content === 'lowest')).toBeUndefined();
    expect(items.find((i) => i.content === 'low')).toBeDefined();
    const evictLog = small.getEvictLog();
    expect(evictLog.length).toBe(1);
    expect(evictLog[0].itemId).toBeDefined();
  });
});

describe('MemoryLayerManager — promote and demote', () => {
  let mlm: MemoryLayerManager;
  beforeEach(() => {
    mlm = new MemoryLayerManager();
  });

  it('promotes item to next layer by default', () => {
    const item = mlm.add('L0', 'x');
    const result = mlm.promote(item.id);
    expect(result).toBeDefined();
    expect(result!.fromLayer).toBe('L0');
    expect(result!.toLayer).toBe('L1');
    expect(mlm.list('L0').length).toBe(0);
    expect(mlm.list('L1').length).toBe(1);
  });

  it('promotes to explicit target layer', () => {
    const item = mlm.add('L0', 'x');
    const result = mlm.promote(item.id, 'L3');
    expect(result!.toLayer).toBe('L3');
  });

  it('cannot promote past L4', () => {
    const item = mlm.add('L4', 'x');
    const result = mlm.promote(item.id);
    expect(result).toBeUndefined();
  });

  it('records promotedFrom on item', () => {
    const item = mlm.add('L0', 'x');
    mlm.promote(item.id, 'L2');
    const fetched = mlm.get(item.id);
    expect(fetched!.promotedFrom).toBe('L0');
  });

  it('returns undefined for unknown id', () => {
    expect(mlm.promote('nope')).toBeUndefined();
  });

  it('demote moves to lower layer', () => {
    const item = mlm.add('L3', 'x');
    const ok = mlm.demote(item.id);
    expect(ok).toBe(true);
    expect(mlm.list('L2').length).toBe(1);
  });

  it('nextLayer returns L0->L1->L2->L3->L4', () => {
    expect(mlm.nextLayer('L0')).toBe('L1');
    expect(mlm.nextLayer('L3')).toBe('L4');
    expect(mlm.nextLayer('L4')).toBeUndefined();
  });

  it('prevLayer returns L4->L3->L2->L1->L0', () => {
    expect(mlm.prevLayer('L4')).toBe('L3');
    expect(mlm.prevLayer('L0')).toBeUndefined();
  });
});

describe('MemoryLayerManager — auto-promote', () => {
  it('auto-promotes on access threshold', () => {
    const mlm = new MemoryLayerManager({ L0: { capacity: 50, autoPromoteOnAccess: 2 } });
    const item = mlm.add('L0', 'x');
    mlm.get(item.id); // access 1
    mlm.get(item.id); // access 2 -> auto-promote
    expect(mlm.list('L0').length).toBe(0);
    expect(mlm.list('L1').length).toBe(1);
  });

  it('auto-promotes on importance threshold', () => {
    const mlm = new MemoryLayerManager({ L1: { capacity: 50, autoPromoteOnImportance: 0.95 } });
    const item = mlm.add('L1', 'critical', { importance: 0.99 });
    mlm.get(item.id);
    expect(mlm.list('L2').length).toBe(1);
  });
});

describe('MemoryLayerManager — query', () => {
  let mlm: MemoryLayerManager;
  beforeEach(() => {
    mlm = new MemoryLayerManager();
    mlm.add('L0', 'apple');
    mlm.add('L0', 'banana');
    mlm.add('L1', 'cherry');
    mlm.add('L2', 'avocado', { importance: 0.8 });
  });

  it('filters by predicate', () => {
    const result = mlm.query((i) => i.content.startsWith('a'));
    expect(result.length).toBe(2);
  });

  it('limits results', () => {
    const result = mlm.query(() => true, { limit: 2 });
    expect(result.length).toBe(2);
  });

  it('scopes to specific layer', () => {
    const result = mlm.query(() => true, { layer: 'L0' });
    expect(result.length).toBe(2);
  });
});

describe('MemoryLayerManager — remove and sweep', () => {
  it('remove deletes item by id', () => {
    const mlm = new MemoryLayerManager();
    const item = mlm.add('L0', 'x');
    expect(mlm.remove(item.id)).toBe(true);
    expect(mlm.get(item.id)).toBeUndefined();
  });

  it('remove returns false for unknown id', () => {
    const mlm = new MemoryLayerManager();
    expect(mlm.remove('nope')).toBe(false);
  });

  it('sweep removes all expired items', () => {
    const mlm = new MemoryLayerManager();
    mlm.add('L0', 'a', { ttlMs: 10 });
    mlm.add('L0', 'b', { ttlMs: 5000 });
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const removed = mlm.sweep();
        expect(removed).toBe(1);
        expect(mlm.list('L0').length).toBe(1);
        resolve();
      }, 50);
    });
  });
});

describe('MemoryLayerManager — crystallization', () => {
  it('crystallize applies matching rules to L4 items', () => {
    const mlm = new MemoryLayerManager();
    const item = mlm.add('L4', 'pattern: greeting user', { importance: 0.99 });
    mlm.addCrystallizationRule({
      match: (i) => i.content.startsWith('pattern:'),
      crystallize: (i) => ({ name: 'greet-user', description: `Auto-skill: ${i.content}` }),
    });
    const results = mlm.crystallize();
    expect(results.length).toBe(1);
    expect(results[0].skill.name).toBe('greet-user');
    expect(mlm.get(item.id)!.metadata.crystallizedAs).toBeDefined();
  });

  it('crystallize returns empty when no rules match', () => {
    const mlm = new MemoryLayerManager();
    mlm.add('L4', 'unrelated');
    const results = mlm.crystallize();
    expect(results).toEqual([]);
  });
});

describe('MemoryLayerManager — stats', () => {
  it('reports per-layer count and capacity', () => {
    const mlm = new MemoryLayerManager();
    mlm.add('L0', 'a');
    mlm.add('L0', 'b');
    mlm.add('L1', 'c');
    const s = mlm.stats();
    expect(s.L0.count).toBe(2);
    expect(s.L0.capacity).toBe(100);
    expect(s.L1.count).toBe(1);
  });

  it('totalSize sums all layers', () => {
    const mlm = new MemoryLayerManager();
    mlm.add('L0', 'a');
    mlm.add('L1', 'b');
    mlm.add('L4', 'c');
    expect(mlm.totalSize()).toBe(3);
  });
});

describe('LAYER_RANK and DEFAULT_LAYER_CONFIGS — sanity', () => {
  it('LAYER_RANK has 5 entries in order', () => {
    expect(Object.keys(LAYER_RANK).length).toBe(5);
    expect(LAYER_RANK.L0).toBe(0);
    expect(LAYER_RANK.L4).toBe(4);
  });

  it('DEFAULT_LAYER_CONFIGS has 5 layers with capacities', () => {
    for (const layer of ['L0', 'L1', 'L2', 'L3', 'L4'] as MemoryLayer[]) {
      expect(DEFAULT_LAYER_CONFIGS[layer].capacity).toBeGreaterThan(0);
    }
  });
});

/**
 * FeatureStore.test.ts — Pure unit tests for feature storage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureStore } from '../FeatureStore';

describe('FeatureStore — set and get', () => {
  let fs: FeatureStore;
  beforeEach(() => {
    fs = new FeatureStore();
  });

  it('sets and gets a feature', () => {
    fs.set('user-1', 'age', 30);
    const f = fs.get('user-1', 'age');
    expect(f?.value).toBe(30);
  });

  it('auto-increments version per (entity, feature)', () => {
    fs.set('user-1', 'age', 30);
    fs.set('user-1', 'age', 31);
    fs.set('user-1', 'age', 32);
    const f = fs.get('user-1', 'age');
    expect(f?.version).toBe(3);
    expect(f?.value).toBe(32);
  });

  it('versions are independent per feature', () => {
    fs.set('user-1', 'age', 30);
    fs.set('user-1', 'name', 'Alice');
    expect(fs.get('user-1', 'age')?.version).toBe(1);
    expect(fs.get('user-1', 'name')?.version).toBe(1);
  });

  it('get returns undefined for unknown', () => {
    expect(fs.get('nope', 'x')).toBeUndefined();
  });

  it('getVersion retrieves specific version', () => {
    fs.set('user-1', 'age', 30);
    fs.set('user-1', 'age', 31);
    fs.set('user-1', 'age', 32);
    expect(fs.getVersion('user-1', 'age', 2)?.value).toBe(31);
  });

  it('getVersion returns undefined for unknown version', () => {
    fs.set('a', 'b', 1);
    expect(fs.getVersion('a', 'b', 99)).toBeUndefined();
  });
});

describe('FeatureStore — history and range', () => {
  it('getHistory returns all versions', () => {
    const fs = new FeatureStore();
    fs.set('u', 'age', 30);
    fs.set('u', 'age', 31);
    fs.set('u', 'age', 32);
    expect(fs.getHistory('u', 'age').length).toBe(3);
  });

  it('getRange filters by version range', () => {
    const fs = new FeatureStore();
    for (let i = 1; i <= 5; i++) fs.set('u', 'age', i * 10);
    const r = fs.getRange('u', 'age', 2, 4);
    expect(r.length).toBe(3);
    expect(r.map((f) => f.value)).toEqual([20, 30, 40]);
  });

  it('getAllForEntity returns latest of each feature', () => {
    const fs = new FeatureStore();
    fs.set('u', 'age', 30);
    fs.set('u', 'age', 31);
    fs.set('u', 'name', 'Alice');
    const all = fs.getAllForEntity('u');
    expect(all.age.value).toBe(31);
    expect(all.name.value).toBe('Alice');
  });
});

describe('FeatureStore — bulk operations', () => {
  it('bulkSet writes multiple features', () => {
    const fs = new FeatureStore();
    const results = fs.bulkSet([
      { entity: 'u', feature: 'age', value: 30 },
      { entity: 'u', feature: 'name', value: 'Alice' },
    ]);
    expect(results.length).toBe(2);
    expect(fs.get('u', 'age')?.value).toBe(30);
  });

  it('bulkGet retrieves multiple features', () => {
    const fs = new FeatureStore();
    fs.set('u', 'age', 30);
    fs.set('u', 'name', 'Alice');
    const results = fs.bulkGet([
      { entity: 'u', feature: 'age' },
      { entity: 'u', feature: 'name' },
      { entity: 'u', feature: 'unknown' },
    ]);
    expect(results[0]?.value).toBe(30);
    expect(results[1]?.value).toBe('Alice');
    expect(results[2]).toBeUndefined();
  });
});

describe('FeatureStore — TTL and sweep', () => {
  it('sweep removes expired features', () => {
    const fs = new FeatureStore();
    fs.set('u', 'age', 30, { ttlMs: 50 });
    fs.set('u', 'name', 'Alice');
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const removed = fs.sweep();
        expect(removed).toBe(1);
        expect(fs.get('u', 'age')).toBeUndefined();
        expect(fs.get('u', 'name')).toBeDefined();
        resolve();
      }, 80);
    });
  });

  it('sweep returns 0 when nothing expired', () => {
    const fs = new FeatureStore();
    fs.set('u', 'age', 30);
    expect(fs.sweep()).toBe(0);
  });
});

describe('FeatureStore — listKeys and listEntities', () => {
  it('listKeys returns all (entity, feature) pairs', () => {
    const fs = new FeatureStore();
    fs.set('u', 'age', 30);
    fs.set('u', 'name', 'Alice');
    fs.set('item', 'price', 100);
    const keys = fs.listKeys();
    expect(keys.length).toBe(3);
  });

  it('listEntities returns unique entities', () => {
    const fs = new FeatureStore();
    fs.set('u1', 'age', 30);
    fs.set('u2', 'age', 31);
    fs.set('item', 'price', 100);
    expect(fs.listEntities().sort()).toEqual(['item', 'u1', 'u2']);
  });
});

describe('FeatureStore — delete and stats', () => {
  it('delete removes a feature', () => {
    const fs = new FeatureStore();
    fs.set('u', 'age', 30);
    expect(fs.delete('u', 'age')).toBe(true);
    expect(fs.get('u', 'age')).toBeUndefined();
  });

  it('delete returns false for unknown', () => {
    const fs = new FeatureStore();
    expect(fs.delete('nope', 'x')).toBe(false);
  });

  it('stats reports counts', () => {
    const fs = new FeatureStore();
    fs.set('u1', 'age', 30);
    fs.set('u1', 'age', 31);
    fs.set('u2', 'age', 25);
    const s = fs.stats();
    expect(s.totalKeys).toBe(2);
    expect(s.totalEntities).toBe(2);
    expect(s.totalVersions).toBe(3);
  });
});

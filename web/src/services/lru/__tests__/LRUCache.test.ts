/**
 * LRUCache.test.ts — Pure unit tests for LRU cache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../LRUCache';

describe('LRUCache — basic get/set', () => {
  let c: LRUCache<string, number>;
  beforeEach(() => {
    c = new LRUCache<string, number>(3);
  });

  it('rejects invalid capacity', () => {
    expect(() => new LRUCache(0)).toThrow('> 0');
    expect(() => new LRUCache(-1)).toThrow('> 0');
  });

  it('sets and gets', () => {
    c.set('a', 1);
    expect(c.get('a')).toBe(1);
  });

  it('returns undefined for missing', () => {
    expect(c.get('nope')).toBeUndefined();
  });

  it('has returns true for present', () => {
    c.set('a', 1);
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
  });

  it('delete removes key', () => {
    c.set('a', 1);
    expect(c.delete('a')).toBe(true);
    expect(c.has('a')).toBe(false);
  });

  it('delete returns false for missing', () => {
    expect(c.delete('nope')).toBe(false);
  });

  it('tracks size', () => {
    c.set('a', 1);
    c.set('b', 2);
    expect(c.size()).toBe(2);
  });
});

describe('LRUCache — LRU eviction', () => {
  it('evicts LRU when over capacity', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.has('a')).toBe(false); // evicted
    expect(c.has('b')).toBe(true);
    expect(c.has('c')).toBe(true);
  });

  it('get promotes key to MRU', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.get('a'); // promotes a
    c.set('c', 3); // should evict b
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
    expect(c.has('c')).toBe(true);
  });

  it('set on existing key updates and promotes', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('a', 11); // promote a
    c.set('c', 3); // should evict b
    expect(c.get('a')).toBe(11);
    expect(c.has('b')).toBe(false);
  });

  it('counts evictions', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    c.set('d', 4);
    expect(c.stats().evictions).toBe(2);
  });
});

describe('LRUCache — resize', () => {
  it('grows capacity', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.resize(10);
    expect(c.getCapacity()).toBe(10);
  });

  it('shrinks and evicts', () => {
    const c = new LRUCache<string, number>(5);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    c.resize(2);
    expect(c.size()).toBe(2);
    expect(c.has('a')).toBe(false);
  });

  it('rejects invalid resize', () => {
    const c = new LRUCache<string, number>(2);
    expect(() => c.resize(0)).toThrow('> 0');
  });
});

describe('LRUCache — peek and iteration', () => {
  it('peekLRU returns least recently used', () => {
    const c = new LRUCache<string, number>(3);
    c.set('a', 1);
    c.set('b', 2);
    expect(c.peekLRU()).toBe('a');
  });

  it('peekMRU returns most recently used', () => {
    const c = new LRUCache<string, number>(3);
    c.set('a', 1);
    c.set('b', 2);
    expect(c.peekMRU()).toBe('b');
  });

  it('keys returns LRU first', () => {
    const c = new LRUCache<string, number>(3);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.keys()).toEqual(['a', 'b', 'c']);
  });

  it('values returns LRU first', () => {
    const c = new LRUCache<string, number>(3);
    c.set('a', 1);
    c.set('b', 2);
    expect(c.values()).toEqual([1, 2]);
  });

  it('clear removes all and resets stats', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.get('a');
    c.clear();
    expect(c.size()).toBe(0);
    expect(c.stats().hits).toBe(0);
  });
});

describe('LRUCache — stats and hit rate', () => {
  it('tracks hits and misses', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.get('a'); // hit
    c.get('nope'); // miss
    const s = c.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
  });

  it('computes hitRate', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1);
    c.get('a');
    c.get('a');
    c.get('a');
    c.get('nope');
    expect(c.stats().hitRate).toBeCloseTo(0.75, 5);
  });

  it('hitRate is 0 when no accesses', () => {
    const c = new LRUCache<string, number>(2);
    expect(c.stats().hitRate).toBe(0);
  });
});

/**
 * LRUCache.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { LRUCache } from '../LRUCache';

describe('LRUCache — basic', () => {
  it('put/get', () => {
    const c = new LRUCache<string, number>(2);
    c.put('a', 1);
    expect(c.get('a')).toBe(1);
  });

  it('get missing', () => {
    const c = new LRUCache<string, number>(2);
    expect(c.get('a')).toBeUndefined();
  });

  it('has', () => {
    const c = new LRUCache<string, number>(2);
    c.put('a', 1);
    expect(c.has('a')).toBe(true);
  });
});

describe('LRUCache — eviction', () => {
  it('evict LRU', () => {
    const c = new LRUCache<string, number>(2);
    c.put('a', 1);
    c.put('b', 2);
    c.put('c', 3); // should evict 'a'
    expect(c.has('a')).toBe(false);
    expect(c.has('b')).toBe(true);
    expect(c.has('c')).toBe(true);
  });

  it('get refreshes recency', () => {
    const c = new LRUCache<string, number>(2);
    c.put('a', 1);
    c.put('b', 2);
    c.get('a'); // 'a' now most recent
    c.put('c', 3); // should evict 'b'
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
  });

  it('update existing', () => {
    const c = new LRUCache<string, number>(2);
    c.put('a', 1);
    c.put('a', 2);
    expect(c.get('a')).toBe(2);
    expect(c.size()).toBe(1);
  });
});

describe('LRUCache — ops', () => {
  it('size', () => {
    const c = new LRUCache<string, number>(2);
    expect(c.size()).toBe(0);
    c.put('a', 1);
    expect(c.size()).toBe(1);
  });

  it('capacity', () => {
    const c = new LRUCache<string, number>(3);
    expect(c.capacity()).toBe(3);
  });

  it('keys', () => {
    const c = new LRUCache<string, number>(2);
    c.put('a', 1);
    c.put('b', 2);
    // Most recent first: 'b' then 'a'
    expect(c.keys()).toEqual(['b', 'a']);
  });
});

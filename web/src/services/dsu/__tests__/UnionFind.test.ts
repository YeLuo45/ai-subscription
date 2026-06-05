/**
 * UnionFind.test.ts — Pure unit tests for DSU
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnionFind } from '../UnionFind';

describe('UnionFind — basic', () => {
  let uf: UnionFind;
  beforeEach(() => { uf = new UnionFind(5); });

  it('starts with all separate', () => {
    expect(uf.setCount()).toBe(5);
  });

  it('find returns self for isolated', () => {
    expect(uf.find(0)).toBe(0);
    expect(uf.find(3)).toBe(3);
  });

  it('union merges two sets', () => {
    expect(uf.union(0, 1)).toBe(true);
    expect(uf.connected(0, 1)).toBe(true);
    expect(uf.setCount()).toBe(4);
  });

  it('union returns false if already connected', () => {
    uf.union(0, 1);
    expect(uf.union(0, 1)).toBe(false);
  });

  it('connected for unconnected', () => {
    expect(uf.connected(0, 1)).toBe(false);
  });
});

describe('UnionFind — chains and paths', () => {
  let uf: UnionFind;
  beforeEach(() => { uf = new UnionFind(10); });

  it('transitive connectivity', () => {
    uf.union(0, 1);
    uf.union(1, 2);
    uf.union(2, 3);
    expect(uf.connected(0, 3)).toBe(true);
  });

  it('path compression flattens', () => {
    uf.union(0, 1);
    uf.union(1, 2);
    uf.union(2, 3);
    // After find, all should point to root directly (or one level)
    const r = uf.find(0);
    expect(uf.find(3)).toBe(r);
  });

  it('getSets groups correctly', () => {
    uf.union(0, 1);
    uf.union(2, 3);
    const sets = uf.getSets();
    // 2 unioned + 6 individual = 8 sets in 10-element array
    expect(sets.length).toBe(8);
    const sizes = sets.map((s) => s.length).sort();
    expect(sizes).toEqual([1, 1, 1, 1, 1, 1, 2, 2]);
    const set01 = sets.find((s) => s.includes(0) && s.includes(1));
    expect(set01).toBeDefined();
    const set23 = sets.find((s) => s.includes(2) && s.includes(3));
    expect(set23).toBeDefined();
  });
});

describe('UnionFind — makeSet', () => {
  it('extends with more elements', () => {
    const uf = new UnionFind(3);
    uf.makeSet(2);
    expect(uf.size()).toBe(5);
    expect(uf.setCount()).toBe(5);
  });

  it('unions across makeSet calls', () => {
    const uf = new UnionFind(2);
    uf.makeSet(2);
    uf.union(0, 2);
    expect(uf.connected(0, 2)).toBe(true);
  });
});

describe('UnionFind — error cases', () => {
  it('throws on out of range', () => {
    const uf = new UnionFind(3);
    expect(() => uf.find(10)).toThrow('out of range');
    expect(() => uf.find(-1)).toThrow('out of range');
  });
});

describe('UnionFind — Kruskal application', () => {
  it('detects cycle', () => {
    const uf = new UnionFind(4);
    // Build tree edges
    uf.union(0, 1);
    uf.union(1, 2);
    uf.union(2, 3);
    // Adding edge 0-3 would create cycle
    expect(uf.connected(0, 3)).toBe(true);
  });

  it('large union-find stress', () => {
    const n = 1000;
    const uf = new UnionFind(n);
    for (let i = 0; i < n - 1; i++) {
      uf.union(i, i + 1);
    }
    expect(uf.setCount()).toBe(1);
    expect(uf.connected(0, n - 1)).toBe(true);
  });
});

/**
 * DisjointSet.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DisjointSet } from '../DisjointSet';

describe('DisjointSet — basic', () => {
  it('add', () => {
    const ds = new DisjointSet<number>();
    ds.add(1);
    ds.add(2);
    expect(ds.size()).toBe(2);
  });

  it('connected same', () => {
    const ds = new DisjointSet<number>();
    ds.add(1);
    expect(ds.connected(1, 1)).toBe(true);
  });

  it('not connected initially', () => {
    const ds = new DisjointSet<number>();
    ds.add(1);
    ds.add(2);
    expect(ds.connected(1, 2)).toBe(false);
  });
});

describe('DisjointSet — union', () => {
  it('union connects', () => {
    const ds = new DisjointSet<number>();
    ds.add(1);
    ds.add(2);
    ds.union(1, 2);
    expect(ds.connected(1, 2)).toBe(true);
  });

  it('transitive', () => {
    const ds = new DisjointSet<number>();
    [1, 2, 3, 4].forEach((x) => ds.add(x));
    ds.union(1, 2);
    ds.union(2, 3);
    expect(ds.connected(1, 3)).toBe(true);
    expect(ds.connected(1, 4)).toBe(false);
  });

  it('count', () => {
    const ds = new DisjointSet<number>();
    [1, 2, 3, 4].forEach((x) => ds.add(x));
    ds.union(1, 2);
    ds.union(3, 4);
    expect(ds.count()).toBe(2);
  });
});

describe('DisjointSet — components', () => {
  it('components', () => {
    const ds = new DisjointSet<number>();
    [1, 2, 3, 4].forEach((x) => ds.add(x));
    ds.union(1, 2);
    ds.union(3, 4);
    const comps = ds.components();
    expect(comps.length).toBe(2);
  });

  it('path compression', () => {
    const ds = new DisjointSet<number>();
    [1, 2, 3, 4].forEach((x) => ds.add(x));
    ds.union(1, 2);
    ds.union(2, 3);
    ds.union(3, 4);
    const root = ds.find(1);
    expect(ds.find(4)).toBe(root);
  });
});

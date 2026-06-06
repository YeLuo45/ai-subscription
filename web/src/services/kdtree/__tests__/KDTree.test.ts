/**
 * KDTree.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { KDTree } from '../KDTree';

describe('KDTree — basic', () => {
  it('inserts and counts', () => {
    const t = new KDTree(2);
    t.insert([1, 2], 'a');
    t.insert([3, 4], 'b');
    expect(t.size()).toBe(2);
  });
});

describe('KDTree — nearest', () => {
  it('1-NN', () => {
    const t = new KDTree(2);
    t.insert([0, 0], 'origin');
    t.insert([10, 10], 'far');
    const n = t.nearest([1, 1], 1);
    expect(n.length).toBe(1);
    expect(n[0].data).toBe('origin');
  });

  it('3-NN', () => {
    const t = new KDTree(2);
    t.insert([0, 0], 'a');
    t.insert([1, 0], 'b');
    t.insert([2, 0], 'c');
    t.insert([10, 10], 'd');
    const n = t.nearest([0, 0], 3);
    expect(n.length).toBe(3);
  });
});

describe('KDTree — queryRange', () => {
  it('range 2D', () => {
    const t = new KDTree(2);
    t.insert([0, 0]);
    t.insert([5, 5]);
    t.insert([15, 15]);
    const r = t.queryRange([0, 0], [10, 10]);
    expect(r.length).toBe(2);
  });
});

describe('KDTree — k-dimensional', () => {
  it('k=3', () => {
    const t = new KDTree(3);
    t.insert([1, 2, 3]);
    t.insert([4, 5, 6]);
    const n = t.nearest([2, 3, 4], 1);
    expect(n[0].point).toEqual([1, 2, 3]);
  });
});

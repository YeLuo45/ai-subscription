/**
 * KDTree.test.ts — Pure unit tests for 2D KD-tree
 */

import { describe, it, expect } from 'vitest';
import { KDTree, type Point2D } from '../KDTree';

describe('KDTree — build', () => {
  it('builds from points', () => {
    const t = new KDTree([[1, 1], [2, 2], [3, 3]]);
    expect(t.size()).toBe(3);
  });

  it('handles empty', () => {
    const t = new KDTree();
    expect(t.size()).toBe(0);
    expect(t.nearest([0, 0], 1)).toEqual([]);
  });
});

describe('KDTree — nearest', () => {
  const t = new KDTree([[1, 1], [2, 2], [3, 3], [10, 10], [11, 11]]);

  it('finds single nearest', () => {
    const r = t.nearest([2.1, 2.1], 1);
    expect(r[0].point).toEqual([2, 2]);
  });

  it('finds k nearest', () => {
    const r = t.nearest([2.5, 2.5], 3);
    expect(r.length).toBe(3);
    // 2 nearest are equidistant so check both are in top
    const ids = r.slice(0, 2).map((x) => x.point[0]).sort();
    expect(ids).toEqual([2, 3]);
  });

  it('k larger than n returns all', () => {
    const r = t.nearest([0, 0], 100);
    expect(r.length).toBe(5);
  });

  it('returns distances', () => {
    const r = t.nearest([1, 1], 1);
    expect(r[0].distance).toBe(0);
  });
});

describe('KDTree — radius search', () => {
  const t = new KDTree([[1, 1], [2, 2], [5, 5], [10, 10]]);

  it('finds within radius', () => {
    const r = t.radiusSearch([0, 0], 3);
    expect(r.length).toBe(2);
  });

  it('empty result for too-small radius', () => {
    const r = t.radiusSearch([0, 0], 0.5);
    expect(r.length).toBe(0);
  });
});

describe('KDTree — distance', () => {
  it('static distance', () => {
    expect(KDTree.distance([0, 0], [3, 4])).toBe(25);
  });
});

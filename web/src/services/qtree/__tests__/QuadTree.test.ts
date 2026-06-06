/**
 * QuadTree.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { QuadTree } from '../QuadTree';
import { BoundingBox } from '../../bbox/BoundingBox';

const p = (x: number, y: number) => ({ x, y });

describe('QuadTree — basic', () => {
  it('inserts and counts', () => {
    const qt = new QuadTree(new BoundingBox(0, 0, 100, 100), 4);
    qt.insert(p(10, 10), 'a');
    qt.insert(p(20, 20), 'b');
    expect(qt.count()).toBe(2);
  });

  it('rejects out of bounds', () => {
    const qt = new QuadTree(new BoundingBox(0, 0, 100, 100), 4);
    expect(qt.insert(p(200, 200))).toBe(false);
  });
});

describe('QuadTree — subdivision', () => {
  it('splits when capacity exceeded', () => {
    const qt = new QuadTree(new BoundingBox(0, 0, 100, 100), 2);
    qt.insert(p(10, 10));
    qt.insert(p(80, 10));
    qt.insert(p(10, 80));
    qt.insert(p(80, 80));
    qt.insert(p(50, 50));
    expect(qt.count()).toBe(5);
  });

  it('depth grows with splits', () => {
    const qt = new QuadTree(new BoundingBox(0, 0, 100, 100), 1);
    qt.insert(p(10, 10));
    qt.insert(p(80, 10));
    expect(qt.depth()).toBeGreaterThan(0);
  });
});

describe('QuadTree — query', () => {
  it('range query', () => {
    const qt = new QuadTree(new BoundingBox(0, 0, 100, 100), 2);
    qt.insert(p(10, 10), 'a');
    qt.insert(p(90, 90), 'b');
    qt.insert(p(50, 50), 'c');
    const found = qt.queryRange(new BoundingBox(0, 0, 30, 30));
    expect(found.length).toBe(1);
    expect(found[0].data).toBe('a');
  });

  it('empty range', () => {
    const qt = new QuadTree(new BoundingBox(0, 0, 100, 100), 4);
    qt.insert(p(10, 10));
    const found = qt.queryRange(new BoundingBox(200, 200, 300, 300));
    expect(found.length).toBe(0);
  });
});

describe('QuadTree — nearest', () => {
  it('nearest within radius', () => {
    const qt = new QuadTree(new BoundingBox(0, 0, 100, 100), 4);
    qt.insert(p(10, 10), 'a');
    qt.insert(p(50, 50), 'b');
    const n = qt.queryNearest(p(15, 15), 20);
    expect(n?.data).toBe('a');
  });

  it('no result out of range', () => {
    const qt = new QuadTree(new BoundingBox(0, 0, 100, 100), 4);
    qt.insert(p(10, 10));
    const n = qt.queryNearest(p(50, 50), 5);
    expect(n).toBe(null);
  });
});

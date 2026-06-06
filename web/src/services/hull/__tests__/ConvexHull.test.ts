/**
 * ConvexHull.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ConvexHull } from '../ConvexHull';

const p = (x: number, y: number) => ({ x, y });

describe('ConvexHull — basic', () => {
  it('empty', () => {
    expect(ConvexHull.compute([])).toEqual([]);
  });

  it('single point', () => {
    expect(ConvexHull.compute([p(0, 0)])).toEqual([p(0, 0)]);
  });

  it('two points', () => {
    expect(ConvexHull.compute([p(0, 0), p(1, 1)])).toEqual([p(0, 0), p(1, 1)]);
  });

  it('square', () => {
    const sq = ConvexHull.compute([p(0, 0), p(1, 0), p(1, 1), p(0, 1)]);
    expect(sq.length).toBe(4);
  });
});

describe('ConvexHull — with interior points', () => {
  it('removes interior', () => {
    const pts = [p(0, 0), p(5, 0), p(5, 5), p(0, 5), p(2, 2), p(3, 1)];
    const h = ConvexHull.compute(pts);
    expect(h.length).toBe(4);
  });

  it('triangle with center', () => {
    const pts = [p(0, 0), p(4, 0), p(2, 4), p(2, 1)];
    const h = ConvexHull.compute(pts);
    expect(h.length).toBe(3);
  });
});

describe('ConvexHull — area/perimeter', () => {
  it('area square', () => {
    const h = ConvexHull.compute([p(0, 0), p(2, 0), p(2, 2), p(0, 2)]);
    expect(ConvexHull.area(h)).toBe(4);
  });

  it('perimeter square', () => {
    const h = ConvexHull.compute([p(0, 0), p(2, 0), p(2, 2), p(0, 2)]);
    expect(ConvexHull.perimeter(h)).toBe(8);
  });
});

describe('ConvexHull — contains', () => {
  const h = ConvexHull.compute([p(0, 0), p(4, 0), p(4, 4), p(0, 4)]);

  it('inside', () => {
    expect(ConvexHull.contains(h, p(2, 2))).toBe(true);
  });

  it('outside', () => {
    expect(ConvexHull.contains(h, p(5, 2))).toBe(false);
  });
});

describe('ConvexHull — degenerate', () => {
  it('collinear', () => {
    const h = ConvexHull.compute([p(0, 0), p(1, 0), p(2, 0)]);
    // Collinear: hull has only endpoints
    expect(h.length).toBe(2);
  });
});

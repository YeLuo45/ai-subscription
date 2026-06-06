/**
 * BoundingBox.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BoundingBox } from '../BoundingBox';

describe('BoundingBox — basic', () => {
  it('throws on invalid', () => {
    expect(() => new BoundingBox(10, 10, 5, 5)).toThrow();
  });

  it('width/height', () => {
    const b = new BoundingBox(0, 0, 10, 5);
    expect(b.width).toBe(10);
    expect(b.height).toBe(5);
  });

  it('area/perimeter', () => {
    const b = new BoundingBox(0, 0, 10, 5);
    expect(b.area).toBe(50);
    expect(b.perimeter).toBe(30);
  });

  it('center', () => {
    const b = new BoundingBox(0, 0, 10, 20);
    expect(b.center).toEqual({ x: 5, y: 10 });
  });
});

describe('BoundingBox — fromPoints', () => {
  it('empty array', () => {
    const b = BoundingBox.fromPoints([]);
    expect(b.area).toBe(0);
  });

  it('points', () => {
    const b = BoundingBox.fromPoints([{ x: 1, y: 2 }, { x: 5, y: 8 }, { x: 3, y: 4 }]);
    expect(b.minX).toBe(1);
    expect(b.maxX).toBe(5);
  });
});

describe('BoundingBox — operations', () => {
  const a = new BoundingBox(0, 0, 10, 10);
  const b = new BoundingBox(5, 5, 15, 15);

  it('contains point', () => {
    expect(a.contains({ x: 5, y: 5 })).toBe(true);
    expect(a.contains({ x: 11, y: 5 })).toBe(false);
  });

  it('contains box', () => {
    expect(a.containsBox(new BoundingBox(2, 2, 5, 5))).toBe(true);
  });

  it('overlaps', () => {
    expect(a.overlaps(b)).toBe(true);
  });

  it('not overlaps', () => {
    expect(a.overlaps(new BoundingBox(20, 20, 30, 30))).toBe(false);
  });

  it('union', () => {
    const u = a.union(b);
    expect(u.minX).toBe(0);
    expect(u.maxX).toBe(15);
  });

  it('intersection', () => {
    const i = a.intersection(b);
    expect(i?.minX).toBe(5);
  });

  it('intersection disjoint', () => {
    const i = a.intersection(new BoundingBox(20, 20, 30, 30));
    expect(i).toBe(null);
  });
});

describe('BoundingBox — transform', () => {
  const a = new BoundingBox(0, 0, 10, 10);

  it('expand', () => {
    const e = a.expand(2);
    expect(e.minX).toBe(-2);
    expect(e.maxX).toBe(12);
  });

  it('scale', () => {
    const s = a.scale(2);
    expect(s.width).toBe(20);
  });

  it('translate', () => {
    const t = a.translate(5, 3);
    expect(t.minX).toBe(5);
    expect(t.minY).toBe(3);
  });
});

describe('BoundingBox — corners/isEmpty', () => {
  it('corners', () => {
    const b = new BoundingBox(0, 0, 10, 10);
    expect(b.corners.length).toBe(4);
  });

  it('isEmpty', () => {
    const b = new BoundingBox(5, 5, 5, 5);
    expect(b.isEmpty).toBe(true);
  });
});

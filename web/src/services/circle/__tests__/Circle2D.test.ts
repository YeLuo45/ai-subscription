/**
 * Circle2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Circle2D } from '../Circle2D';

const p = (x: number, y: number) => ({ x, y });

describe('Circle2D — basic', () => {
  it('throws on negative radius', () => {
    expect(() => new Circle2D(p(0, 0), -1)).toThrow();
  });

  it('area', () => {
    expect(new Circle2D(p(0, 0), 2).area()).toBeCloseTo(Math.PI * 4, 5);
  });

  it('circumference', () => {
    expect(new Circle2D(p(0, 0), 1).circumference()).toBeCloseTo(2 * Math.PI, 5);
  });

  it('diameter', () => {
    expect(new Circle2D(p(0, 0), 5).diameter()).toBe(10);
  });
});

describe('Circle2D — contains', () => {
  const c = new Circle2D(p(0, 0), 5);

  it('inside', () => {
    expect(c.contains(p(3, 0))).toBe(true);
  });

  it('on edge', () => {
    expect(c.contains(p(5, 0))).toBe(true);
  });

  it('outside', () => {
    expect(c.contains(p(6, 0))).toBe(false);
  });
});

describe('Circle2D — distance/bounds', () => {
  it('distanceFromPoint', () => {
    const c = new Circle2D(p(0, 0), 5);
    expect(c.distanceFromPoint(p(8, 0))).toBe(3);
  });

  it('distanceFromPoint inside', () => {
    const c = new Circle2D(p(0, 0), 5);
    expect(c.distanceFromPoint(p(2, 0))).toBe(-3);
  });

  it('bounds', () => {
    const c = new Circle2D(p(0, 0), 5);
    expect(c.bounds().minX).toBe(-5);
    expect(c.bounds().maxX).toBe(5);
  });
});

describe('Circle2D — pointAt', () => {
  it('angle 0', () => {
    const c = new Circle2D(p(0, 0), 1);
    expect(c.pointAt(0)).toEqual(p(1, 0));
  });

  it('angle PI/2', () => {
    const c = new Circle2D(p(0, 0), 1);
    const pt = c.pointAt(Math.PI / 2);
    expect(pt.x).toBeCloseTo(0, 5);
    expect(pt.y).toBeCloseTo(1, 5);
  });
});

describe('Circle2D — intersect', () => {
  it('two points', () => {
    const a = new Circle2D(p(0, 0), 5);
    const b = new Circle2D(p(5, 0), 5);
    const pts = a.intersect(b);
    expect(pts.length).toBe(2);
  });

  it('no intersection', () => {
    const a = new Circle2D(p(0, 0), 1);
    const b = new Circle2D(p(10, 0), 1);
    expect(a.intersect(b).length).toBe(0);
  });

  it('tangent', () => {
    const a = new Circle2D(p(0, 0), 5);
    const b = new Circle2D(p(10, 0), 5);
    const pts = a.intersect(b);
    expect(pts.length).toBe(1);
  });
});

describe('Circle2D — relationships', () => {
  it('overlaps', () => {
    const a = new Circle2D(p(0, 0), 5);
    const b = new Circle2D(p(5, 0), 5);
    expect(a.overlaps(b)).toBe(true);
  });

  it('isContainedIn', () => {
    const a = new Circle2D(p(0, 0), 2);
    const b = new Circle2D(p(0, 0), 5);
    expect(a.isContainedIn(b)).toBe(true);
  });
});

describe('Circle2D — toPolygon', () => {
  it('32 segments', () => {
    const c = new Circle2D(p(0, 0), 1);
    const poly = c.toPolygon(32);
    expect(poly.length).toBe(32);
  });
});

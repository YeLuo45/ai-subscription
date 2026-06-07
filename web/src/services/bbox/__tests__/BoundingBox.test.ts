/**
 * BoundingBox.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BoundingBox } from '../BoundingBox';

describe('BoundingBox — basic', () => {
  it('fromPoints', () => {
    const b = BoundingBox.fromPoints(10, 20, 50, 80);
    expect(b.x).toBe(10);
    expect(b.y).toBe(20);
    expect(b.width).toBe(40);
    expect(b.height).toBe(60);
  });

  it('fromPoints reverse', () => {
    const b = BoundingBox.fromPoints(50, 80, 10, 20);
    expect(b.x).toBe(10);
  });

  it('fromPointsList', () => {
    const b = BoundingBox.fromPointsList([[0, 0], [10, 5], [5, 20], [-3, 8]]);
    expect(b.x).toBe(-3);
    expect(b.y).toBe(0);
    expect(b.width).toBe(13);
    expect(b.height).toBe(20);
  });

  it('empty', () => {
    const b = BoundingBox.fromPointsList([]);
    expect(b.width).toBe(0);
  });
});

describe('BoundingBox — intersect', () => {
  it('intersect', () => {
    const a = BoundingBox.fromPoints(0, 0, 10, 10);
    const b = BoundingBox.fromPoints(5, 5, 15, 15);
    expect(BoundingBox.intersects(a, b)).toBe(true);
  });

  it('no intersect', () => {
    const a = BoundingBox.fromPoints(0, 0, 10, 10);
    const b = BoundingBox.fromPoints(20, 20, 30, 30);
    expect(BoundingBox.intersects(a, b)).toBe(false);
  });

  it('touching', () => {
    const a = BoundingBox.fromPoints(0, 0, 10, 10);
    const b = BoundingBox.fromPoints(10, 0, 20, 10);
    // boxes that share an edge technically intersect at the edge
    expect(BoundingBox.intersects(a, b)).toBe(true);
  });
});

describe('BoundingBox — union/intersection', () => {
  it('union', () => {
    const a = BoundingBox.fromPoints(0, 0, 10, 10);
    const b = BoundingBox.fromPoints(5, 5, 15, 15);
    const u = BoundingBox.union(a, b);
    expect(u.x).toBe(0);
    expect(u.width).toBe(15);
  });

  it('intersection', () => {
    const a = BoundingBox.fromPoints(0, 0, 10, 10);
    const b = BoundingBox.fromPoints(5, 5, 15, 15);
    const i = BoundingBox.intersection(a, b);
    expect(i).not.toBeNull();
    expect(i!.x).toBe(5);
    expect(i!.width).toBe(5);
  });

  it('intersection empty', () => {
    const a = BoundingBox.fromPoints(0, 0, 5, 5);
    const b = BoundingBox.fromPoints(10, 10, 15, 15);
    expect(BoundingBox.intersection(a, b)).toBeNull();
  });
});

describe('BoundingBox — contains', () => {
  it('inside', () => {
    const b = BoundingBox.fromPoints(0, 0, 10, 10);
    expect(BoundingBox.contains(b, 5, 5)).toBe(true);
  });

  it('outside', () => {
    const b = BoundingBox.fromPoints(0, 0, 10, 10);
    expect(BoundingBox.contains(b, 15, 5)).toBe(false);
  });

  it('edge', () => {
    const b = BoundingBox.fromPoints(0, 0, 10, 10);
    expect(BoundingBox.contains(b, 10, 10)).toBe(true);
  });
});

describe('BoundingBox — metrics', () => {
  it('area', () => {
    const b = BoundingBox.fromPoints(0, 0, 10, 5);
    expect(BoundingBox.area(b)).toBe(50);
  });

  it('perimeter', () => {
    const b = BoundingBox.fromPoints(0, 0, 10, 5);
    expect(BoundingBox.perimeter(b)).toBe(30);
  });

  it('center', () => {
    const b = BoundingBox.fromPoints(0, 0, 10, 10);
    const c = BoundingBox.center(b);
    expect(c.x).toBe(5);
    expect(c.y).toBe(5);
  });

  it('isEmpty', () => {
    const b = BoundingBox.fromPoints(5, 5, 5, 5);
    expect(BoundingBox.isEmpty(b)).toBe(true);
  });
});

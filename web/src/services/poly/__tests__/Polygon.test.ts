/**
 * Polygon.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Polygon } from '../Polygon';

const p = (x: number, y: number) => ({ x, y });

describe('Polygon — basic', () => {
  it('size', () => {
    const poly = new Polygon([p(0, 0), p(1, 0), p(0, 1)]);
    expect(poly.size).toBe(3);
  });

  it('area square', () => {
    const poly = new Polygon([p(0, 0), p(2, 0), p(2, 2), p(0, 2)]);
    expect(poly.area()).toBe(4);
  });

  it('perimeter', () => {
    const poly = new Polygon([p(0, 0), p(3, 0), p(3, 4)]);
    expect(poly.perimeter()).toBe(12);
  });
});

describe('Polygon — contains', () => {
  const square = new Polygon([p(0, 0), p(10, 0), p(10, 10), p(0, 10)]);

  it('inside', () => {
    expect(square.contains(p(5, 5))).toBe(true);
  });

  it('outside', () => {
    expect(square.contains(p(15, 5))).toBe(false);
  });

  it('outside far', () => {
    expect(square.contains(p(-5, 5))).toBe(false);
  });
});

describe('Polygon — properties', () => {
  it('isConvex square', () => {
    const square = new Polygon([p(0, 0), p(10, 0), p(10, 10), p(0, 10)]);
    expect(square.isConvex()).toBe(true);
  });

  it('isConvex L-shape (concave)', () => {
    const l = new Polygon([p(0, 0), p(10, 0), p(10, 5), p(5, 5), p(5, 10), p(0, 10)]);
    expect(l.isConvex()).toBe(false);
  });

  it('centroid', () => {
    const sq = new Polygon([p(0, 0), p(2, 0), p(2, 2), p(0, 2)]);
    expect(sq.centroid().x).toBe(1);
    expect(sq.centroid().y).toBe(1);
  });

  it('bounds', () => {
    const sq = new Polygon([p(1, 1), p(5, 1), p(5, 5), p(1, 5)]);
    const b = sq.bounds();
    expect(b.minX).toBe(1);
    expect(b.maxX).toBe(5);
  });
});

describe('Polygon — operations', () => {
  it('reverse', () => {
    const a = new Polygon([p(0, 0), p(1, 0), p(0, 1)]);
    const r = a.reverse();
    expect(r.getPoints()[0]).toEqual(p(0, 1));
  });

  it('add point', () => {
    const a = new Polygon([p(0, 0)]);
    const b = a.add(p(1, 0));
    expect(b.size).toBe(2);
  });

  it('translate', () => {
    const a = new Polygon([p(0, 0), p(1, 0)]);
    const t = a.translate(5, 3);
    expect(t.getPoints()[0].x).toBe(5);
  });
});

describe('Polygon — simplify', () => {
  it('removes collinear points', () => {
    const pts = [p(0, 0), p(1, 0), p(2, 0), p(3, 0), p(3, 1)];
    const s = new Polygon(pts).simplify(0.1);
    expect(s.size).toBeLessThan(5);
  });
});

describe('Polygon — regular', () => {
  it('hexagon', () => {
    const hex = Polygon.regular(6, 1);
    expect(hex.size).toBe(6);
  });

  it('triangle', () => {
    const tri = Polygon.regular(3, 1);
    expect(tri.size).toBe(3);
  });
});

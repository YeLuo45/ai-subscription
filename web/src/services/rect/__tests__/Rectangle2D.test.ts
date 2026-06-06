/**
 * Rectangle2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Rectangle2D } from '../Rectangle2D';

const p = (x: number, y: number) => ({ x, y });

describe('Rectangle2D — basic', () => {
  it('area/perimeter', () => {
    const r = new Rectangle2D(0, 0, 4, 3);
    expect(r.area()).toBe(12);
    expect(r.perimeter()).toBe(14);
  });

  it('minX/maxX', () => {
    const r = new Rectangle2D(0, 0, 10, 5);
    expect(r.minX).toBe(0);
    expect(r.maxX).toBe(10);
  });

  it('center', () => {
    expect(new Rectangle2D(0, 0, 10, 10).center).toEqual(p(5, 5));
  });
});

describe('Rectangle2D — contains/intersects', () => {
  const r = new Rectangle2D(0, 0, 10, 10);

  it('inside', () => {
    expect(r.contains(p(5, 5))).toBe(true);
  });

  it('outside', () => {
    expect(r.contains(p(15, 5))).toBe(false);
  });

  it('intersects', () => {
    const a = new Rectangle2D(0, 0, 10, 10);
    const b = new Rectangle2D(5, 5, 10, 10);
    expect(a.intersects(b)).toBe(true);
  });

  it('no intersects', () => {
    const a = new Rectangle2D(0, 0, 5, 5);
    const b = new Rectangle2D(10, 10, 5, 5);
    expect(a.intersects(b)).toBe(false);
  });
});

describe('Rectangle2D — intersection/union', () => {
  it('intersection', () => {
    const a = new Rectangle2D(0, 0, 10, 10);
    const b = new Rectangle2D(5, 5, 10, 10);
    const i = a.intersection(b)!;
    expect(i.x).toBe(5);
    expect(i.width).toBe(5);
  });

  it('intersection disjoint null', () => {
    const a = new Rectangle2D(0, 0, 5, 5);
    const b = new Rectangle2D(20, 20, 5, 5);
    expect(a.intersection(b)).toBe(null);
  });

  it('union', () => {
    const a = new Rectangle2D(0, 0, 10, 10);
    const b = new Rectangle2D(5, 5, 10, 10);
    const u = a.union(b);
    expect(u.x).toBe(0);
    expect(u.maxX).toBe(15);
  });
});

describe('Rectangle2D — transform', () => {
  it('translate', () => {
    const r = new Rectangle2D(0, 0, 10, 10);
    const t = r.translate(5, 3);
    expect(t.x).toBe(5);
  });

  it('scale', () => {
    const r = new Rectangle2D(0, 0, 10, 10);
    const s = r.scale(2);
    expect(s.width).toBe(20);
  });
});

describe('Rectangle2D — corners/properties', () => {
  it('corners 4', () => {
    expect(new Rectangle2D(0, 0, 10, 10).corners().length).toBe(4);
  });

  it('isEmpty', () => {
    expect(new Rectangle2D(0, 0, 0, 10).isEmpty).toBe(true);
  });

  it('isSquare', () => {
    expect(new Rectangle2D(0, 0, 5, 5).isSquare).toBe(true);
    expect(new Rectangle2D(0, 0, 5, 6).isSquare).toBe(false);
  });
});

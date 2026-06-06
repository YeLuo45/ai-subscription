/**
 * Ellipse2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Ellipse2D } from '../Ellipse2D';

const p = (x: number, y: number) => ({ x, y });

describe('Ellipse2D — basic', () => {
  it('throws on negative', () => {
    expect(() => new Ellipse2D(p(0, 0), -1, 1)).toThrow();
  });

  it('area', () => {
    expect(new Ellipse2D(p(0, 0), 2, 3).area()).toBeCloseTo(Math.PI * 6, 5);
  });

  it('perimeter circle = 2πr', () => {
    expect(new Ellipse2D(p(0, 0), 5, 5).perimeter()).toBeCloseTo(2 * Math.PI * 5, 3);
  });
});

describe('Ellipse2D — contains', () => {
  const e = new Ellipse2D(p(0, 0), 5, 3);

  it('inside', () => {
    expect(e.contains(p(0, 0))).toBe(true);
  });

  it('outside', () => {
    expect(e.contains(p(6, 0))).toBe(false);
  });

  it('on edge', () => {
    expect(e.contains(p(5, 0))).toBe(true);
  });
});

describe('Ellipse2D — properties', () => {
  it('isCircle', () => {
    expect(new Ellipse2D(p(0, 0), 5, 5).isCircle()).toBe(true);
  });

  it('eccentricity 0 for circle', () => {
    expect(new Ellipse2D(p(0, 0), 5, 5).eccentricity()).toBe(0);
  });

  it('eccentricity for ellipse', () => {
    const e = new Ellipse2D(p(0, 0), 5, 3);
    expect(e.eccentricity()).toBeGreaterThan(0);
  });
});

describe('Ellipse2D — pointAt', () => {
  it('angle 0', () => {
    const e = new Ellipse2D(p(0, 0), 5, 3);
    expect(e.pointAt(0)).toEqual(p(5, 0));
  });

  it('angle PI/2', () => {
    const e = new Ellipse2D(p(0, 0), 5, 3);
    const pt = e.pointAt(Math.PI / 2);
    expect(pt.x).toBeCloseTo(0, 5);
    expect(pt.y).toBeCloseTo(3, 5);
  });
});

describe('Ellipse2D — bounds', () => {
  it('axis-aligned bounds', () => {
    const e = new Ellipse2D(p(0, 0), 5, 3);
    const b = e.bounds();
    expect(b.minX).toBe(-5);
    expect(b.minY).toBe(-3);
  });
});

describe('Ellipse2D — toPolygon', () => {
  it('32 segments', () => {
    const e = new Ellipse2D(p(0, 0), 5, 3);
    expect(e.toPolygon(32).length).toBe(32);
  });
});

/**
 * Geometry2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Geometry2D } from '../Geometry2D';

const p = (x: number, y: number) => ({ x, y });

describe('Geometry2D — distance', () => {
  it('distance', () => {
    expect(Geometry2D.distance(p(0, 0), p(3, 4))).toBe(5);
  });

  it('distanceSq', () => {
    expect(Geometry2D.distanceSq(p(0, 0), p(3, 4))).toBe(25);
  });

  it('manhattan', () => {
    expect(Geometry2D.manhattan(p(0, 0), p(3, 4))).toBe(7);
  });
});

describe('Geometry2D — angles', () => {
  it('angle right', () => {
    expect(Geometry2D.angle(p(0, 0), p(1, 0))).toBeCloseTo(0, 5);
  });

  it('angle up', () => {
    expect(Geometry2D.angle(p(0, 0), p(0, 1))).toBeCloseTo(Math.PI / 2, 5);
  });

  it('angleDeg', () => {
    expect(Geometry2D.angleDeg(p(0, 0), p(0, 1))).toBeCloseTo(90, 5);
  });

  it('angleBetween', () => {
    expect(Geometry2D.angleBetween(p(1, 0), p(0, 1))).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('Geometry2D — area', () => {
  it('triangle area', () => {
    expect(Geometry2D.triangleArea(p(0, 0), p(4, 0), p(0, 3))).toBe(6);
  });

  it('polygon area square', () => {
    expect(Geometry2D.polygonArea([p(0, 0), p(2, 0), p(2, 2), p(0, 2)])).toBe(4);
  });
});

describe('Geometry2D — centroid', () => {
  it('centroid', () => {
    const c = Geometry2D.centroid([p(0, 0), p(2, 0), p(0, 2)]);
    expect(c.x).toBeCloseTo(2 / 3, 5);
  });
});

describe('Geometry2D — transform', () => {
  it('rotate 90deg', () => {
    const r = Geometry2D.rotate(p(1, 0), Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(1, 5);
  });

  it('rotateAround', () => {
    const r = Geometry2D.rotateAround(p(2, 0), p(0, 0), Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 5);
  });

  it('lerp', () => {
    expect(Geometry2D.lerp(p(0, 0), p(10, 0), 0.5)).toEqual(p(5, 0));
  });
});

describe('Geometry2D — intersection/distance', () => {
  it('lineIntersect', () => {
    const i = Geometry2D.lineIntersect(p(0, 0), p(2, 2), p(2, 0), p(0, 2));
    expect(i).not.toBe(null);
    expect(i!.x).toBeCloseTo(1, 5);
  });

  it('lineIntersect parallel', () => {
    const i = Geometry2D.lineIntersect(p(0, 0), p(1, 0), p(0, 1), p(1, 1));
    expect(i).toBe(null);
  });

  it('pointToSegment', () => {
    expect(Geometry2D.pointToSegment(p(1, 1), p(0, 0), p(2, 0))).toBeCloseTo(1, 5);
  });
});

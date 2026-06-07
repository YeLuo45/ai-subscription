/**
 * Geometry2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Geometry2D } from '../Geometry2D';

describe('Geometry2D — basic', () => {
  it('distance', () => {
    expect(Geometry2D.distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('triangleArea', () => {
    expect(Geometry2D.triangleArea({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 })).toBe(6);
  });

  it('polygonArea square', () => {
    expect(Geometry2D.polygonArea([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }])).toBe(16);
  });

  it('polygonPerimeter', () => {
    expect(Geometry2D.polygonPerimeter([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }])).toBe(12);
  });
});

describe('Geometry2D — circle', () => {
  it('area', () => {
    expect(Geometry2D.circleArea({ cx: 0, cy: 0, r: 1 })).toBeCloseTo(Math.PI, 5);
  });

  it('circumference', () => {
    expect(Geometry2D.circleCircumference({ cx: 0, cy: 0, r: 1 })).toBeCloseTo(2 * Math.PI, 5);
  });

  it('pointInCircle', () => {
    expect(Geometry2D.pointInCircle({ x: 0, y: 0 }, { cx: 0, cy: 0, r: 1 })).toBe(true);
    expect(Geometry2D.pointInCircle({ x: 2, y: 0 }, { cx: 0, cy: 0, r: 1 })).toBe(false);
  });

  it('circlesIntersect', () => {
    expect(Geometry2D.circlesIntersect({ cx: 0, cy: 0, r: 2 }, { cx: 3, cy: 0, r: 2 })).toBe(true);
    expect(Geometry2D.circlesIntersect({ cx: 0, cy: 0, r: 1 }, { cx: 5, cy: 0, r: 1 })).toBe(false);
  });
});

describe('Geometry2D — line', () => {
  it('lineLength', () => {
    expect(Geometry2D.lineLength({ ax: 0, ay: 0, bx: 3, by: 4 })).toBe(5);
  });

  it('pointOnSegment middle', () => {
    const p = Geometry2D.pointOnSegment({ x: 2, y: 2 }, { ax: 0, ay: 0, bx: 4, by: 4 });
    expect(p.x).toBe(2);
    expect(p.y).toBe(2);
  });
});

describe('Geometry2D — polygon', () => {
  it('isConvex square', () => {
    expect(Geometry2D.isConvex([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }])).toBe(true);
  });

  it('isConvex concave', () => {
    expect(Geometry2D.isConvex([{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }])).toBe(false);
  });
});

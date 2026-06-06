/**
 * Vector3D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Vector3D } from '../Vector3D';

const v = (x: number, y: number, z: number) => new Vector3D(x, y, z);

describe('Vector3D — basic', () => {
  it('zero', () => {
    expect(Vector3D.zero().x).toBe(0);
  });

  it('up', () => {
    expect(Vector3D.up().y).toBe(1);
  });
});

describe('Vector3D — arithmetic', () => {
  it('add', () => {
    expect(v(1, 2, 3).add(v(4, 5, 6))).toEqual(v(5, 7, 9));
  });

  it('sub', () => {
    expect(v(4, 5, 6).sub(v(1, 2, 3))).toEqual(v(3, 3, 3));
  });

  it('scale', () => {
    expect(v(1, 2, 3).scale(2)).toEqual(v(2, 4, 6));
  });

  it('multiply', () => {
    expect(v(1, 2, 3).multiply(v(2, 3, 4))).toEqual(v(2, 6, 12));
  });

  it('negate', () => {
    expect(v(1, 2, 3).negate()).toEqual(v(-1, -2, -3));
  });
});

describe('Vector3D — operations', () => {
  it('dot', () => {
    expect(v(1, 2, 3).dot(v(4, 5, 6))).toBe(32);
  });

  it('cross x y = z', () => {
    expect(v(1, 0, 0).cross(v(0, 1, 0))).toEqual(v(0, 0, 1));
  });

  it('magnitude', () => {
    expect(v(1, 2, 2).magnitude()).toBe(3);
  });

  it('magnitudeSq', () => {
    expect(v(1, 2, 2).magnitudeSq()).toBe(9);
  });

  it('normalize', () => {
    expect(v(3, 0, 0).normalize().x).toBeCloseTo(1, 5);
  });

  it('normalize zero', () => {
    expect(Vector3D.zero().normalize()).toEqual(v(0, 0, 0));
  });

  it('limit', () => {
    const l = v(10, 0, 0).limit(5);
    expect(l.x).toBeCloseTo(5, 5);
  });

  it('distance', () => {
    expect(v(0, 0, 0).distance(v(1, 2, 2))).toBe(3);
  });

  it('distanceSq', () => {
    expect(v(0, 0, 0).distanceSq(v(1, 2, 2))).toBe(9);
  });
});

describe('Vector3D — transform', () => {
  it('lerp', () => {
    expect(v(0, 0, 0).lerp(v(10, 0, 0), 0.5)).toEqual(v(5, 0, 0));
  });

  it('project', () => {
    const p = v(3, 0, 0).project(v(1, 0, 0));
    expect(p.x).toBeCloseTo(3, 5);
  });

  it('reflect', () => {
    const r = v(1, 0, 0).reflect(v(1, 0, 0));
    expect(r.x).toBeCloseTo(-1, 5);
  });

  it('angle', () => {
    expect(v(1, 0, 0).angle(v(0, 1, 0))).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('Vector3D — utility', () => {
  it('toArray', () => {
    expect(v(1, 2, 3).toArray()).toEqual([1, 2, 3]);
  });
});

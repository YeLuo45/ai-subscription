/**
 * Vector2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Vector2D } from '../Vector2D';

const v = (x: number, y: number) => new Vector2D(x, y);

describe('Vector2D — basic', () => {
  it('zero', () => {
    const z = Vector2D.zero();
    expect(z.x).toBe(0);
    expect(z.y).toBe(0);
  });

  it('fromAngle', () => {
    const u = Vector2D.fromAngle(0);
    expect(u.x).toBeCloseTo(1, 5);
    expect(u.y).toBeCloseTo(0, 5);
  });
});

describe('Vector2D — arithmetic', () => {
  it('add', () => {
    expect(v(1, 2).add(v(3, 4))).toEqual(v(4, 6));
  });

  it('sub', () => {
    expect(v(3, 4).sub(v(1, 2))).toEqual(v(2, 2));
  });

  it('scale', () => {
    expect(v(1, 2).scale(3)).toEqual(v(3, 6));
  });

  it('negate', () => {
    expect(v(1, 2).negate()).toEqual(v(-1, -2));
  });

  it('divide', () => {
    expect(v(4, 6).divide(2)).toEqual(v(2, 3));
  });
});

describe('Vector2D — operations', () => {
  it('dot', () => {
    expect(v(1, 2).dot(v(3, 4))).toBe(11);
  });

  it('cross', () => {
    expect(v(1, 0).cross(v(0, 1))).toBe(1);
  });

  it('magnitude', () => {
    expect(v(3, 4).magnitude()).toBe(5);
  });

  it('magnitudeSq', () => {
    expect(v(3, 4).magnitudeSq()).toBe(25);
  });

  it('normalize', () => {
    const n = v(3, 4).normalize();
    expect(n.magnitude()).toBeCloseTo(1, 5);
  });

  it('normalize zero', () => {
    expect(v(0, 0).normalize()).toEqual(v(0, 0));
  });

  it('limit', () => {
    const l = v(10, 0).limit(5);
    expect(l.magnitude()).toBeCloseTo(5, 5);
  });

  it('angle', () => {
    expect(v(1, 0).angle()).toBeCloseTo(0, 5);
  });

  it('distance', () => {
    expect(v(0, 0).distance(v(3, 4))).toBe(5);
  });
});

describe('Vector2D — transform', () => {
  it('lerp', () => {
    expect(v(0, 0).lerp(v(10, 0), 0.5)).toEqual(v(5, 0));
  });

  it('reflect', () => {
    const r = v(1, 0).reflect(v(1, 0));
    expect(r.x).toBeCloseTo(-1, 5);
  });

  it('rotate 90', () => {
    const r = v(1, 0).rotate(Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(1, 5);
  });

  it('perpendicular', () => {
    expect(v(1, 0).perpendicular().x).toBeCloseTo(0, 5);
    expect(v(1, 0).perpendicular().y).toBe(1);
  });

  it('project', () => {
    const p = v(3, 4).project(v(1, 0));
    expect(p.x).toBeCloseTo(3, 5);
  });
});

describe('Vector2D — utility', () => {
  it('toArray', () => {
    expect(v(1, 2).toArray()).toEqual([1, 2]);
  });

  it('equals strict', () => {
    expect(v(1, 2).equals(v(1, 2))).toBe(true);
    expect(v(1, 2).equals(v(1, 3))).toBe(false);
  });

  it('equals epsilon', () => {
    expect(v(1, 2).equals(v(1.0001, 2), 0.01)).toBe(true);
  });
});

/**
 * Vector2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Vector2D } from '../Vector2D';

describe('Vector2D — basic', () => {
  it('constructor', () => {
    const v = new Vector2D(3, 4);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });

  it('zero', () => {
    const v = Vector2D.zero();
    expect(v.x).toBe(0);
  });

  it('fromArray', () => {
    const v = Vector2D.fromArray([1, 2]);
    expect(v.y).toBe(2);
  });
});

describe('Vector2D — ops', () => {
  it('add', () => {
    const v = new Vector2D(1, 2).add(new Vector2D(3, 4));
    expect(v.x).toBe(4);
  });

  it('subtract', () => {
    const v = new Vector2D(5, 6).subtract(new Vector2D(1, 2));
    expect(v.y).toBe(4);
  });

  it('scale', () => {
    const v = new Vector2D(2, 3).scale(2);
    expect(v.y).toBe(6);
  });

  it('negate', () => {
    const v = new Vector2D(3, 4).negate();
    expect(v.x).toBe(-3);
  });
});

describe('Vector2D — products', () => {
  it('dot', () => {
    expect(new Vector2D(1, 2).dot(new Vector2D(3, 4))).toBe(11);
  });

  it('cross', () => {
    expect(new Vector2D(1, 0).cross(new Vector2D(0, 1))).toBe(1);
  });

  it('magnitude', () => {
    expect(new Vector2D(3, 4).magnitude()).toBe(5);
  });

  it('magnitudeSq', () => {
    expect(new Vector2D(3, 4).magnitudeSq()).toBe(25);
  });
});

describe('Vector2D — geom', () => {
  it('normalize', () => {
    const n = new Vector2D(3, 4).normalize();
    expect(n.magnitude()).toBeCloseTo(1, 10);
  });

  it('normalize zero', () => {
    expect(Vector2D.zero().normalize().magnitude()).toBe(0);
  });

  it('distanceTo', () => {
    expect(new Vector2D(0, 0).distanceTo(new Vector2D(3, 4))).toBe(5);
  });

  it('angle', () => {
    expect(new Vector2D(1, 0).angle()).toBe(0);
  });

  it('angleTo', () => {
    expect(new Vector2D(0, 0).angleTo(new Vector2D(1, 0))).toBe(0);
  });
});

describe('Vector2D — transform', () => {
  it('rotate 90', () => {
    const r = new Vector2D(1, 0).rotate(Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(1, 5);
  });

  it('lerp', () => {
    const v = new Vector2D(0, 0).lerp(new Vector2D(10, 20), 0.5);
    expect(v.x).toBe(5);
  });
});

describe('Vector2D — util', () => {
  it('equals', () => {
    expect(new Vector2D(1, 2).equals(new Vector2D(1, 2))).toBe(true);
  });

  it('toArray', () => {
    expect(new Vector2D(1, 2).toArray()).toEqual([1, 2]);
  });
});

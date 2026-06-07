/**
 * Vector3D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Vector3D } from '../Vector3D';

describe('Vector3D — basic', () => {
  it('constructor', () => {
    const v = new Vector3D(1, 2, 3);
    expect(v.z).toBe(3);
  });

  it('zero', () => {
    const v = Vector3D.zero();
    expect(v.x).toBe(0);
  });

  it('fromArray', () => {
    const v = Vector3D.fromArray([1, 2, 3]);
    expect(v.y).toBe(2);
  });
});

describe('Vector3D — ops', () => {
  it('add', () => {
    const v = new Vector3D(1, 2, 3).add(new Vector3D(4, 5, 6));
    expect(v.z).toBe(9);
  });

  it('subtract', () => {
    const v = new Vector3D(5, 6, 7).subtract(new Vector3D(1, 2, 3));
    expect(v.x).toBe(4);
  });

  it('scale', () => {
    const v = new Vector3D(1, 2, 3).scale(2);
    expect(v.y).toBe(4);
  });
});

describe('Vector3D — products', () => {
  it('dot', () => {
    expect(new Vector3D(1, 2, 3).dot(new Vector3D(4, 5, 6))).toBe(32);
  });

  it('cross', () => {
    // x_hat x y_hat = z_hat
    const c = new Vector3D(1, 0, 0).cross(new Vector3D(0, 1, 0));
    expect(c.z).toBe(1);
  });

  it('magnitude', () => {
    expect(new Vector3D(1, 2, 2).magnitude()).toBe(3);
  });
});

describe('Vector3D — geom', () => {
  it('normalize', () => {
    const n = new Vector3D(1, 2, 2).normalize();
    expect(n.magnitude()).toBeCloseTo(1, 10);
  });

  it('distanceTo', () => {
    expect(new Vector3D(0, 0, 0).distanceTo(new Vector3D(1, 2, 2))).toBe(3);
  });

  it('reflect', () => {
    const v = new Vector3D(1, -1, 0).reflect(new Vector3D(0, 1, 0));
    expect(v.y).toBe(1);
  });

  it('project', () => {
    const p = new Vector3D(1, 0, 0).project(new Vector3D(2, 0, 0));
    expect(p.x).toBe(1);
  });

  it('angleTo perpendicular', () => {
    const a = new Vector3D(1, 0, 0).angleTo(new Vector3D(0, 1, 0));
    expect(a).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('Vector3D — util', () => {
  it('equals', () => {
    expect(new Vector3D(1, 2, 3).equals(new Vector3D(1, 2, 3))).toBe(true);
  });

  it('toArray', () => {
    expect(new Vector3D(1, 2, 3).toArray()).toEqual([1, 2, 3]);
  });
});

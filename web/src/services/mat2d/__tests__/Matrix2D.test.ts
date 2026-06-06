/**
 * Matrix2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Matrix2D } from '../Matrix2D';

describe('Matrix2D — basic', () => {
  it('identity', () => {
    const m = Matrix2D.identity();
    expect(m.a).toBe(1);
    expect(m.d).toBe(1);
  });

  it('translate', () => {
    const m = Matrix2D.translate(5, 3);
    expect(m.e).toBe(5);
    expect(m.f).toBe(3);
  });

  it('scale', () => {
    const m = Matrix2D.scale(2, 3);
    expect(m.a).toBe(2);
    expect(m.d).toBe(3);
  });

  it('rotate 90', () => {
    const m = Matrix2D.rotate(Math.PI / 2);
    expect(m.a).toBeCloseTo(0, 5);
    expect(m.d).toBeCloseTo(0, 5);
    expect(m.b).toBeCloseTo(1, 5);
  });
});

describe('Matrix2D — multiply', () => {
  it('translate then scale', () => {
    const t = Matrix2D.translate(10, 0);
    const s = Matrix2D.scale(2, 1);
    const m = t.multiply(s);
    const p = m.apply({ x: 1, y: 0 });
    expect(p.x).toBeCloseTo(12, 5);
  });
});

describe('Matrix2D — apply', () => {
  it('identity apply', () => {
    const m = Matrix2D.identity();
    expect(m.apply({ x: 5, y: 3 })).toEqual({ x: 5, y: 3 });
  });

  it('translate apply', () => {
    const m = Matrix2D.translate(5, 3);
    expect(m.apply({ x: 0, y: 0 })).toEqual({ x: 5, y: 3 });
  });
});

describe('Matrix2D — inverse', () => {
  it('inverse identity', () => {
    const inv = Matrix2D.identity().inverse();
    expect(inv?.a).toBe(1);
  });

  it('inverse of translate', () => {
    const m = Matrix2D.translate(5, 0);
    const inv = m.inverse()!;
    const p = inv.apply({ x: 5, y: 0 });
    expect(p.x).toBeCloseTo(0, 5);
  });

  it('inverse of scale', () => {
    const m = Matrix2D.scale(2, 2);
    const inv = m.inverse()!;
    const p = inv.apply({ x: 4, y: 4 });
    expect(p.x).toBeCloseTo(2, 5);
  });

  it('singular returns null', () => {
    const m = new Matrix2D(0, 0, 0, 0, 0, 0);
    expect(m.inverse()).toBe(null);
  });
});

describe('Matrix2D — utils', () => {
  it('determinant', () => {
    const m = new Matrix2D(2, 0, 0, 3, 0, 0);
    expect(m.determinant()).toBe(6);
  });

  it('toArray length 6', () => {
    expect(Matrix2D.identity().toArray().length).toBe(6);
  });

  it('toMatrix3 has 3 rows', () => {
    const m3 = Matrix2D.identity().toMatrix3();
    expect(m3.length).toBe(3);
    expect(m3[2]).toEqual([0, 0, 1]);
  });
});

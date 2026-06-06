/**
 * AffineTransform.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { AffineTransform } from '../AffineTransform';

const p = (x: number, y: number) => ({ x, y });

describe('AffineTransform — basic', () => {
  it('identity', () => {
    const t = AffineTransform.identity();
    expect(t.apply(p(5, 3))).toEqual(p(5, 3));
  });

  it('translate', () => {
    const t = AffineTransform.translate(5, 3);
    expect(t.apply(p(0, 0))).toEqual(p(5, 3));
  });

  it('scale', () => {
    const t = AffineTransform.scale(2, 3);
    expect(t.apply(p(1, 1))).toEqual(p(2, 3));
  });

  it('rotate 90', () => {
    const t = AffineTransform.rotate(Math.PI / 2);
    const r = t.apply(p(1, 0));
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(1, 5);
  });

  it('shear', () => {
    const t = AffineTransform.shear(1, 0);
    const r = t.apply(p(2, 0));
    expect(r.x).toBe(2);
    expect(r.y).toBe(0);
  });
});

describe('AffineTransform — compose', () => {
  it('translate then scale', () => {
    const t = AffineTransform.translate(10, 0).scaleBy(2, 1);
    const r = t.apply(p(1, 0));
    expect(r.x).toBe(12);
  });

  it('applyAll', () => {
    const t = AffineTransform.translate(1, 1);
    const r = t.applyAll([p(0, 0), p(1, 1)]);
    expect(r.length).toBe(2);
    expect(r[0]).toEqual(p(1, 1));
  });
});

describe('AffineTransform — inverse', () => {
  it('inverse identity', () => {
    expect(AffineTransform.identity().inverse()).not.toBe(null);
  });

  it('inverse round trip', () => {
    const t = AffineTransform.translate(5, 3).rotateBy(0.5).scaleBy(2, 1);
    const inv = t.inverse()!;
    const orig = p(1, 2);
    const back = inv.apply(t.apply(orig));
    expect(back.x).toBeCloseTo(1, 3);
    expect(back.y).toBeCloseTo(2, 3);
  });
});

describe('AffineTransform — decompose', () => {
  it('translate', () => {
    const t = AffineTransform.translate(5, 3);
    const d = t.decompose();
    expect(d.translate.x).toBe(5);
  });

  it('rotate', () => {
    const t = AffineTransform.rotate(Math.PI / 2);
    const d = t.decompose();
    expect(d.rotation).toBeCloseTo(Math.PI / 2, 3);
  });

  it('scale', () => {
    const t = AffineTransform.scale(2, 3);
    const d = t.decompose();
    expect(d.scale.x).toBeCloseTo(2, 3);
  });
});

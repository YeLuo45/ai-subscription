/**
 * Polynomial.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Polynomial } from '../Polynomial';

describe('Polynomial — basic', () => {
  it('evaluate 0', () => {
    // p(x) = 1 + 2x + 3x^2 -> p(0) = 1
    const p = new Polynomial([1, 2, 3]);
    expect(p.evaluate(0)).toBe(1);
  });

  it('evaluate 1', () => {
    const p = new Polynomial([1, 2, 3]);
    expect(p.evaluate(1)).toBe(6);
  });

  it('evaluate -1', () => {
    const p = new Polynomial([1, 2, 3]);
    expect(p.evaluate(-1)).toBe(2);
  });

  it('degree', () => {
    expect(new Polynomial([1, 2, 3]).degree()).toBe(2);
  });

  it('coefficients', () => {
    expect(new Polynomial([1, 2, 3]).coefficients()).toEqual([1, 2, 3]);
  });
});

describe('Polynomial — derivative', () => {
  it('derivative', () => {
    // p(x) = 1 + 2x + 3x^2 -> p'(x) = 2 + 6x
    const d = new Polynomial([1, 2, 3]).derivative();
    expect(d.evaluate(0)).toBe(2);
    expect(d.evaluate(1)).toBe(8);
  });
});

describe('Polynomial — add/multiply', () => {
  it('add', () => {
    const a = new Polynomial([1, 2]);
    const b = new Polynomial([3, 4]);
    const sum = a.add(b);
    expect(sum.evaluate(0)).toBe(4);
    expect(sum.evaluate(1)).toBe(10);
  });

  it('scale', () => {
    const p = new Polynomial([1, 2]).scale(3);
    expect(p.evaluate(1)).toBe(9);
  });

  it('multiply', () => {
    // (1+x)(2+x) = 2 + 3x + x^2
    const a = new Polynomial([1, 1]);
    const b = new Polynomial([2, 1]);
    const c = a.multiply(b);
    expect(c.evaluate(1)).toBe(6);  // (2)(2) = 4
    expect(c.evaluate(0)).toBe(2);
  });
});

describe('Polynomial — toString', () => {
  it('format', () => {
    expect(new Polynomial([1, 2, 3]).toString()).toContain('3x^2');
  });
});

describe('Polynomial — root', () => {
  it('find root x^2 - 4 = 0', () => {
    // x^2 - 4 = 0 -> x = 2
    const p = new Polynomial([-4, 0, 1]);
    const r = p.findRoot(1);
    expect(r).toBeCloseTo(2, 5);
  });

  it('find root cubic', () => {
    // x^3 - 6x^2 + 11x - 6 = (x-1)(x-2)(x-3) -> root at 1
    const p = new Polynomial([-6, 11, -6, 1]);
    const r = p.findRoot(0.5);
    expect(r).toBeCloseTo(1, 5);
  });
});

describe('Polynomial — compose', () => {
  it('compose', () => {
    // p(x) = x, q(x) = x+1 -> p(q(x)) = x+1
    const p = new Polynomial([0, 1]);
    const q = new Polynomial([1, 1]);
    const r = p.compose(q);
    expect(r.evaluate(5)).toBe(6);
  });
});

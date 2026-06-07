/**
 * Complex.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Complex } from '../Complex';

describe('Complex — basic', () => {
  it('constructor', () => {
    const c = new Complex(3, 4);
    expect(c.re).toBe(3);
  });

  it('i', () => {
    expect(Complex.i().im).toBe(1);
  });

  it('fromPolar', () => {
    const c = Complex.fromPolar(1, Math.PI);
    expect(c.re).toBeCloseTo(-1, 5);
  });
});

describe('Complex — ops', () => {
  it('add', () => {
    const c = new Complex(1, 2).add(new Complex(3, 4));
    expect(c.im).toBe(6);
  });

  it('subtract', () => {
    const c = new Complex(5, 6).subtract(new Complex(1, 2));
    expect(c.re).toBe(4);
  });

  it('multiply', () => {
    // (1+2i)(3+4i) = 3+4i+6i+8i^2 = -5+10i
    const c = new Complex(1, 2).multiply(new Complex(3, 4));
    expect(c.re).toBe(-5);
    expect(c.im).toBe(10);
  });

  it('divide', () => {
    // (1+0i)/(1+1i) = (1-i)/2 = 0.5 - 0.5i
    const c = new Complex(1, 0).divide(new Complex(1, 1));
    expect(c.re).toBeCloseTo(0.5, 5);
    expect(c.im).toBeCloseTo(-0.5, 5);
  });

  it('conjugate', () => {
    const c = new Complex(3, 4).conjugate();
    expect(c.im).toBe(-4);
  });
});

describe('Complex — magnitude', () => {
  it('magnitude 3-4', () => {
    expect(new Complex(3, 4).magnitude()).toBe(5);
  });

  it('argument', () => {
    expect(new Complex(1, 0).argument()).toBe(0);
  });
});

describe('Complex — functions', () => {
  it('pow 2', () => {
    // (1+i)^2 = 2i
    const c = new Complex(1, 1).pow(2);
    expect(c.re).toBeCloseTo(0, 5);
    expect(c.im).toBeCloseTo(2, 5);
  });

  it('sqrt 4', () => {
    const c = new Complex(4, 0).sqrt();
    expect(c.re).toBeCloseTo(2, 5);
  });

  it('exp', () => {
    // e^(i*pi) = -1
    const c = new Complex(0, Math.PI).exp();
    expect(c.re).toBeCloseTo(-1, 5);
    expect(c.im).toBeCloseTo(0, 5);
  });

  it('ln', () => {
    const c = new Complex(1, 0).ln();
    expect(c.re).toBeCloseTo(0, 5);
  });
});

describe('Complex — util', () => {
  it('equals', () => {
    expect(new Complex(1, 2).equals(new Complex(1, 2))).toBe(true);
  });

  it('toString', () => {
    expect(new Complex(3, 4).toString()).toBe('3 + 4i');
  });
});

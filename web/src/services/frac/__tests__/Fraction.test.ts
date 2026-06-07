/**
 * Fraction.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Fraction } from '../Fraction';

describe('Fraction — basic', () => {
  it('constructor', () => {
    const f = new Fraction(1, 2);
    expect(f.num).toBe(1);
    expect(f.den).toBe(2);
  });

  it('auto reduce', () => {
    const f = new Fraction(2, 4);
    expect(f.num).toBe(1);
    expect(f.den).toBe(2);
  });

  it('negative denominator', () => {
    const f = new Fraction(1, -2);
    expect(f.num).toBe(-1);
  });

  it('fromDecimal', () => {
    const f = Fraction.fromDecimal(0.5);
    expect(f.toNumber()).toBe(0.5);
  });
});

describe('Fraction — ops', () => {
  it('add', () => {
    const f = new Fraction(1, 2).add(new Fraction(1, 3));
    expect(f.num).toBe(5);
    expect(f.den).toBe(6);
  });

  it('subtract', () => {
    const f = new Fraction(1, 2).subtract(new Fraction(1, 3));
    expect(f.num).toBe(1);
    expect(f.den).toBe(6);
  });

  it('multiply', () => {
    const f = new Fraction(1, 2).multiply(new Fraction(2, 3));
    expect(f.num).toBe(1);
    expect(f.den).toBe(3);
  });

  it('divide', () => {
    const f = new Fraction(1, 2).divide(new Fraction(1, 4));
    expect(f.num).toBe(2);
  });

  it('negate', () => {
    const f = new Fraction(1, 2).negate();
    expect(f.num).toBe(-1);
  });

  it('inverse', () => {
    const f = new Fraction(2, 3).inverse();
    expect(f.num).toBe(3);
  });
});

describe('Fraction — toNumber', () => {
  it('toNumber', () => {
    expect(new Fraction(1, 4).toNumber()).toBe(0.25);
  });
});

describe('Fraction — power', () => {
  it('pow 2', () => {
    const f = new Fraction(1, 2).pow(2);
    expect(f.num).toBe(1);
    expect(f.den).toBe(4);
  });

  it('pow -1', () => {
    const f = new Fraction(2, 3).pow(-1);
    expect(f.num).toBe(3);
  });
});

describe('Fraction — util', () => {
  it('equals', () => {
    expect(new Fraction(1, 2).equals(new Fraction(2, 4))).toBe(true);
  });

  it('isInteger', () => {
    expect(new Fraction(5).isInteger()).toBe(true);
  });

  it('toString', () => {
    expect(new Fraction(3, 4).toString()).toBe('3/4');
  });
});

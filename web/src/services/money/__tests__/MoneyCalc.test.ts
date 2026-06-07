/**
 * MoneyCalc.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { MoneyCalc } from '../MoneyCalc';

describe('MoneyCalc — conversion', () => {
  it('toCents', () => {
    expect(MoneyCalc.toCents(1.23)).toBe(123);
  });

  it('fromCents', () => {
    expect(MoneyCalc.fromCents(123)).toBe(1.23);
  });
});

describe('MoneyCalc — ops', () => {
  it('add', () => {
    expect(MoneyCalc.add(1.23, 4.56)).toBe(579);
  });

  it('subtract', () => {
    expect(MoneyCalc.subtract(5.00, 1.50)).toBe(350);
  });

  it('multiply', () => {
    expect(MoneyCalc.multiply(2.50, 3)).toBe(750);
  });
});

describe('MoneyCalc — distribute', () => {
  it('distribute 100 into 3', () => {
    // 100/3 = 33.33... -> 34, 33, 33 (first gets remainder)
    expect(MoneyCalc.distribute(100, 3)).toEqual([3334, 3333, 3333]);
  });

  it('distribute 10 into 4', () => {
    expect(MoneyCalc.distribute(10, 4)).toEqual([250, 250, 250, 250]);
  });
});

describe('MoneyCalc — allocate', () => {
  it('allocate 100 in 1:1:1', () => {
    expect(MoneyCalc.allocate(100, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(10000);
  });
});

describe('MoneyCalc — interest', () => {
  it('simpleInterest', () => {
    // P=1000, r=0.05, t=2 -> 1000 * 0.05 * 2 = 100
    expect(MoneyCalc.simpleInterest(100000, 0.05, 2)).toBe(10000);
  });

  it('compoundInterest', () => {
    // P=1000, r=0.1, n=1, t=1 -> 1100
    expect(MoneyCalc.compoundInterest(100000, 0.1, 1)).toBe(110000);
  });
});

describe('MoneyCalc — tax/discount', () => {
  it('applyTax 10%', () => {
    // 100 + 10% = 110
    expect(MoneyCalc.applyTax(10000, 0.1)).toBe(11000);
  });

  it('discount 20%', () => {
    expect(MoneyCalc.discount(10000, 0.2)).toBe(8000);
  });
});

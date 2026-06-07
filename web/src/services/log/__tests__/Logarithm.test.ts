/**
 * Logarithm.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Logarithm } from '../Logarithm';

describe('Logarithm — basic', () => {
  it('log10 100', () => {
    expect(Logarithm.log10(100)).toBeCloseTo(2, 5);
  });

  it('log2 8', () => {
    expect(Logarithm.log2(8)).toBeCloseTo(3, 5);
  });

  it('ln e', () => {
    expect(Logarithm.ln(Math.E)).toBeCloseTo(1, 5);
  });

  it('logBase', () => {
    expect(Logarithm.logBase(8, 2)).toBeCloseTo(3, 5);
  });
});

describe('Logarithm — exp', () => {
  it('exp', () => {
    expect(Logarithm.exp(1)).toBeCloseTo(Math.E, 5);
  });

  it('exp2 10', () => {
    expect(Logarithm.exp2(10)).toBeCloseTo(1024, 5);
  });

  it('exp10 3', () => {
    expect(Logarithm.exp10(3)).toBeCloseTo(1000, 5);
  });

  it('pow 2.5', () => {
    expect(Logarithm.pow(4, 2.5)).toBeCloseTo(32, 5);
  });
});

describe('Logarithm — stable', () => {
  it('log1p', () => {
    expect(Logarithm.log1p(0)).toBeCloseTo(0, 5);
  });

  it('expm1', () => {
    expect(Logarithm.expm1(0)).toBeCloseTo(0, 5);
  });
});

describe('Logarithm — product/quotient', () => {
  it('logProduct', () => {
    expect(Logarithm.logProduct(2, 3)).toBeCloseTo(Math.log(6), 5);
  });

  it('logQuotient', () => {
    expect(Logarithm.logQuotient(10, 2)).toBeCloseTo(Math.log(5), 5);
  });
});

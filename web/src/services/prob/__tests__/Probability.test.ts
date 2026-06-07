/**
 * Probability.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Probability } from '../Probability';

describe('Probability — basic', () => {
  it('independent and', () => {
    expect(Probability.independentAnd(0.5, 0.5)).toBe(0.25);
  });

  it('independent or', () => {
    expect(Probability.independentOr(0.5, 0.5)).toBe(0.75);
  });

  it('exclusive or', () => {
    expect(Probability.exclusiveOr(0.3, 0.4)).toBe(0.7);
  });

  it('conditional', () => {
    expect(Probability.conditional(0.2, 0.5)).toBe(0.4);
  });
});

describe('Probability — bayes', () => {
  it('bayes', () => {
    // P(A|B) = P(B|A) * P(A) / P(B) = 0.8 * 0.1 / 0.2 = 0.4
    expect(Probability.bayes(0.8, 0.1, 0.2)).toBeCloseTo(0.4, 10);
  });
});

describe('Probability — distributions', () => {
  it('binomial', () => {
    // P(2 heads in 3 tosses, p=0.5) = C(3,2) * 0.5^2 * 0.5^1 = 3 * 0.125 = 0.375
    expect(Probability.binomial(3, 2, 0.5)).toBeCloseTo(0.375, 5);
  });

  it('poisson', () => {
    // P(X=2, lambda=1) = e^-1 * 1^2 / 2! = 0.1839
    expect(Probability.poisson(2, 1)).toBeCloseTo(0.1839, 3);
  });

  it('normalPdf 0', () => {
    // N(0,1) at x=0 = 1/sqrt(2*pi) ~ 0.3989
    expect(Probability.normalPdf(0)).toBeCloseTo(0.3989, 3);
  });

  it('normalCdf 0', () => {
    expect(Probability.normalCdf(0)).toBeCloseTo(0.5, 3);
  });
});

describe('Probability — discrete', () => {
  it('expectedValue', () => {
    // E[X] for fair die = 3.5
    expect(Probability.expectedValue([1, 2, 3, 4, 5, 6], [1/6, 1/6, 1/6, 1/6, 1/6, 1/6])).toBeCloseTo(3.5, 5);
  });

  it('variance', () => {
    const v = Probability.variance([1, 2, 3, 4, 5, 6], [1/6, 1/6, 1/6, 1/6, 1/6, 1/6]);
    expect(v).toBeCloseTo(2.916, 2);
  });
});

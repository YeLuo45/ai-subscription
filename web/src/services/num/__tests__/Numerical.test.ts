/**
 * Numerical.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Numerical } from '../Numerical';

describe('Numerical — bisection', () => {
  it('root of x^2 - 4', () => {
    // x^2 - 4 = 0 -> x = 2 (in [0, 5])
    const r = Numerical.bisection((x) => x * x - 4, 0, 5);
    expect(r).toBeCloseTo(2, 5);
  });

  it('no sign change', () => {
    expect(Numerical.bisection((x) => x * x + 1, 0, 5)).toBeNull();
  });
});

describe('Numerical — newton', () => {
  it('root of x^2 - 4', () => {
    const r = Numerical.newton((x) => x * x - 4, (x) => 2 * x, 1);
    expect(r).toBeCloseTo(2, 5);
  });

  it('zero derivative', () => {
    expect(Numerical.newton((x) => 1, () => 0, 0)).toBeNull();
  });
});

describe('Numerical — secant', () => {
  it('root of x^2 - 4', () => {
    const r = Numerical.secant((x) => x * x - 4, 0, 1);
    expect(r).toBeCloseTo(2, 4);
  });
});

describe('Numerical — derivative', () => {
  it('derivative of x^2 at 3', () => {
    expect(Numerical.derivative((x) => x * x, 3)).toBeCloseTo(6, 5);
  });

  it('derivative of sin', () => {
    expect(Numerical.derivative(Math.sin, 0)).toBeCloseTo(1, 5);
  });
});

describe('Numerical — integration', () => {
  it('trapezoidal x^2 [0,1]', () => {
    expect(Numerical.integrateTrap((x) => x * x, 0, 1, 1000)).toBeCloseTo(1 / 3, 4);
  });

  it('simpson x^2 [0,1]', () => {
    expect(Numerical.integrateSimpson((x) => x * x, 0, 1, 100)).toBeCloseTo(1 / 3, 4);
  });

  it('simpson sin [0,pi]', () => {
    expect(Numerical.integrateSimpson(Math.sin, 0, Math.PI, 100)).toBeCloseTo(2, 3);
  });
});

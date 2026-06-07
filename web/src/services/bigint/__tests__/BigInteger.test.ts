/**
 * BigInteger.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BigInteger as B } from '../BigInteger';

describe('BigInteger — basic', () => {
  it('from number', () => {
    const b = new B(42);
    expect(b.toString()).toBe('42');
  });

  it('from string', () => {
    const b = new B('99999999999999999999');
    expect(b.toString()).toBe('99999999999999999999');
  });
});

describe('BigInteger — ops', () => {
  it('add', () => {
    const b = new B(10).add(new B(20));
    expect(b.toString()).toBe('30');
  });

  it('subtract', () => {
    const b = new B(20).subtract(new B(7));
    expect(b.toString()).toBe('13');
  });

  it('multiply', () => {
    const b = new B('99999999999999999').multiply(new B(2));
    expect(b.toString()).toBe('199999999999999998');
  });

  it('divide', () => {
    expect(new B(20).divide(new B(6)).toString()).toBe('3');
  });

  it('mod', () => {
    expect(new B(20).mod(new B(6)).toString()).toBe('2');
  });
});

describe('BigInteger — negative/abs', () => {
  it('negate', () => {
    expect(new B(5).negate().toString()).toBe('-5');
  });

  it('abs', () => {
    expect(new B(-7).abs().toString()).toBe('7');
  });
});

describe('BigInteger — math', () => {
  it('pow', () => {
    expect(new B(2).pow(10).toString()).toBe('1024');
  });

  it('gcd', () => {
    const g = B.gcd(new B(48), new B(18));
    expect(g.toString()).toBe('6');
  });

  it('lcm', () => {
    const l = B.lcm(new B(4), new B(6));
    expect(l.toString()).toBe('12');
  });

  it('factorial', () => {
    expect(B.factorial(5).toString()).toBe('120');
  });

  it('factorial 20', () => {
    expect(B.factorial(20).toString()).toBe('2432902008176640000');
  });
});

describe('BigInteger — checks', () => {
  it('isPrime 7', () => {
    expect(new B(7).isPrime()).toBe(true);
  });

  it('isPrime 9', () => {
    expect(new B(9).isPrime()).toBe(false);
  });

  it('isPowerOfTwo 16', () => {
    expect(new B(16).isPowerOfTwo()).toBe(true);
  });

  it('isPowerOfTwo 15', () => {
    expect(new B(15).isPowerOfTwo()).toBe(false);
  });

  it('bitLength', () => {
    expect(new B(8).bitLength()).toBe(4);
  });
});

describe('BigInteger — compare', () => {
  it('compare less', () => {
    expect(new B(1).compare(new B(2))).toBe(-1);
  });

  it('compare equal', () => {
    expect(new B(5).compare(new B(5))).toBe(0);
  });

  it('compare greater', () => {
    expect(new B(10).compare(new B(5))).toBe(1);
  });
});

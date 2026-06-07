/**
 * NumberTheory.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { NumberTheory } from '../NumberTheory';

describe('NumberTheory — gcd/lcm', () => {
  it('gcd', () => {
    expect(NumberTheory.gcd(48, 18)).toBe(6);
  });

  it('lcm', () => {
    expect(NumberTheory.lcm(4, 6)).toBe(12);
  });

  it('gcd array', () => {
    expect(NumberTheory.gcdArray([12, 18, 24])).toBe(6);
  });

  it('lcm array', () => {
    expect(NumberTheory.lcmArray([2, 3, 4])).toBe(12);
  });
});

describe('NumberTheory — primes', () => {
  it('isPrime 7', () => {
    expect(NumberTheory.isPrime(7)).toBe(true);
  });

  it('isPrime 9', () => {
    expect(NumberTheory.isPrime(9)).toBe(false);
  });

  it('isPrime 1', () => {
    expect(NumberTheory.isPrime(1)).toBe(false);
  });

  it('primes first 5', () => {
    expect(NumberTheory.primes(5)).toEqual([2, 3, 5, 7, 11]);
  });

  it('sieve', () => {
    const s = NumberTheory.sieve(10);
    expect(s[7]).toBe(true);
    expect(s[8]).toBe(false);
  });
});

describe('NumberTheory — factorize', () => {
  it('factorize 12', () => {
    const f = NumberTheory.factorize(12);
    expect(f.get(2)).toBe(2);
    expect(f.get(3)).toBe(1);
  });

  it('factorize 60', () => {
    const f = NumberTheory.factorize(60);
    expect(f.get(2)).toBe(2);
    expect(f.get(3)).toBe(1);
    expect(f.get(5)).toBe(1);
  });
});

describe('NumberTheory — advanced', () => {
  it('totient 10', () => {
    expect(NumberTheory.totient(10)).toBe(4);
  });

  it('modPow', () => {
    expect(NumberTheory.modPow(2, 10, 1000)).toBe(24);
  });

  it('divisors 12', () => {
    expect(NumberTheory.divisors(12)).toEqual([1, 2, 3, 4, 6, 12]);
  });
});

/**
 * RandomSeed.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { RandomSeed } from '../RandomSeed';

describe('RandomSeed — basic', () => {
  it('next in [0, 1)', () => {
    const r = new RandomSeed(42);
    const v = r.next();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('string seed', () => {
    const r = new RandomSeed('hello');
    expect(r.state()).toBeGreaterThan(0);
  });
});

describe('RandomSeed — deterministic', () => {
  it('same seed = same output', () => {
    const a = new RandomSeed(123);
    const b = new RandomSeed(123);
    expect(a.next()).toBe(b.next());
    expect(a.next()).toBe(b.next());
  });

  it('different seed = different output', () => {
    const a = new RandomSeed(1);
    const b = new RandomSeed(2);
    expect(a.next()).not.toBe(b.next());
  });
});

describe('RandomSeed — helpers', () => {
  it('int', () => {
    const r = new RandomSeed(42);
    const v = r.int(10);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(10);
  });

  it('range', () => {
    const r = new RandomSeed(42);
    const v = r.range(5, 10);
    expect(v).toBeGreaterThanOrEqual(5);
    expect(v).toBeLessThanOrEqual(10);
  });

  it('pick', () => {
    const r = new RandomSeed(42);
    const arr = [1, 2, 3];
    expect(arr).toContain(r.pick(arr));
  });

  it('pick empty', () => {
    const r = new RandomSeed(42);
    expect(r.pick([])).toBeNull();
  });

  it('shuffle', () => {
    const r = new RandomSeed(42);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = r.shuffle(arr);
    expect(shuffled.length).toBe(arr.length);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('bool', () => {
    const r = new RandomSeed(42);
    expect(typeof r.bool()).toBe('boolean');
  });

  it('float', () => {
    const r = new RandomSeed(42);
    const v = r.float(1, 5);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(5);
  });
});

describe('RandomSeed — sfc32', () => {
  it('sfc32 next', () => {
    const r = new RandomSeed(42, 'sfc32');
    const v = r.next();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

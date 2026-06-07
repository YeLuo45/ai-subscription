/**
 * Percent.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Percent } from '../Percent';

describe('Percent — basic', () => {
  it('of', () => {
    expect(Percent.of(20, 100)).toBe(20);
  });

  it('whatPercent', () => {
    expect(Percent.whatPercent(20, 100)).toBe(20);
  });

  it('change +50%', () => {
    expect(Percent.change(100, 150)).toBe(50);
  });

  it('change -25%', () => {
    expect(Percent.change(100, 75)).toBe(-25);
  });
});

describe('Percent — increase/decrease', () => {
  it('increase', () => {
    expect(Percent.increase(100, 20)).toBe(120);
  });

  it('decrease', () => {
    expect(Percent.decrease(100, 20)).toBe(80);
  });

  it('addPercent', () => {
    expect(Percent.addPercent(100, 10)).toBe(110);
  });

  it('subPercent', () => {
    expect(Percent.subPercent(100, 10)).toBe(90);
  });
});

describe('Percent — advanced', () => {
  it('diff', () => {
    expect(Percent.diff(100, 120)).toBeCloseTo(18.18, 1);
  });

  it('format', () => {
    expect(Percent.format(50.5)).toBe('50.50%');
  });

  it('format 0 decimals', () => {
    expect(Percent.format(50.5, 0)).toBe('51%');
  });
});

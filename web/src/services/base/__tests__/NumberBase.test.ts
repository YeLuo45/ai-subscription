/**
 * NumberBase.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { NumberBase } from '../NumberBase';

describe('NumberBase — toBase', () => {
  it('to hex', () => {
    expect(NumberBase.toBase(255, 16)).toBe('FF');
  });

  it('to binary', () => {
    expect(NumberBase.toBase(10, 2)).toBe('1010');
  });

  it('to octal', () => {
    expect(NumberBase.toBase(8, 8)).toBe('10');
  });

  it('to base 36', () => {
    expect(NumberBase.toBase(35, 36)).toBe('Z');
  });

  it('zero', () => {
    expect(NumberBase.toBase(0, 10)).toBe('0');
  });

  it('negative', () => {
    expect(NumberBase.toBase(-10, 2)).toBe('-1010');
  });
});

describe('NumberBase — fromBase', () => {
  it('from hex', () => {
    expect(NumberBase.fromBase('FF', 16)).toBe(255);
  });

  it('from binary', () => {
    expect(NumberBase.fromBase('1010', 2)).toBe(10);
  });
});

describe('NumberBase — convert', () => {
  it('hex to binary', () => {
    expect(NumberBase.convert('FF', 16, 2)).toBe('11111111');
  });
});

describe('NumberBase — digits', () => {
  it('digits 255', () => {
    expect(NumberBase.digits(255, 16)).toEqual([15, 15]);
  });
});

describe('NumberBase — pad', () => {
  it('pad 4', () => {
    expect(NumberBase.pad('FF', 6)).toBe('0000FF');
  });
});

describe('NumberBase — format/parse', () => {
  it('format hex', () => {
    expect(NumberBase.format(255, 16)).toBe('0xFF');
  });

  it('parse hex', () => {
    expect(NumberBase.parse('0xFF')).toBe(255);
  });

  it('parse binary', () => {
    expect(NumberBase.parse('0b1010')).toBe(10);
  });
});

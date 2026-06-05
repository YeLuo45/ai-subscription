/**
 * ExpressionEngine.test.ts — Pure unit tests for arithmetic expression evaluator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionEngine } from '../ExpressionEngine';

describe('ExpressionEngine — basic arithmetic', () => {
  let e: ExpressionEngine;
  beforeEach(() => { e = new ExpressionEngine(); });

  it('evaluates simple addition', () => {
    expect(e.evaluate('1 + 2')).toBe(3);
  });

  it('evaluates multiplication with precedence', () => {
    expect(e.evaluate('2 + 3 * 4')).toBe(14);
  });

  it('evaluates with parentheses', () => {
    expect(e.evaluate('(2 + 3) * 4')).toBe(20);
  });

  it('evaluates division', () => {
    expect(e.evaluate('10 / 4')).toBeCloseTo(2.5, 5);
  });

  it('evaluates modulo', () => {
    expect(e.evaluate('10 % 3')).toBe(1);
  });

  it('evaluates power', () => {
    expect(e.evaluate('2 ** 3')).toBe(8);
  });

  it('handles decimal numbers', () => {
    expect(e.evaluate('1.5 * 2')).toBe(3);
  });

  it('handles unary minus', () => {
    expect(e.evaluate('-5 + 10')).toBe(5);
  });
});

describe('ExpressionEngine — variables', () => {
  let e: ExpressionEngine;
  beforeEach(() => { e = new ExpressionEngine(); });

  it('substitutes a single variable', () => {
    expect(e.evaluate('x * 2', { x: 5 })).toBe(10);
  });

  it('substitutes multiple variables', () => {
    expect(e.evaluate('a + b', { a: 3, b: 7 })).toBe(10);
  });

  it('throws on undefined variable', () => {
    expect(() => e.evaluate('x + 1', {})).toThrow('undefined');
  });

  it('treats string variables as numbers', () => {
    expect(e.evaluate('a + 1', { a: '5' })).toBe(6);
  });

  it('treats boolean as 0/1', () => {
    expect(e.evaluate('a + 1', { a: true })).toBe(2);
  });
});

describe('ExpressionEngine — functions', () => {
  let e: ExpressionEngine;
  beforeEach(() => { e = new ExpressionEngine(); });

  it('evaluates abs', () => {
    expect(e.evaluate('abs(-5)')).toBe(5);
  });

  it('evaluates sqrt', () => {
    expect(e.evaluate('sqrt(16)')).toBe(4);
  });

  it('evaluates max with 2 args', () => {
    expect(e.evaluate('max(3, 5)')).toBe(5);
  });

  it('evaluates min with 2 args', () => {
    expect(e.evaluate('min(3, 5)')).toBe(3);
  });

  it('evaluates round', () => {
    expect(e.evaluate('round(3.7)')).toBe(4);
  });

  it('evaluates floor', () => {
    expect(e.evaluate('floor(3.7)')).toBe(3);
  });

  it('evaluates ceil', () => {
    expect(e.evaluate('ceil(3.2)')).toBe(4);
  });

  it('throws on unknown function', () => {
    expect(() => e.evaluate('foo(1)')).toThrow('unknown function');
  });
});

describe('ExpressionEngine — complex expressions', () => {
  let e: ExpressionEngine;
  beforeEach(() => { e = new ExpressionEngine(); });

  it('combines arithmetic and functions', () => {
    expect(e.evaluate('abs(x - y)', { x: 3, y: 8 })).toBe(5);
  });

  it('handles nested function calls', () => {
    expect(e.evaluate('max(abs(-5), sqrt(16))')).toBe(5);
  });

  it('max picks larger value', () => {
    expect(e.evaluate('max(sqrt(100), abs(-3))')).toBe(10);
  });

  it('handles right-associative power', () => {
    expect(e.evaluate('2 ** 3 ** 2')).toBe(512); // 2^(3^2) = 2^9 = 512
  });

  it('handles zero args or empty', () => {
    expect(e.evaluate('0')).toBe(0);
  });
});

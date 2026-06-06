/**
 * TOMLParser.test.ts — Pure unit tests for TOML parser
 */

import { describe, it, expect } from 'vitest';
import { TOMLParser } from '../TOMLParser';

describe('TOMLParser — basic', () => {
  it('parses key-value', () => {
    const r = new TOMLParser().parse('name = "Alice"');
    expect(r.name).toBe('Alice');
  });

  it('parses integers', () => {
    const r = new TOMLParser().parse('count = 42');
    expect(r.count).toBe(42);
  });

  it('parses floats', () => {
    const r = new TOMLParser().parse('pi = 3.14');
    expect(r.pi).toBe(3.14);
  });

  it('parses booleans', () => {
    const r = new TOMLParser().parse('a = true\nb = false');
    expect(r.a).toBe(true);
    expect(r.b).toBe(false);
  });
});

describe('TOMLParser — sections', () => {
  it('parses section', () => {
    const r = new TOMLParser().parse('[server]\nport = 8080');
    expect((r.server as { port: number }).port).toBe(8080);
  });

  it('multiple sections', () => {
    const r = new TOMLParser().parse('[a]\nx = 1\n[b]\ny = 2');
    expect((r.a as { x: number }).x).toBe(1);
    expect((r.b as { y: number }).y).toBe(2);
  });
});

describe('TOMLParser — strings', () => {
  it('double-quoted', () => {
    expect(new TOMLParser().parse('s = "hello"').s).toBe('hello');
  });

  it('single-quoted (literal)', () => {
    expect(new TOMLParser().parse("s = 'hello'").s).toBe('hello');
  });

  it('escaped', () => {
    expect(new TOMLParser().parse('s = "a\\nb"').s).toBe('a\nb');
  });
});

describe('TOMLParser — arrays', () => {
  it('simple array', () => {
    const r = new TOMLParser().parse('nums = [1, 2, 3]');
    expect(r.nums).toEqual([1, 2, 3]);
  });

  it('empty array', () => {
    expect(new TOMLParser().parse('a = []').a).toEqual([]);
  });
});

describe('TOMLParser — comments', () => {
  it('skips comment lines', () => {
    const r = new TOMLParser().parse('# comment\nx = 1');
    expect(r.x).toBe(1);
  });

  it('inline comments', () => {
    const r = new TOMLParser().parse('x = 1 # comment');
    expect(r.x).toBe(1);
  });
});

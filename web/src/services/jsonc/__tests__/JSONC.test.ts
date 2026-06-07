/**
 * JSONC.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JSONC } from '../JSONC';

describe('JSONC — strip', () => {
  it('line comment', () => {
    expect(JSONC.strip('{//comment\n"a":1}')).toBe('{\n"a":1}');
  });

  it('block comment', () => {
    expect(JSONC.strip('{/*comment*/"a":1}')).toBe('{"a":1}');
  });

  it('multiple comments', () => {
    expect(JSONC.strip('//top\n{"a":1} //tail')).toBe('\n{"a":1} ');
  });

  it('preserve // in string', () => {
    expect(JSONC.strip('{"a":"//not a comment"}')).toBe('{"a":"//not a comment"}');
  });

  it('trailing comma', () => {
    expect(JSONC.strip('{"a":1,}')).toBe('{"a":1}');
  });

  it('trailing comma array', () => {
    expect(JSONC.strip('[1,2,3,]')).toBe('[1,2,3]');
  });
});

describe('JSONC — parse', () => {
  it('parse with comments', () => {
    const r = JSONC.parse('// header\n{"a":1, /* tail */}');
    expect(r).toEqual({ a: 1 });
  });

  it('parse with trailing comma', () => {
    expect(JSONC.parse('[1,2,3,]')).toEqual([1, 2, 3]);
  });

  it('parse object', () => {
    expect(JSONC.parse('{"a":1, "b":2}')).toEqual({ a: 1, b: 2 });
  });
});

describe('JSONC — tryParse', () => {
  it('valid', () => {
    expect(JSONC.tryParse('{"a":1}')).toEqual({ a: 1 });
  });

  it('invalid', () => {
    expect(JSONC.tryParse('{')).toBeUndefined();
  });
});

describe('JSONC — isValid', () => {
  it('valid', () => {
    expect(JSONC.isValid('{"a":1}')).toBe(true);
  });

  it('valid with comments', () => {
    expect(JSONC.isValid('//c\n{"a":1,}')).toBe(true);
  });

  it('invalid', () => {
    expect(JSONC.isValid('{')).toBe(false);
  });
});

describe('JSONC — toJSON', () => {
  it('convert', () => {
    const s = JSONC.toJSON('{"a":1}');
    expect(s).toContain('"a": 1');
  });

  it('with comments removed', () => {
    const s = JSONC.toJSON('//c\n{"a":1}');
    expect(s).not.toContain('//c');
  });
});

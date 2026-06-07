/**
 * JSONPointer.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JSONPointer } from '../JSONPointer';

describe('JSONPointer — get', () => {
  it('root', () => {
    expect(JSONPointer.get({ a: 1 }, '')).toEqual({ a: 1 });
  });

  it('simple', () => {
    expect(JSONPointer.get({ a: 1 }, '/a')).toBe(1);
  });

  it('nested', () => {
    expect(JSONPointer.get({ a: { b: 2 } }, '/a/b')).toBe(2);
  });

  it('array index', () => {
    expect(JSONPointer.get([10, 20, 30], '/1')).toBe(20);
  });

  it('missing', () => {
    expect(JSONPointer.get({ a: 1 }, '/x')).toBe(undefined);
  });

  it('escape ~1', () => {
    expect(JSONPointer.get({ 'a/b': 1 }, '/a~1b')).toBe(1);
  });

  it('escape ~0', () => {
    expect(JSONPointer.get({ 'a~b': 1 }, '/a~0b')).toBe(1);
  });
});

describe('JSONPointer — set', () => {
  it('set simple', () => {
    const obj: Record<string, unknown> = {};
    JSONPointer.set(obj, '/a', 1);
    expect(obj).toEqual({ a: 1 });
  });

  it('set nested', () => {
    const obj: Record<string, unknown> = { a: {} };
    JSONPointer.set(obj, '/a/b', 2);
    expect(obj).toEqual({ a: { b: 2 } });
  });

  it('set array', () => {
    const arr: number[] = [];
    JSONPointer.set(arr, '/0', 99);
    expect(arr).toEqual([99]);
  });
});

describe('JSONPointer — build', () => {
  it('build', () => {
    expect(JSONPointer.build(['a', 'b', 0])).toBe('/a/b/0');
  });

  it('escape build', () => {
    expect(JSONPointer.build(['a/b', 'a~b'])).toBe('/a~1b/a~0b');
  });

  it('empty', () => {
    expect(JSONPointer.build([])).toBe('/');
  });
});

describe('JSONPointer — parse', () => {
  it('parse', () => {
    expect(JSONPointer.parse('/a/b/0')).toEqual(['a', 'b', '0']);
  });

  it('unescape', () => {
    expect(JSONPointer.parse('/a~1b/a~0b')).toEqual(['a/b', 'a~b']);
  });

  it('invalid', () => {
    expect(() => JSONPointer.parse('abc')).toThrow();
  });
});

describe('JSONPointer — isValid', () => {
  it('valid', () => {
    expect(JSONPointer.isValid('/a/b')).toBe(true);
    expect(JSONPointer.isValid('')).toBe(true);
  });

  it('invalid no slash', () => {
    expect(JSONPointer.isValid('abc')).toBe(false);
  });

  it('invalid ..', () => {
    // Note: RFC 6901 doesn't forbid .., but typically not used
    expect(JSONPointer.isValid('/..')).toBe(false);
  });
});

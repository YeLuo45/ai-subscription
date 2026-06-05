/**
 * JsonSerializer.test.ts — Pure unit tests for JSON serialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JsonSerializer } from '../JsonSerializer';

describe('JsonSerializer — serialize and parse', () => {
  let s: JsonSerializer;
  beforeEach(() => {
    s = new JsonSerializer();
  });

  it('round-trips an object', () => {
    const obj = { a: 1, b: 'hello', c: [1, 2, 3] };
    const r = s.parse(s.serialize(obj));
    expect(r).toEqual(obj);
  });

  it('serialize with replacer', () => {
    const r = s.serialize({ a: 1, b: 2 }, (k, v) => k === 'a' ? undefined : v);
    expect(r).toBe('{"b":2}');
  });

  it('parse with reviver', () => {
    const r = s.parse<{ a: number; b: string }>('{"a":1,"b":"2"}', (k, v) => k === 'a' ? (v as number) * 10 : v);
    expect(r.a).toBe(10);
  });
});

describe('JsonSerializer — safe parse and formatting', () => {
  let s: JsonSerializer;
  beforeEach(() => { s = new JsonSerializer(); });

  it('safeParse returns undefined on bad JSON', () => {
    expect(s.safeParse('not json')).toBeUndefined();
  });

  it('safeParse returns value on valid JSON', () => {
    expect(s.safeParse('{"a":1}')).toEqual({ a: 1 });
  });

  it('pretty formats with indentation', () => {
    const out = s.pretty({ a: 1 });
    expect(out).toContain('\n');
    expect(out).toContain('  ');
  });

  it('minify has no whitespace', () => {
    const out = s.minify({ a: 1, b: 2 });
    expect(out).toBe('{"a":1,"b":2}');
  });
});

describe('JsonSerializer — clone and merge', () => {
  let s: JsonSerializer;
  beforeEach(() => { s = new JsonSerializer(); });

  it('clone creates a deep copy', () => {
    const obj = { a: { b: 1 } };
    const c = s.clone(obj);
    c.a.b = 999;
    expect(obj.a.b).toBe(1);
  });

  it('merge combines objects with source winning', () => {
    const r = s.merge<Record<string, unknown>>({ a: 1, b: 2 }, { b: 99, c: 3 });
    expect(r).toEqual({ a: 1, b: 99, c: 3 });
  });

  it('merge deep merges nested objects', () => {
    const r = s.merge<Record<string, any>>({ a: { x: 1, y: 2 } }, { a: { y: 99, z: 3 } });
    expect(r).toEqual({ a: { x: 1, y: 99, z: 3 } });
  });

  it('merge replaces arrays', () => {
    const r = s.merge<Record<string, any>>({ a: [1, 2, 3] }, { a: [9] });
    expect(r.a).toEqual([9]);
  });
});

describe('JsonSerializer — JSON Pointer', () => {
  let s: JsonSerializer;
  beforeEach(() => { s = new JsonSerializer(); });

  it('getByPath returns root for empty path', () => {
    expect(s.getByPath({ a: 1 }, '')).toEqual({ a: 1 });
  });

  it('getByPath retrieves nested value', () => {
    expect(s.getByPath({ a: { b: 5 } }, '/a/b')).toBe(5);
  });

  it('getByPath returns undefined for missing', () => {
    expect(s.getByPath({ a: 1 }, '/x/y')).toBeUndefined();
  });

  it('getByPath handles array index', () => {
    expect(s.getByPath({ a: [1, 2, 3] }, '/a/1')).toBe(2);
  });

  it('setByPath sets nested value', () => {
    const r = s.setByPath({ a: { b: 1 } }, '/a/b', 99) as any;
    expect(r.a.b).toBe(99);
  });

  it('setByPath creates intermediate objects', () => {
    const r = s.setByPath({}, '/a/b/c', 'hi') as any;
    expect(r.a.b.c).toBe('hi');
  });

  it('removeByPath removes a key', () => {
    const r = s.removeByPath({ a: 1, b: 2 }, '/a') as any;
    expect(r.b).toBe(2);
    expect(r.a).toBeUndefined();
  });
});

describe('JsonSerializer — base64 and types', () => {
  let s: JsonSerializer;
  beforeEach(() => { s = new JsonSerializer(); });

  it('encodeURI and decodeURI round-trip', () => {
    const obj = { a: 1, b: 'hello', c: [1, 2] };
    const enc = s.encodeURI(obj);
    expect(s.decodeURI(enc)).toEqual(obj);
  });

  it('getType returns correct types', () => {
    expect(s.getType(null)).toBe('null');
    expect(s.getType(undefined)).toBe('undefined');
    expect(s.getType(5)).toBe('number');
    expect(s.getType('x')).toBe('string');
    expect(s.getType([])).toBe('array');
    expect(s.getType({})).toBe('object');
  });
});

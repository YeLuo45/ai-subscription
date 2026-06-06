/**
 * INIParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { INIParser } from '../INIParser';

describe('INIParser — basic', () => {
  it('simple', () => {
    expect(INIParser.parse('key = value')).toEqual({ key: 'value' });
  });

  it('no spaces', () => {
    expect(INIParser.parse('key=value')).toEqual({ key: 'value' });
  });

  it('int', () => {
    expect(INIParser.parse('count = 42')).toEqual({ count: 42 });
  });

  it('float', () => {
    expect(INIParser.parse('pi = 3.14')).toEqual({ pi: 3.14 });
  });

  it('bool', () => {
    expect(INIParser.parse('on = true\noff = false')).toEqual({ on: true, off: false });
  });

  it('comment', () => {
    expect(INIParser.parse('; comment\n# also\nx = 1')).toEqual({ x: 1 });
  });

  it('quoted string', () => {
    expect(INIParser.parse('name = "hello world"')).toEqual({ name: 'hello world' });
  });
});

describe('INIParser — sections', () => {
  it('section', () => {
    const r = INIParser.parse('[server]\nport = 8080');
    expect(r).toEqual({ server: { port: 8080 } });
  });

  it('nested', () => {
    const r = INIParser.parse('[a.b]\nx=1');
    expect(r).toEqual({ a: { b: { x: 1 } } });
  });

  it('multiple', () => {
    const r = INIParser.parse('[a]\nx=1\n[b]\ny=2');
    expect(r).toEqual({ a: { x: 1 }, b: { y: 2 } });
  });
});

describe('INIParser — stringify', () => {
  it('basic', () => {
    const s = INIParser.stringify({ x: 1, y: 'foo' });
    expect(s).toContain('x = 1');
    expect(s).toContain('y = foo');
  });

  it('with section', () => {
    const s = INIParser.stringify({ server: { port: 8080 } });
    expect(s).toContain('[server]');
  });
});

describe('INIParser — get/set', () => {
  it('get', () => {
    const obj = INIParser.parse('[a.b]\nx=1');
    expect(INIParser.get(obj, 'a.b.x')).toBe(1);
  });

  it('get missing', () => {
    expect(INIParser.get({}, 'x.y')).toBeUndefined();
  });

  it('set', () => {
    const obj: Record<string, unknown> = {};
    INIParser.set(obj, 'a.b.c', 42);
    expect(INIParser.get(obj, 'a.b.c')).toBe(42);
  });
});

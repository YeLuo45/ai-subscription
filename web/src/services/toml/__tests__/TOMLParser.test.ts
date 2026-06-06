/**
 * TOMLParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { TOMLParser } from '../TOMLParser';

describe('TOMLParser — basic', () => {
  it('simple key=value', () => {
    expect(TOMLParser.parse('name = "foo"')).toEqual({ name: 'foo' });
  });

  it('integer', () => {
    expect(TOMLParser.parse('count = 42')).toEqual({ count: 42 });
  });

  it('float', () => {
    expect(TOMLParser.parse('pi = 3.14')).toEqual({ pi: 3.14 });
  });

  it('boolean', () => {
    expect(TOMLParser.parse('on = true\noff = false')).toEqual({ on: true, off: false });
  });

  it('comment', () => {
    expect(TOMLParser.parse('# comment\nx = 1')).toEqual({ x: 1 });
  });

  it('multiple', () => {
    const r = TOMLParser.parse('a = 1\nb = 2');
    expect(r).toEqual({ a: 1, b: 2 });
  });
});

describe('TOMLParser — sections', () => {
  it('section', () => {
    const r = TOMLParser.parse('[server]\nport = 8080');
    expect(r).toEqual({ server: { port: 8080 } });
  });

  it('nested section', () => {
    const r = TOMLParser.parse('[a.b]\nx = 1');
    expect(r).toEqual({ a: { b: { x: 1 } } });
  });

  it('multiple sections', () => {
    const r = TOMLParser.parse('[a]\nx=1\n[b]\ny=2');
    expect(r).toEqual({ a: { x: 1 }, b: { y: 2 } });
  });
});

describe('TOMLParser — arrays', () => {
  it('inline array', () => {
    expect(TOMLParser.parse('arr = [1, 2, 3]')).toEqual({ arr: [1, 2, 3] });
  });

  it('empty array', () => {
    expect(TOMLParser.parse('arr = []')).toEqual({ arr: [] });
  });

  it('array of strings', () => {
    expect(TOMLParser.parse('arr = ["a", "b"]')).toEqual({ arr: ['a', 'b'] });
  });

  it('array of tables', () => {
    const r = TOMLParser.parse('[[fruits]]\nname="apple"\n[[fruits]]\nname="banana"');
    expect(r).toEqual({ fruits: [{ name: 'apple' }, { name: 'banana' }] });
  });
});

describe('TOMLParser — get', () => {
  it('get nested', () => {
    const obj = TOMLParser.parse('[a.b]\nx=1');
    expect(TOMLParser.get(obj, 'a.b.x')).toBe(1);
  });

  it('get missing', () => {
    expect(TOMLParser.get({}, 'x.y')).toBeUndefined();
  });
});

describe('TOMLParser — stringify', () => {
  it('basic', () => {
    const s = TOMLParser.stringify({ x: 1, y: 'foo' });
    expect(s).toContain('x = 1');
    expect(s).toContain('y = "foo"');
  });

  it('with section', () => {
    const s = TOMLParser.stringify({ server: { port: 8080 } });
    expect(s).toContain('[server]');
    expect(s).toContain('port = 8080');
  });
});

/**
 * QueryString.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { QueryString } from '../QueryString';

describe('QueryString — parse simple', () => {
  it('parses flat', () => {
    expect(QueryString.parse('a=1&b=2')).toEqual({ a: '1', b: '2' });
  });

  it('strips ?', () => {
    expect(QueryString.parse('?a=1')).toEqual({ a: '1' });
  });

  it('decodes + as space', () => {
    expect(QueryString.parse('a=hello+world')).toEqual({ a: 'hello world' });
  });

  it('no value', () => {
    expect(QueryString.parse('a')).toEqual({ a: '' });
  });
});

describe('QueryString — parse nested', () => {
  it('bracket nested', () => {
    const r = QueryString.parse('a[b][c]=1');
    expect(r).toEqual({ a: { b: { c: '1' } } });
  });

  it('dot nested', () => {
    const r = QueryString.parse('a.b.c=1');
    expect(r).toEqual({ a: { b: { c: '1' } } });
  });

  it('array', () => {
    const r = QueryString.parse('a[0]=x&a[1]=y');
    expect(r).toEqual({ a: ['x', 'y'] });
  });

  it('mixed array + object', () => {
    const r = QueryString.parse('a[0][name]=foo');
    expect(r).toEqual({ a: [{ name: 'foo' }] });
  });
});

describe('QueryString — stringify', () => {
  it('flat', () => {
    expect(QueryString.stringify({ a: '1', b: '2' })).toBe('a=1&b=2');
  });

  it('nested', () => {
    expect(QueryString.stringify({ a: { b: '1' } })).toBe('a[b]=1');
  });

  it('array', () => {
    expect(QueryString.stringify({ a: ['x', 'y'] })).toBe('a[0]=x&a[1]=y');
  });

  it('null value', () => {
    expect(QueryString.stringify({ a: null })).toBe('a');
  });
});

describe('QueryString — round trip', () => {
  it('flat round trip', () => {
    const original = 'a=1&b=2';
    expect(QueryString.stringify(QueryString.parse(original) as Record<string, string>)).toBe(original);
  });
});

describe('QueryString — get/set', () => {
  it('get nested', () => {
    const r = QueryString.parse('a.b.c=1');
    expect(QueryString.get(r, 'a.b.c')).toBe('1');
  });

  it('get missing', () => {
    expect(QueryString.get({}, 'a.b.c')).toBe(undefined);
  });

  it('set nested', () => {
    const r: Record<string, unknown> = {};
    QueryString.set(r, 'a.b.c', '1');
    expect(r).toEqual({ a: { b: { c: '1' } } });
  });
});

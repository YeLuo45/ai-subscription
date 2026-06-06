/**
 * URLSearchParamsParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { URLSearchParamsParser } from '../URLSearchParamsParser';

describe('URLSearchParamsParser — parse', () => {
  it('parses simple', () => {
    const p = new URLSearchParamsParser('a=1&b=2');
    expect(p.get('a')).toBe('1');
    expect(p.get('b')).toBe('2');
  });

  it('strips leading ?', () => {
    const p = new URLSearchParamsParser('?a=1');
    expect(p.get('a')).toBe('1');
  });

  it('decodes percent encoding', () => {
    const p = new URLSearchParamsParser('name=hello%20world');
    expect(p.get('name')).toBe('hello world');
  });

  it('decodes + as space', () => {
    const p = new URLSearchParamsParser('name=hello+world');
    expect(p.get('name')).toBe('hello world');
  });

  it('handles empty value', () => {
    const p = new URLSearchParamsParser('a=');
    expect(p.get('a')).toBe('');
  });

  it('handles no value', () => {
    const p = new URLSearchParamsParser('a');
    expect(p.get('a')).toBe('');
  });

  it('multi-value', () => {
    const p = new URLSearchParamsParser('a=1&a=2&a=3');
    expect(p.getAll('a')).toEqual(['1', '2', '3']);
  });
});

describe('URLSearchParamsParser — append/set/delete', () => {
  it('append', () => {
    const p = new URLSearchParamsParser();
    p.append('a', '1');
    p.append('a', '2');
    expect(p.getAll('a')).toEqual(['1', '2']);
  });

  it('set overwrites', () => {
    const p = new URLSearchParamsParser('a=1&a=2');
    p.set('a', 'X');
    expect(p.getAll('a')).toEqual(['X']);
  });

  it('delete', () => {
    const p = new URLSearchParamsParser('a=1&b=2');
    p.delete('a');
    expect(p.has('a')).toBe(false);
  });

  it('has', () => {
    const p = new URLSearchParamsParser('a=1');
    expect(p.has('a')).toBe(true);
    expect(p.has('b')).toBe(false);
  });
});

describe('URLSearchParamsParser — toString', () => {
  it('round trip', () => {
    const original = 'a=1&b=2';
    const p = new URLSearchParamsParser(original);
    expect(p.toString()).toBe(original);
  });

  it('encodes special chars', () => {
    const p = new URLSearchParamsParser();
    p.append('q', 'hello world');
    expect(p.toString()).toBe('q=hello%20world');
  });
});

describe('URLSearchParamsParser — toObject', () => {
  it('last value wins', () => {
    const p = new URLSearchParamsParser('a=1&a=2');
    expect(p.toObject()).toEqual({ a: '2' });
  });
});

describe('URLSearchParamsParser — from object', () => {
  it('init with object', () => {
    const p = new URLSearchParamsParser({ x: '1', y: '2' });
    expect(p.get('x')).toBe('1');
  });

  it('init with array values', () => {
    const p = new URLSearchParamsParser({ x: ['1', '2'] });
    expect(p.getAll('x')).toEqual(['1', '2']);
  });
});

describe('URLSearchParamsParser — sort', () => {
  it('sorts', () => {
    const p = new URLSearchParamsParser('c=3&a=1&b=2');
    p.sort();
    expect(p.keys()).toEqual(['a', 'b', 'c']);
  });
});

describe('URLSearchParamsParser — size/keys/values', () => {
  const p = new URLSearchParamsParser('a=1&b=2&a=3');

  it('size', () => {
    expect(p.size).toBe(3);
  });

  it('keys unique', () => {
    expect(p.keys()).toEqual(['a', 'b']);
  });

  it('allKeys', () => {
    expect(p.allKeys()).toEqual(['a', 'a', 'b']);
  });

  it('values', () => {
    expect(p.values()).toEqual(['1', '3', '2']);
  });

  it('entries', () => {
    expect(p.entries()).toEqual([['a', '1'], ['a', '3'], ['b', '2']]);
  });
});

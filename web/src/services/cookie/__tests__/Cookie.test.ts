/**
 * Cookie.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Cookie } from '../Cookie';

describe('Cookie — parse', () => {
  it('single', () => {
    const c = Cookie.parse('a=1');
    expect(c.get('a')).toBe('1');
  });

  it('multiple', () => {
    const c = Cookie.parse('a=1; b=2');
    expect(c.get('a')).toBe('1');
    expect(c.get('b')).toBe('2');
  });

  it('decodes value', () => {
    const c = Cookie.parse('name=hello%20world');
    expect(c.get('name')).toBe('hello world');
  });

  it('whitespace', () => {
    const c = Cookie.parse('a = 1 ; b = 2');
    expect(c.get('a')).toBe('1');
  });

  it('empty value', () => {
    const c = Cookie.parse('a=');
    expect(c.get('a')).toBe('');
  });
});

describe('Cookie — serialize', () => {
  it('simple', () => {
    expect(Cookie.serialize('a', '1')).toBe('a=1');
  });

  it('encodes value', () => {
    expect(Cookie.serialize('a', 'hello world')).toBe('a=hello%20world');
  });

  it('with options', () => {
    const s = Cookie.serialize('a', '1', { path: '/', secure: true, httpOnly: true });
    expect(s).toContain('Path=/');
    expect(s).toContain('Secure');
    expect(s).toContain('HttpOnly');
  });

  it('with expires', () => {
    const d = new Date(2025, 0, 1);
    const s = Cookie.serialize('a', '1', { expires: d });
    expect(s).toContain('Expires=');
  });

  it('with maxAge', () => {
    expect(Cookie.serialize('a', '1', { maxAge: 3600 })).toContain('Max-Age=3600');
  });

  it('with sameSite', () => {
    expect(Cookie.serialize('a', '1', { sameSite: 'Strict' })).toContain('SameSite=Strict');
  });
});

describe('Cookie — get/set/has/delete', () => {
  const c = Cookie.parse('a=1');

  it('set', () => {
    c.set('b', '2');
    expect(c.get('b')).toBe('2');
  });

  it('has', () => {
    expect(c.has('a')).toBe(true);
    expect(c.has('x')).toBe(false);
  });

  it('delete', () => {
    expect(c.delete('a')).toBe(true);
    expect(c.has('a')).toBe(false);
  });
});

describe('Cookie — keys/values/size/entries', () => {
  const c = Cookie.parse('a=1; b=2; c=3');

  it('keys', () => {
    expect(c.keys()).toEqual(['a', 'b', 'c']);
  });

  it('values', () => {
    expect(c.values()).toEqual(['1', '2', '3']);
  });

  it('size', () => {
    expect(c.size).toBe(3);
  });

  it('entries', () => {
    expect(c.entries().length).toBe(3);
  });

  it('toObject', () => {
    expect(c.toObject()).toEqual({ a: '1', b: '2', c: '3' });
  });
});

describe('Cookie — toString', () => {
  it('serializes back', () => {
    const c = new (class extends Cookie { constructor() { super(); } })();
    c.set('a', '1');
    c.set('b', '2');
    expect(c.toString()).toBe('a=1; b=2');
  });
});

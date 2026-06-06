/**
 * Hostname.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Hostname } from '../Hostname';

describe('Hostname — isValid', () => {
  it('valid', () => {
    expect(Hostname.isValid('example.com')).toBe(true);
    expect(Hostname.isValid('sub.example.com')).toBe(true);
    expect(Hostname.isValid('a-b.example.com')).toBe(true);
  });

  it('no dot', () => {
    expect(Hostname.isValid('localhost')).toBe(false);
  });

  it('leading hyphen', () => {
    expect(Hostname.isValid('-foo.com')).toBe(false);
  });

  it('trailing hyphen', () => {
    expect(Hostname.isValid('foo-.com')).toBe(false);
  });

  it('too long label', () => {
    expect(Hostname.isValid('a'.repeat(64) + '.com')).toBe(false);
  });

  it('invalid char', () => {
    expect(Hostname.isValid('foo_bar.com')).toBe(false);
  });

  it('numeric TLD', () => {
    expect(Hostname.isValid('foo.123')).toBe(false);
  });

  it('too long total', () => {
    expect(Hostname.isValid('a'.repeat(254))).toBe(false);
  });
});

describe('Hostname — parse', () => {
  it('parses', () => {
    const h = Hostname.parse('www.example.com');
    expect(h.tld()).toBe('com');
    expect(h.sld()).toBe('example');
  });

  it('throws on invalid', () => {
    expect(() => Hostname.parse('garbage')).toThrow();
  });
});

describe('Hostname — labels', () => {
  const h = new Hostname('a.b.c.d.com');

  it('labelCount', () => {
    expect(h.labelCount()).toBe(5);
  });

  it('tld', () => {
    expect(h.tld()).toBe('com');
  });

  it('sld', () => {
    expect(h.sld()).toBe('d');
  });
});

describe('Hostname — relationships', () => {
  it('isSubdomainOf', () => {
    expect(new Hostname('a.b.example.com').isSubdomainOf('example.com')).toBe(true);
  });

  it('not subdomain', () => {
    expect(new Hostname('example.com').isSubdomainOf('example.com')).toBe(false);
  });

  it('parent', () => {
    expect(new Hostname('a.b.example.com').parent()).toBe('b.example.com');
  });
});

describe('Hostname — checks', () => {
  it('isIPLike', () => {
    expect(new Hostname('1.2.3.4').isIPLike()).toBe(true);
  });

  it('not IPLike', () => {
    expect(new Hostname('example.com').isIPLike()).toBe(false);
  });

  it('isLocalhost', () => {
    expect(new Hostname('api.localhost').isLocalhost()).toBe(true);
  });

  it('toString', () => {
    expect(new Hostname('a.b.com').toString()).toBe('a.b.com');
  });
});

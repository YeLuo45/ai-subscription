/**
 * URIParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { URIParser } from '../URIParser';

describe('URIParser — basic', () => {
  it('full URI', () => {
    const r = URIParser.parse('https://user:pass@example.com:8080/path?q=1#h');
    expect(r.scheme).toBe('https');
    expect(r.userinfo).toBe('user:pass');
    expect(r.host).toBe('example.com');
    expect(r.port).toBe('8080');
    expect(r.path).toBe('/path');
    expect(r.query).toBe('q=1');
    expect(r.fragment).toBe('h');
  });

  it('simple', () => {
    const r = URIParser.parse('http://example.com/');
    expect(r.scheme).toBe('http');
    expect(r.host).toBe('example.com');
    expect(r.path).toBe('/');
  });

  it('relative', () => {
    const r = URIParser.parse('/path/to');
    expect(r.scheme).toBe('');
    expect(r.path).toBe('/path/to');
  });

  it('no authority', () => {
    const r = URIParser.parse('mailto:foo@bar.com');
    expect(r.scheme).toBe('mailto');
    expect(r.path).toBe('foo@bar.com');
  });

  it('user only', () => {
    const r = URIParser.parse('https://user@example.com');
    expect(r.userinfo).toBe('user');
  });

  it('with query', () => {
    const r = URIParser.parse('/path?a=1&b=2');
    expect(r.query).toBe('a=1&b=2');
  });

  it('with fragment', () => {
    expect(URIParser.parse('/path#h').fragment).toBe('h');
  });
});

describe('URIParser — stringify', () => {
  it('build', () => {
    const u = URIParser.stringify({ scheme: 'https', host: 'example.com', path: '/p', query: 'q=1', fragment: 'h' });
    expect(u).toBe('https://example.com/p?q=1#h');
  });

  it('round trip', () => {
    const u = 'https://example.com:8080/path?q=1#h';
    const p = URIParser.parse(u);
    expect(URIParser.stringify(p)).toBe(u);
  });
});

describe('URIParser — checks', () => {
  it('isAbsolute', () => {
    expect(URIParser.isAbsolute('https://x.com')).toBe(true);
    expect(URIParser.isAbsolute('/x')).toBe(false);
  });

  it('isRelative', () => {
    expect(URIParser.isRelative('/x')).toBe(true);
    expect(URIParser.isRelative('https://x.com')).toBe(false);
  });
});

describe('URIParser — normalize', () => {
  it('lowercase scheme/host', () => {
    expect(URIParser.normalize('HTTPS://EXAMPLE.COM/')).toContain('https');
    expect(URIParser.normalize('HTTPS://EXAMPLE.COM/')).toContain('example.com');
  });

  it('remove default port', () => {
    const r = URIParser.normalize('http://example.com:80/');
    expect(r).not.toContain(':80');
  });

  it('keep non-default', () => {
    const r = URIParser.normalize('http://example.com:8080/');
    expect(r).toContain('8080');
  });
});

describe('URIParser — getters', () => {
  it('getScheme', () => {
    expect(URIParser.getScheme('https://x')).toBe('https');
  });

  it('getPath', () => {
    expect(URIParser.getPath('https://x.com/a/b')).toBe('/a/b');
  });
});

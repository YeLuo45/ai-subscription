/**
 * URLBuilder.test.ts — Pure unit tests for URL builder
 */

import { describe, it, expect } from 'vitest';
import { URLBuilder } from '../URLBuilder';

describe('URLBuilder — parse', () => {
  it('parses full URL', () => {
    const p = URLBuilder.parse('https://user:pass@example.com:8080/path?q=1#frag');
    expect(p.protocol).toBe('https:');
    expect(p.username).toBe('user');
    expect(p.password).toBe('pass');
    expect(p.host).toBe('example.com:8080');
    expect(p.port).toBe('8080');
    expect(p.pathname).toBe('/path');
    expect(p.hash).toBe('#frag');
    expect(p.searchParams.q).toBe('1');
  });

  it('parses without port', () => {
    const p = URLBuilder.parse('https://example.com/');
    expect(p.port).toBe('');
  });
});

describe('URLBuilder — build', () => {
  it('builds basic URL', () => {
    const u = URLBuilder.build({
      protocol: 'https:',
      host: 'example.com',
      pathname: '/foo',
    });
    expect(u).toBe('https://example.com/foo');
  });

  it('builds with port', () => {
    const u = URLBuilder.build({
      protocol: 'http:',
      host: 'example.com',
      port: '8080',
    });
    expect(u).toBe('http://example.com:8080/');
  });

  it('builds with user info', () => {
    const u = URLBuilder.build({
      protocol: 'https:',
      host: 'example.com',
      username: 'user',
      password: 'pass',
    });
    expect(u).toBe('https://user:pass@example.com/');
  });

  it('builds with search params', () => {
    const u = URLBuilder.build({
      protocol: 'https:',
      host: 'example.com',
      pathname: '/q',
      searchParams: { a: '1', b: '2' },
    });
    expect(u).toContain('a=1');
    expect(u).toContain('b=2');
  });
});

describe('URLBuilder — params', () => {
  it('set param', () => {
    const u = URLBuilder.setParam('https://example.com/?a=1', 'b', '2');
    expect(u).toContain('a=1');
    expect(u).toContain('b=2');
  });

  it('remove param', () => {
    const u = URLBuilder.removeParam('https://example.com/?a=1&b=2', 'a');
    expect(u).not.toContain('a=');
    expect(u).toContain('b=2');
  });

  it('get param', () => {
    expect(URLBuilder.getParam('https://example.com/?a=1', 'a')).toBe('1');
    expect(URLBuilder.getParam('https://example.com/', 'a')).toBe(null);
  });
});

describe('URLBuilder — resolve', () => {
  it('resolves relative', () => {
    const u = URLBuilder.resolvePath('https://example.com/a/b', '../c');
    expect(u).toBe('https://example.com/c');
  });

  it('absolute stays', () => {
    const u = URLBuilder.resolvePath('https://example.com/a/b', 'https://other.com/x');
    expect(u).toBe('https://other.com/x');
  });
});

describe('URLBuilder — isAbsolute', () => {
  it('detects absolute', () => {
    expect(URLBuilder.isAbsolute('https://example.com')).toBe(true);
    expect(URLBuilder.isAbsolute('not a url')).toBe(false);
  });
});

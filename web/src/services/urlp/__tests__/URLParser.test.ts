/**
 * URLParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { URLParser } from '../URLParser';

describe('URLParser — basic', () => {
  it('full URL', () => {
    const r = URLParser.parse('https://user:pass@example.com:8080/path?q=1#h');
    expect(r.protocol).toBe('https');
    expect(r.username).toBe('user');
    expect(r.password).toBe('pass');
    expect(r.hostname).toBe('example.com');
    expect(r.port).toBe('8080');
    expect(r.pathname).toBe('/path');
    expect(r.search).toBe('?q=1');
    expect(r.hash).toBe('#h');
  });

  it('simple URL', () => {
    const r = URLParser.parse('https://example.com/');
    expect(r.protocol).toBe('https');
    expect(r.hostname).toBe('example.com');
    expect(r.pathname).toBe('/');
  });

  it('no path', () => {
    const r = URLParser.parse('https://example.com');
    expect(r.pathname).toBe('/');
  });

  it('only path', () => {
    const r = URLParser.parse('/path/to');
    expect(r.pathname).toBe('/path/to');
    expect(r.protocol).toBe('');
  });

  it('with port', () => {
    expect(URLParser.parse('http://localhost:3000').port).toBe('3000');
  });

  it('no port', () => {
    expect(URLParser.parse('http://example.com').port).toBe('');
  });

  it('user only', () => {
    const r = URLParser.parse('https://user@example.com');
    expect(r.username).toBe('user');
    expect(r.password).toBe('');
  });
});

describe('URLParser — build', () => {
  it('toString', () => {
    const u = URLParser.toString({
      protocol: 'https',
      hostname: 'example.com',
      pathname: '/path',
      search: '?q=1',
      hash: '#h',
      port: '',
      username: '',
      password: '',
      host: '',
      origin: '',
      href: '',
    });
    expect(u).toBe('https://example.com/path?q=1#h');
  });
});

describe('URLParser — query', () => {
  it('getParam', () => {
    expect(URLParser.getParam('https://example.com/?a=1&b=2', 'a')).toBe('1');
  });

  it('getParam missing', () => {
    expect(URLParser.getParam('https://example.com/', 'x')).toBe(null);
  });

  it('setParam', () => {
    const u = URLParser.setParam('https://example.com/?a=1', 'b', '2');
    expect(u).toContain('b=2');
  });
});

describe('URLParser — resolve', () => {
  it('absolute', () => {
    const r = URLParser.resolve('https://example.com/foo/', 'https://other.com/bar');
    expect(r).toBe('https://other.com/bar');
  });

  it('relative path', () => {
    const r = URLParser.resolve('https://example.com/foo/', 'bar');
    expect(r).toBe('https://example.com/foo/bar');
  });

  it('absolute path', () => {
    const r = URLParser.resolve('https://example.com/foo/', '/x');
    expect(r).toBe('https://example.com/x');
  });
});

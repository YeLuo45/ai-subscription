/**
 * URLValidator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { URLValidator } from '../URLValidator';

describe('URLValidator — basic', () => {
  it('validates http URL', () => {
    expect(URLValidator.isValid('http://example.com')).toBe(true);
  });

  it('validates https URL', () => {
    expect(URLValidator.isValid('https://example.com')).toBe(true);
  });

  it('validates URL with path', () => {
    expect(URLValidator.isValid('https://example.com/path/to/page')).toBe(true);
  });

  it('rejects empty', () => {
    expect(URLValidator.isValid('')).toBe(false);
  });

  it('rejects with spaces', () => {
    expect(URLValidator.isValid('http://example .com')).toBe(false);
  });

  it('rejects too long', () => {
    expect(URLValidator.isValid('https://a.com/' + 'a'.repeat(2100))).toBe(false);
  });

  it('rejects non-http protocols', () => {
    expect(URLValidator.isValid('javascript:alert(1)')).toBe(false);
  });

  it('accepts ftp', () => {
    expect(URLValidator.isValid('ftp://files.example.com')).toBe(true);
  });
});

describe('URLValidator — protocol/host', () => {
  it('getProtocol', () => {
    expect(URLValidator.getProtocol('https://example.com')).toBe('https');
  });

  it('getHostname', () => {
    expect(URLValidator.getHostname('https://www.example.com/path')).toBe('www.example.com');
  });

  it('getPort', () => {
    expect(URLValidator.getPort('http://example.com:8080')).toBe(8080);
  });

  it('isSecure', () => {
    expect(URLValidator.isSecure('https://example.com')).toBe(true);
    expect(URLValidator.isSecure('http://example.com')).toBe(false);
  });
});

describe('URLValidator — special', () => {
  it('isIP IPv4', () => {
    expect(URLValidator.isIP('192.168.1.1')).toBe(true);
  });

  it('isIP invalid', () => {
    expect(URLValidator.isIP('999.999.999.999')).toBe(false);
  });

  it('isLocalhost', () => {
    expect(URLValidator.isLocalhost('http://localhost:3000')).toBe(true);
    expect(URLValidator.isLocalhost('http://127.0.0.1')).toBe(true);
    expect(URLValidator.isLocalhost('http://example.com')).toBe(false);
  });
});

describe('URLValidator — normalize', () => {
  it('strips fragment', () => {
    expect(URLValidator.normalize('https://example.com/page#section')).toBe('https://example.com/page');
  });
});

describe('URLValidator — trusted domain', () => {
  it('matches exact', () => {
    expect(URLValidator.isTrustedDomain('https://example.com/path', ['example.com'])).toBe(true);
  });

  it('matches subdomain', () => {
    expect(URLValidator.isTrustedDomain('https://api.example.com', ['example.com'])).toBe(true);
  });

  it('rejects unrelated', () => {
    expect(URLValidator.isTrustedDomain('https://evil.com', ['example.com'])).toBe(false);
  });

  it('rejects similar but not subdomain', () => {
    expect(URLValidator.isTrustedDomain('https://notexample.com', ['example.com'])).toBe(false);
  });
});

describe('URLValidator — require protocol', () => {
  it('rejects no protocol when required', () => {
    expect(URLValidator.isValid('example.com', { requireProtocol: true })).toBe(false);
  });

  it('accepts no protocol when not required', () => {
    expect(URLValidator.isValid('example.com', { requireProtocol: false })).toBe(true);
  });
});

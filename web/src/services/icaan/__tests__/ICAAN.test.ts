/**
 * ICAAN.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ICAAN } from '../ICAAN';

describe('ICAAN — email', () => {
  it('valid email', () => {
    expect(ICAAN.isValidEmail('user@example.com')).toBe(true);
  });

  it('valid with subdomain', () => {
    expect(ICAAN.isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('invalid no @', () => {
    expect(ICAAN.isValidEmail('userexample.com')).toBe(false);
  });

  it('invalid no domain', () => {
    expect(ICAAN.isValidEmail('user@')).toBe(false);
  });

  it('invalid empty', () => {
    expect(ICAAN.isValidEmail('')).toBe(false);
  });

  it('too long', () => {
    expect(ICAAN.isValidEmail('a'.repeat(250) + '@x.com')).toBe(false);
  });
});

describe('ICAAN — domain', () => {
  it('valid domain', () => {
    expect(ICAAN.isValidDomain('example.com')).toBe(true);
  });

  it('valid subdomain', () => {
    expect(ICAAN.isValidDomain('mail.example.co.uk')).toBe(true);
  });

  it('invalid', () => {
    expect(ICAAN.isValidDomain('-example.com')).toBe(false);
  });
});

describe('ICAAN — TLD', () => {
  it('getTLD', () => {
    expect(ICAAN.getTLD('example.com')).toBe('com');
    expect(ICAAN.getTLD('mail.example.co.uk')).toBe('uk');
  });

  it('isCommonTLD', () => {
    expect(ICAAN.isCommonTLD('com')).toBe(true);
    expect(ICAAN.isCommonTLD('xyz')).toBe(false);
  });

  it('isCountryCodeTLD', () => {
    expect(ICAAN.isCountryCodeTLD('cn')).toBe(true);
    expect(ICAAN.isCountryCodeTLD('uk')).toBe(true);
  });
});

describe('ICAAN — email parts', () => {
  it('getDomainFromEmail', () => {
    expect(ICAAN.getDomainFromEmail('user@example.com')).toBe('example.com');
  });

  it('getUsernameFromEmail', () => {
    expect(ICAAN.getUsernameFromEmail('user@example.com')).toBe('user');
  });
});

describe('ICAAN — hostname/IP', () => {
  it('valid hostname', () => {
    expect(ICAAN.isValidHostname('example.com')).toBe(true);
  });

  it('invalid', () => {
    expect(ICAAN.isValidHostname('-bad.com')).toBe(false);
  });

  it('IPv4', () => {
    expect(ICAAN.isIPAddress('192.168.1.1')).toBe(true);
  });

  it('IPv6', () => {
    expect(ICAAN.isIPAddress('::1')).toBe(true);
  });

  it('not IP', () => {
    expect(ICAAN.isIPAddress('example.com')).toBe(false);
  });

  it('invalid IP', () => {
    expect(ICAAN.isIPAddress('999.999.999.999')).toBe(false);
  });
});

describe('ICAAN — sanitize', () => {
  it('lowercase', () => {
    expect(ICAAN.sanitize('  User@Example.COM  ')).toBe('user@example.com');
  });
});

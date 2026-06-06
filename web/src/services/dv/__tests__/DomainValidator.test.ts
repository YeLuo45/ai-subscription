/**
 * DomainValidator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DomainValidator } from '../DomainValidator';

describe('DomainValidator — isEmail', () => {
  it('valid', () => {
    expect(DomainValidator.isEmail('user@example.com')).toBe(true);
    expect(DomainValidator.isEmail('a.b+tag@sub.example.co.uk')).toBe(true);
  });

  it('no @', () => {
    expect(DomainValidator.isEmail('userexample.com')).toBe(false);
  });

  it('no domain', () => {
    expect(DomainValidator.isEmail('user@')).toBe(false);
  });

  it('no TLD', () => {
    expect(DomainValidator.isEmail('user@host')).toBe(false);
  });

  it('too long', () => {
    expect(DomainValidator.isEmail('a'.repeat(255))).toBe(false);
  });
});

describe('DomainValidator — isDomain', () => {
  it('valid', () => {
    expect(DomainValidator.isDomain('example.com')).toBe(true);
    expect(DomainValidator.isDomain('sub.example.co.uk')).toBe(true);
  });

  it('no dot', () => {
    expect(DomainValidator.isDomain('example')).toBe(false);
  });

  it('empty label', () => {
    expect(DomainValidator.isDomain('a..b.com')).toBe(false);
  });

  it('invalid char', () => {
    expect(DomainValidator.isDomain('a_b.com')).toBe(false);
  });
});

describe('DomainValidator — isUrl', () => {
  it('valid', () => {
    expect(DomainValidator.isUrl('https://example.com')).toBe(true);
    expect(DomainValidator.isUrl('http://example.com/path')).toBe(true);
  });

  it('no domain', () => {
    expect(DomainValidator.isUrl('notaurl')).toBe(false);
  });
});

describe('DomainValidator — isHttps/isHttp', () => {
  it('isHttps', () => {
    expect(DomainValidator.isHttps('https://x.com')).toBe(true);
  });

  it('isHttp', () => {
    expect(DomainValidator.isHttp('http://x.com')).toBe(true);
    expect(DomainValidator.isHttp('https://x.com')).toBe(true);
  });
});

describe('DomainValidator — extract', () => {
  it('emailDomain', () => {
    expect(new DomainValidator().emailDomain('a@b.com')).toBe('b.com');
  });

  it('urlDomain', () => {
    expect(DomainValidator.urlDomain('https://www.example.com/path')).toBe('www.example.com');
  });

  it('emailLocal', () => {
    expect(DomainValidator.emailLocal('user@example.com')).toBe('user');
  });
});

describe('DomainValidator — hasValidTld', () => {
  it('valid', () => {
    expect(DomainValidator.hasValidTld('example.com')).toBe(true);
  });

  it('numeric TLD', () => {
    expect(DomainValidator.hasValidTld('example.123')).toBe(false);
  });
});

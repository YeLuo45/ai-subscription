/**
 * ISBNValidator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ISBNValidator } from '../ISBNValidator';

describe('ISBNValidator — ISBN-10', () => {
  it('validates classic ISBN-10', () => {
    expect(ISBNValidator.isValidISBN10('0306406152')).toBe(true);
  });

  it('validates with X check', () => {
    expect(ISBNValidator.isValidISBN10('155404295X')).toBe(true);
  });

  it('handles hyphens', () => {
    expect(ISBNValidator.isValid('0-306-40615-2')).toBe(true);
  });

  it('rejects invalid', () => {
    expect(ISBNValidator.isValidISBN10('0306406153')).toBe(false);
  });
});

describe('ISBNValidator — ISBN-13', () => {
  it('validates classic ISBN-13', () => {
    expect(ISBNValidator.isValidISBN13('9780306406157')).toBe(true);
  });

  it('rejects bad prefix', () => {
    expect(ISBNValidator.isValidISBN13('1234567890123')).toBe(false);
  });

  it('rejects invalid', () => {
    expect(ISBNValidator.isValidISBN13('9780306406158')).toBe(false);
  });
});

describe('ISBNValidator — auto detect', () => {
  it('detects 10', () => {
    expect(ISBNValidator.isValid('0306406152')).toBe(true);
  });

  it('detects 13', () => {
    expect(ISBNValidator.isValid('9780306406157')).toBe(true);
  });

  it('rejects other lengths', () => {
    expect(ISBNValidator.isValid('123456')).toBe(false);
  });
});

describe('ISBNValidator — toISBN13', () => {
  it('converts ISBN-10 to 13', () => {
    const r = ISBNValidator.toISBN13('0306406152');
    expect(r).toBe('9780306406157');
  });

  it('rejects invalid', () => {
    expect(ISBNValidator.toISBN13('1234567890')).toBe(null);
  });
});

describe('ISBNValidator — format', () => {
  it('formats 13-digit', () => {
    expect(ISBNValidator.format('9780306406157')).toBe('978-0-306-40615-7');
  });

  it('formats 10-digit', () => {
    expect(ISBNValidator.format('0306406152')).toBe('0-3064-0615-2');
  });
});

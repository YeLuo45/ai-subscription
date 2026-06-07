/**
 * ISBN.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ISBN } from '../ISBN';

describe('ISBN — version', () => {
  it('detect 10', () => {
    expect(ISBN.version('0306406152')).toBe(10);
  });

  it('detect 13', () => {
    expect(ISBN.version('9780306406157')).toBe(13);
  });

  it('invalid', () => {
    expect(ISBN.version('123')).toBeNull();
  });
});

describe('ISBN — validate', () => {
  it('valid 10', () => {
    expect(ISBN.isValid('0306406152')).toBe(true);
  });

  it('valid 10 with X', () => {
    expect(ISBN.isValid('020161622X')).toBe(true);
  });

  it('invalid 10', () => {
    expect(ISBN.isValid('0306406151')).toBe(false);
  });

  it('valid 13', () => {
    expect(ISBN.isValid('9780306406157')).toBe(true);
  });

  it('invalid 13', () => {
    expect(ISBN.isValid('9780306406158')).toBe(false);
  });

  it('with hyphens', () => {
    expect(ISBN.isValid('978-0-306-40615-7')).toBe(true);
  });
});

describe('ISBN — convert', () => {
  it('to 13', () => {
    expect(ISBN.to13('0306406152')).toBe('9780306406157');
  });

  it('to 10', () => {
    expect(ISBN.to10('9780306406157')).toBe('0306406152');
  });

  it('roundtrip', () => {
    const i = '0306406152';
    expect(ISBN.to10(ISBN.to13(i))).toBe(i);
  });
});

describe('ISBN — format/prefix', () => {
  it('format 13', () => {
    expect(ISBN.format('9780306406157')).toBe('978-0-3064-0615-7');
  });

  it('getPrefix', () => {
    expect(ISBN.getPrefix('9780306406157')).toBe('978');
  });
});

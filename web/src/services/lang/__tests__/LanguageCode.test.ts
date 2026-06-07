/**
 * LanguageCode.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { LanguageCode } from '../LanguageCode';

describe('LanguageCode — find', () => {
  it('by code', () => {
    const l = LanguageCode.findByCode('en');
    expect(l?.name).toBe('English');
  });

  it('by code uppercase', () => {
    const l = LanguageCode.findByCode('EN');
    expect(l?.name).toBe('English');
  });

  it('by name', () => {
    const l = LanguageCode.findByName('Chinese');
    expect(l?.code).toBe('zh');
  });

  it('not found', () => {
    expect(LanguageCode.findByCode('xx')).toBeNull();
  });
});

describe('LanguageCode — list', () => {
  it('all', () => {
    expect(LanguageCode.list().length).toBeGreaterThan(0);
  });

  it('RTL', () => {
    const r = LanguageCode.listRTL();
    expect(r.length).toBeGreaterThan(0);
    r.forEach((l) => expect(l.direction).toBe('rtl'));
  });

  it('by family', () => {
    const ie = LanguageCode.listByFamily('Indo-European');
    expect(ie.length).toBeGreaterThan(0);
  });
});

describe('LanguageCode — direction', () => {
  it('isRTL Arabic', () => {
    expect(LanguageCode.isRTL('ar')).toBe(true);
  });

  it('not RTL English', () => {
    expect(LanguageCode.isRTL('en')).toBe(false);
  });
});

describe('LanguageCode — validate', () => {
  it('valid', () => {
    expect(LanguageCode.isValid('en')).toBe(true);
  });

  it('invalid', () => {
    expect(LanguageCode.isValid('xx')).toBe(false);
  });
});

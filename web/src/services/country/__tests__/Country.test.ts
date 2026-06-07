/**
 * Country.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Country } from '../Country';

describe('Country — find', () => {
  it('by alpha2', () => {
    const c = Country.findByAlpha2('US');
    expect(c?.name).toBe('United States');
  });

  it('by alpha2 lowercase', () => {
    const c = Country.findByAlpha2('us');
    expect(c?.name).toBe('United States');
  });

  it('by alpha3', () => {
    const c = Country.findByAlpha3('CHN');
    expect(c?.alpha2).toBe('CN');
  });

  it('by numeric', () => {
    const c = Country.findByNumeric('840');
    expect(c?.alpha2).toBe('US');
  });

  it('by name', () => {
    const c = Country.findByName('China');
    expect(c?.alpha2).toBe('CN');
  });

  it('not found', () => {
    expect(Country.findByAlpha2('XX')).toBeNull();
  });
});

describe('Country — list', () => {
  it('all', () => {
    expect(Country.list().length).toBeGreaterThan(0);
  });

  it('by region Asia', () => {
    const list = Country.listByRegion('Asia');
    expect(list.length).toBeGreaterThan(0);
    list.forEach((c) => expect(c.region).toBe('Asia'));
  });

  it('by region unknown', () => {
    expect(Country.listByRegion('Atlantis').length).toBe(0);
  });
});

describe('Country — flag', () => {
  it('US flag', () => {
    expect(Country.flag('US')).toBe('🇺🇸');
  });

  it('CN flag', () => {
    expect(Country.flag('CN')).toBe('🇨🇳');
  });

  it('invalid', () => {
    expect(Country.flag('XX')).toBe('🇽🇽');
  });
});

describe('Country — validate', () => {
  it('valid', () => {
    expect(Country.isValid('US')).toBe(true);
  });

  it('invalid', () => {
    expect(Country.isValid('XX')).toBe(false);
  });
});

/**
 * Soundex2.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Soundex2 } from '../Soundex2';

describe('Soundex2 — soundex', () => {
  it('Robert', () => {
    expect(Soundex2.soundex('Robert')).toBe('R163');
  });

  it('Rupert', () => {
    expect(Soundex2.soundex('Rupert')).toBe('R163');
  });

  it('Rubin', () => {
    expect(Soundex2.soundex('Rubin')).toBe('R150');
  });

  it('Ashcraft', () => {
    expect(Soundex2.soundex('Ashcraft')).toMatch(/^A261|A226/);
  });

  it('Tymczak', () => {
    expect(Soundex2.soundex('Tymczak')).toMatch(/^T522/);
  });

  it('empty', () => {
    expect(Soundex2.soundex('')).toBe('');
  });

  it('case insensitive', () => {
    expect(Soundex2.soundex('robert')).toBe('R163');
  });
});

describe('Soundex2 — refined', () => {
  it('basic', () => {
    expect(Soundex2.refinedSoundex('Robert')).toBe('Rbrd');
  });

  it('case insensitive', () => {
    expect(Soundex2.refinedSoundex('robert')).toBe('Rbrd');
  });

  it('empty', () => {
    expect(Soundex2.refinedSoundex('')).toBe('');
  });
});

describe('Soundex2 — metaphone', () => {
  it('basic', () => {
    const m = Soundex2.metaphone('Thompson');
    expect(m.length).toBeGreaterThan(0);
  });

  it('empty', () => {
    expect(Soundex2.metaphone('')).toBe('');
  });
});

describe('Soundex2 — similar', () => {
  it('similar names', () => {
    expect(Soundex2.similar('Robert', 'Rupert')).toBe(true);
  });

  it('different names', () => {
    expect(Soundex2.similar('Robert', 'Alice')).toBe(false);
  });
});

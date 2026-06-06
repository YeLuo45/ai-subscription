/**
 * JaroWinkler.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JaroWinkler } from '../JaroWinkler';

describe('JaroWinkler — jaro', () => {
  it('identical', () => {
    expect(JaroWinkler.jaro('abc', 'abc')).toBe(1);
  });

  it('empty', () => {
    expect(JaroWinkler.jaro('', 'abc')).toBe(0);
  });

  it('no matches', () => {
    expect(JaroWinkler.jaro('abc', 'xyz')).toBe(0);
  });

  it('MARTHA/MARHTA', () => {
    // Classic Jaro example
    const j = JaroWinkler.jaro('MARTHA', 'MARHTA');
    expect(j).toBeGreaterThan(0.9);
  });
});

describe('JaroWinkler — similarity', () => {
  it('identical', () => {
    expect(JaroWinkler.similarity('abc', 'abc')).toBe(1);
  });

  it('prefix boost', () => {
    const withPrefix = JaroWinkler.similarity('prefix', 'prefxg');
    expect(withPrefix).toBeGreaterThanOrEqual(JaroWinkler.similarity('XYZa', 'XYZb'));
  });

  it('DWAYNE/DUANE', () => {
    // Classic Jaro-Winkler example
    const s = JaroWinkler.similarity('DWAYNE', 'DUANE');
    expect(s).toBeGreaterThan(0.8);
  });
});

describe('JaroWinkler — distance', () => {
  it('identical', () => {
    expect(JaroWinkler.distance('abc', 'abc')).toBe(0);
  });

  it('different', () => {
    expect(JaroWinkler.distance('abc', 'xyz')).toBeGreaterThan(0);
  });
});

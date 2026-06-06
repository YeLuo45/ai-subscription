/**
 * TextStats.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { TextStats } from '../TextStats';

describe('TextStats — syllables', () => {
  it('hello', () => {
    expect(TextStats.syllables('hello')).toBe(2);
  });

  it('cat', () => {
    expect(TextStats.syllables('cat')).toBe(1);
  });

  it('computer', () => {
    expect(TextStats.syllables('computer')).toBe(3);
  });

  it('empty', () => {
    expect(TextStats.syllables('')).toBe(0);
  });

  it('non-alpha', () => {
    expect(TextStats.syllables('123')).toBe(0);
  });
});

describe('TextStats — totalSyllables', () => {
  it('two words', () => {
    expect(TextStats.totalSyllables('hello world')).toBe(3);
  });

  it('empty', () => {
    expect(TextStats.totalSyllables('')).toBe(0);
  });
});

describe('TextStats — readability', () => {
  it('fleschReadingEase', () => {
    const e = TextStats.fleschReadingEase('The cat sat. The dog ran.');
    expect(e).toBeGreaterThan(0);
  });

  it('fleschKincaidGrade', () => {
    const g = TextStats.fleschKincaidGrade('The cat sat. The dog ran.');
    expect(typeof g).toBe('number');
  });

  it('gunningFog', () => {
    const f = TextStats.gunningFog('The cat sat. The dog ran.');
    expect(typeof f).toBe('number');
  });
});

describe('TextStats — averages', () => {
  it('averageWordLength', () => {
    expect(TextStats.averageWordLength('hi hello')).toBe(3.5);
  });

  it('averageSentenceLength', () => {
    const a = TextStats.averageSentenceLength('One two three. Four five.');
    expect(a).toBe(2.5);
  });

  it('lexicalDiversity', () => {
    expect(TextStats.lexicalDiversity('the the the')).toBeCloseTo(1 / 3, 5);
  });

  it('lexicalDiversity all unique', () => {
    expect(TextStats.lexicalDiversity('a b c d')).toBe(1);
  });
});

describe('TextStats — all', () => {
  it('all stats', () => {
    const s = TextStats.all('The quick brown fox jumps.');
    expect(s.words).toBe(5);
    expect(s.sentences).toBe(1);
    expect(typeof s.fleschReadingEase).toBe('number');
  });
});

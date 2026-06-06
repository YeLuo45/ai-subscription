/**
 * StopWords.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { StopWords } from '../StopWords';

describe('StopWords — English', () => {
  const sw = new StopWords('en');

  it('isStopword', () => {
    expect(sw.isStopword('the')).toBe(true);
    expect(sw.isStopword('hello')).toBe(false);
  });

  it('case insensitive', () => {
    expect(sw.isStopword('THE')).toBe(true);
  });

  it('remove from array', () => {
    expect(sw.remove(['the', 'hello', 'a', 'world'])).toEqual(['hello', 'world']);
  });

  it('removeFromText', () => {
    expect(sw.removeFromText('the quick brown fox')).toBe('quick brown fox');
  });

  it('filter stopwords only', () => {
    expect(sw.filter(['the', 'hello', 'a', 'world'])).toEqual(['the', 'a']);
  });

  it('all', () => {
    expect(sw.all().length).toBeGreaterThan(0);
  });

  it('size', () => {
    expect(sw.size).toBeGreaterThan(50);
  });
});

describe('StopWords — Chinese', () => {
  const sw = new StopWords('zh');

  it('chinese stopword', () => {
    expect(sw.isStopword('的')).toBe(true);
  });

  it('non-stopword', () => {
    expect(sw.isStopword('你好')).toBe(false);
  });

  it('remove chinese', () => {
    const r = sw.remove(['的', '你好', '世界']);
    expect(r).toEqual(['你好', '世界']);
  });
});

describe('StopWords — custom', () => {
  it('add custom', () => {
    const sw = new StopWords('en');
    sw.add('foo');
    expect(sw.isStopword('foo')).toBe(true);
  });

  it('remove custom', () => {
    const sw = new StopWords('en');
    sw.add('foo');
    sw.removeWord('foo');
    expect(sw.isStopword('foo')).toBe(false);
  });

  it('extra in constructor', () => {
    const sw = new StopWords('en', ['custom']);
    expect(sw.isStopword('custom')).toBe(true);
  });
});

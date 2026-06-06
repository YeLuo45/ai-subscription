/**
 * SentenceSplitter.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { SentenceSplitter } from '../SentenceSplitter';

describe('SentenceSplitter — English', () => {
  it('one sentence', () => {
    expect(SentenceSplitter.split('Hello world.')).toEqual(['Hello world.']);
  });

  it('two sentences', () => {
    expect(SentenceSplitter.split('Hello world. Foo bar.')).toEqual(['Hello world.', 'Foo bar.']);
  });

  it('mixed punctuation', () => {
    const s = SentenceSplitter.split('Hello! World? Foo.');
    expect(s.length).toBe(3);
  });

  it('empty', () => {
    expect(SentenceSplitter.split('')).toEqual([]);
  });

  it('no punctuation', () => {
    const s = SentenceSplitter.split('hello');
    expect(s.length).toBe(0);
  });
});

describe('SentenceSplitter — abbreviations', () => {
  it('Mr. preserved', () => {
    const s = SentenceSplitter.split('Mr. Smith came. He left.');
    expect(s.length).toBe(2);
  });

  it('Dr. preserved', () => {
    const s = SentenceSplitter.split('Dr. Foo is here. Hello.');
    expect(s.length).toBe(2);
  });

  it('e.g. preserved', () => {
    const s = SentenceSplitter.split('Many fruits e.g. apples. They are good.');
    expect(s.length).toBe(2);
  });
});

describe('SentenceSplitter — Chinese', () => {
  it('chinese period', () => {
    expect(SentenceSplitter.split('你好。世界！')).toEqual(['你好。', '世界！']);
  });

  it('mixed', () => {
    const s = SentenceSplitter.split('Hello. 你好！');
    expect(s.length).toBe(2);
  });
});

describe('SentenceSplitter — count/getAt', () => {
  it('count', () => {
    expect(SentenceSplitter.count('A. B. C.')).toBe(3);
  });

  it('getAt', () => {
    expect(SentenceSplitter.getAt('A. B. C.', 1)).toBe('B.');
  });

  it('getAt out of range', () => {
    expect(SentenceSplitter.getAt('A. B.', 5)).toBe(null);
  });
});

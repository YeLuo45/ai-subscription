/**
 * WordCounter.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { WordCounter } from '../WordCounter';

describe('WordCounter — words', () => {
  it('simple', () => {
    expect(WordCounter.words('hello world')).toBe(2);
  });

  it('multiple spaces', () => {
    expect(WordCounter.words('hello   world')).toBe(2);
  });

  it('tabs/newlines', () => {
    expect(WordCounter.words('hello\tworld\nfoo')).toBe(3);
  });

  it('empty', () => {
    expect(WordCounter.words('')).toBe(0);
  });

  it('whitespace only', () => {
    expect(WordCounter.words('   ')).toBe(0);
  });

  it('leading/trailing', () => {
    expect(WordCounter.words('  hello  ')).toBe(1);
  });
});

describe('WordCounter — characters', () => {
  it('with spaces', () => {
    expect(WordCounter.characters('hello world')).toBe(11);
  });

  it('no spaces', () => {
    expect(WordCounter.charactersNoSpaces('hello world')).toBe(10);
  });

  it('unicode code points', () => {
    expect(WordCounter.characters('中文')).toBe(2);
  });
});

describe('WordCounter — lines', () => {
  it('LF', () => {
    expect(WordCounter.lines('a\nb\nc')).toBe(3);
  });

  it('CRLF', () => {
    expect(WordCounter.lines('a\r\nb\r\nc')).toBe(3);
  });

  it('CR', () => {
    expect(WordCounter.lines('a\rb\rc')).toBe(3);
  });

  it('mixed', () => {
    expect(WordCounter.lines('a\nb\r\nc')).toBe(3);
  });

  it('empty', () => {
    expect(WordCounter.lines('')).toBe(0);
  });

  it('nonEmpty', () => {
    expect(WordCounter.nonEmptyLines('a\n\nb')).toBe(2);
  });
});

describe('WordCounter — sentences', () => {
  it('one', () => {
    expect(WordCounter.sentences('Hello world.')).toBe(1);
  });

  it('multiple', () => {
    expect(WordCounter.sentences('Hello. World! Foo?')).toBe(3);
  });

  it('chinese', () => {
    expect(WordCounter.sentences('你好。世界！')).toBe(2);
  });

  it('no sentence', () => {
    expect(WordCounter.sentences('hello')).toBe(0);
  });
});

describe('WordCounter — paragraphs', () => {
  it('two paragraphs', () => {
    expect(WordCounter.paragraphs('a\n\nb')).toBe(2);
  });

  it('CRLF paragraphs', () => {
    expect(WordCounter.paragraphs('a\r\n\r\nb')).toBe(2);
  });

  it('empty', () => {
    expect(WordCounter.paragraphs('')).toBe(0);
  });
});

describe('WordCounter — all', () => {
  it('all stats', () => {
    const s = WordCounter.all('Hello world. Foo bar.');
    expect(s.words).toBe(4);
    expect(s.sentences).toBe(2);
    expect(s.readingTimeMin).toBe(1);
  });
});

describe('WordCounter — extras', () => {
  it('averageWordLength', () => {
    expect(WordCounter.averageWordLength('hi hello')).toBe(3.5);
  });

  it('longestWord', () => {
    expect(WordCounter.longestWord('hi hello world')).toBe('hello');
  });
});

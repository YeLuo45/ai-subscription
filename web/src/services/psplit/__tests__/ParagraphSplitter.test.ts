/**
 * ParagraphSplitter.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ParagraphSplitter } from '../ParagraphSplitter';

describe('ParagraphSplitter — split', () => {
  it('two paragraphs LF', () => {
    expect(ParagraphSplitter.split('a\n\nb')).toEqual(['a', 'b']);
  });

  it('CRLF', () => {
    expect(ParagraphSplitter.split('a\r\n\r\nb')).toEqual(['a', 'b']);
  });

  it('CR (double)', () => {
    expect(ParagraphSplitter.split('a\r\rb')).toEqual(['a', 'b']);
  });

  it('three paragraphs', () => {
    expect(ParagraphSplitter.split('a\n\nb\n\nc')).toEqual(['a', 'b', 'c']);
  });

  it('empty', () => {
    expect(ParagraphSplitter.split('')).toEqual([]);
  });

  it('whitespace only', () => {
    expect(ParagraphSplitter.split('   \n\n  ')).toEqual([]);
  });

  it('multiline paragraph preserved', () => {
    const result = ParagraphSplitter.split('line1\nline2\n\nline3');
    expect(result[0]).toBe('line1\nline2');
    expect(result[1]).toBe('line3');
  });
});

describe('ParagraphSplitter — count/getAt', () => {
  it('count', () => {
    expect(ParagraphSplitter.count('a\n\nb\n\nc')).toBe(3);
  });

  it('getAt', () => {
    expect(ParagraphSplitter.getAt('a\n\nb', 1)).toBe('b');
  });

  it('getAt out of range', () => {
    expect(ParagraphSplitter.getAt('a', 5)).toBe(null);
  });
});

describe('ParagraphSplitter — join', () => {
  it('join with default', () => {
    expect(ParagraphSplitter.join(['a', 'b'])).toBe('a\n\nb');
  });

  it('join with custom', () => {
    expect(ParagraphSplitter.join(['a', 'b'], '\n---\n')).toBe('a\n---\nb');
  });
});

describe('ParagraphSplitter — normalize', () => {
  it('CRLF to LF', () => {
    expect(ParagraphSplitter.normalize('a\r\nb')).toBe('a\nb');
  });

  it('CR to LF', () => {
    expect(ParagraphSplitter.normalize('a\rb')).toBe('a\nb');
  });
});

describe('ParagraphSplitter — previews', () => {
  it('short', () => {
    expect(ParagraphSplitter.previews('short', 80)).toEqual(['short']);
  });

  it('long with ellipsis', () => {
    const p = ParagraphSplitter.previews('a'.repeat(100), 10);
    expect(p[0]).toContain('...');
  });
});

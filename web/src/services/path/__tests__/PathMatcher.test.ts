/**
 * PathMatcher.test.ts — Pure unit tests for path utilities
 */

import { describe, it, expect } from 'vitest';
import { PathMatcher } from '../PathMatcher';

describe('PathMatcher — normalize', () => {
  it('removes ./ segments', () => {
    expect(PathMatcher.normalize('./a/./b')).toBe('a/b');
  });

  it('handles ..', () => {
    expect(PathMatcher.normalize('a/b/../c')).toBe('a/c');
  });

  it('handles absolute', () => {
    expect(PathMatcher.normalize('/a//b/')).toBe('/a/b');
  });

  it('empty', () => {
    expect(PathMatcher.normalize('')).toBe('.');
  });
});

describe('PathMatcher — join', () => {
  it('joins parts', () => {
    expect(PathMatcher.join('a', 'b', 'c')).toBe('a/b/c');
  });

  it('handles ..', () => {
    expect(PathMatcher.join('a', '..', 'b')).toBe('b');
  });
});

describe('PathMatcher — dirname/basename/extname', () => {
  it('dirname', () => {
    expect(PathMatcher.dirname('/a/b/c.txt')).toBe('/a/b');
    expect(PathMatcher.dirname('a.txt')).toBe('.');
  });

  it('basename', () => {
    expect(PathMatcher.basename('/a/b/c.txt')).toBe('c.txt');
    expect(PathMatcher.basename('a.txt', '.txt')).toBe('a');
  });

  it('extname', () => {
    expect(PathMatcher.extname('a.txt')).toBe('.txt');
    expect(PathMatcher.extname('a')).toBe('');
    expect(PathMatcher.extname('.hidden')).toBe('');
  });
});

describe('PathMatcher — isAbsolute', () => {
  it('detects absolute', () => {
    expect(PathMatcher.isAbsolute('/a/b')).toBe(true);
    expect(PathMatcher.isAbsolute('a/b')).toBe(false);
    expect(PathMatcher.isAbsolute('C:\\Windows')).toBe(true);
  });
});

describe('PathMatcher — relative', () => {
  it('computes relative', () => {
    expect(PathMatcher.relative('/a/b', '/a/c')).toBe('../c');
    expect(PathMatcher.relative('/a/b/c', '/a/b/d')).toBe('../d');
  });

  it('same path', () => {
    expect(PathMatcher.relative('/a/b', '/a/b')).toBe('.');
  });
});

describe('PathMatcher — match', () => {
  it('matches glob', () => {
    expect(PathMatcher.match('foo.txt', '*.txt')).toBe(true);
    expect(PathMatcher.match('foo.ts', '*.txt')).toBe(false);
  });
});

describe('PathMatcher — filter', () => {
  it('filters list', () => {
    const r = PathMatcher.filter(['a.txt', 'b.ts', 'c.txt'], '*.txt');
    expect(r).toEqual(['a.txt', 'c.txt']);
  });
});

describe('PathMatcher — resolve', () => {
  it('resolves from cwd', () => {
    expect(PathMatcher.resolve('/a', 'b', 'c')).toBe('/a/b/c');
  });
});

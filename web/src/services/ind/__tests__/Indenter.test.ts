/**
 * Indenter.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Indenter } from '../Indenter';

describe('Indenter — detect', () => {
  it('spaces 2', () => {
    expect(Indenter.detect('  hello\n  world')).toEqual({ char: ' ', size: 2 });
  });

  it('spaces 4', () => {
    expect(Indenter.detect('    hello\n    world')).toEqual({ char: ' ', size: 4 });
  });

  it('tabs', () => {
    expect(Indenter.detect('\thello\n\tworld')).toEqual({ char: '\t', size: 1 });
  });

  it('no indent', () => {
    expect(Indenter.detect('hello\nworld').char).toBe(' ');
  });
});

describe('Indenter — indent', () => {
  it('basic', () => {
    expect(Indenter.indent('a\nb', '  ')).toBe('  a\n  b');
  });

  it('multiple', () => {
    expect(Indenter.indent('a', '  ', 3)).toBe('      a');
  });

  it('empty lines', () => {
    expect(Indenter.indent('a\n\nb', '  ')).toBe('  a\n\n  b');
  });
});

describe('Indenter — outdent', () => {
  it('basic', () => {
    expect(Indenter.outdent('  a\n  b', '  ')).toBe('a\nb');
  });

  it('partial', () => {
    expect(Indenter.outdent('  a\n    b', '  ')).toBe('a\n  b');
  });
});

describe('Indenter — reindent', () => {
  it('reindent', () => {
    expect(Indenter.reindent('    hello\n    world', '  ', 0)).toBe('hello\nworld');
  });

  it('reindent to 4 spaces', () => {
    expect(Indenter.reindent('  hello', '    ')).toBe('    hello');
  });
});

describe('Indenter — getIndent/level', () => {
  it('getIndent', () => {
    expect(Indenter.getIndent('  hello')).toBe('  ');
    expect(Indenter.getIndent('\thello')).toBe('\t');
  });

  it('level spaces', () => {
    expect(Indenter.level('    hello', '  ')).toBe(2);
  });

  it('level tabs', () => {
    expect(Indenter.level('\t\thello', '\t')).toBe(2);
  });
});

describe('Indenter — trimTrailing', () => {
  it('basic', () => {
    expect(Indenter.trimTrailing('hello   \nworld  ')).toBe('hello\nworld');
  });

  it('no trailing', () => {
    expect(Indenter.trimTrailing('hello\nworld')).toBe('hello\nworld');
  });
});

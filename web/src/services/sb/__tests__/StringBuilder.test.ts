/**
 * StringBuilder.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { StringBuilder } from '../StringBuilder';

describe('StringBuilder — basic', () => {
  it('append', () => {
    const sb = new StringBuilder();
    sb.append('a').append('b').append('c');
    expect(sb.toString()).toBe('abc');
  });

  it('initial', () => {
    const sb = new StringBuilder('hello');
    expect(sb.toString()).toBe('hello');
  });

  it('empty initial', () => {
    const sb = new StringBuilder();
    expect(sb.toString()).toBe('');
  });

  it('length', () => {
    const sb = new StringBuilder();
    sb.append('hello');
    expect(sb.length).toBe(5);
  });

  it('isEmpty', () => {
    const sb = new StringBuilder();
    expect(sb.isEmpty()).toBe(true);
    sb.append('a');
    expect(sb.isEmpty()).toBe(false);
  });
});

describe('StringBuilder — appendLine', () => {
  it('with text', () => {
    const sb = new StringBuilder();
    sb.appendLine('hello');
    expect(sb.toString()).toBe('hello\n');
  });

  it('empty line', () => {
    const sb = new StringBuilder();
    sb.appendLine();
    expect(sb.toString()).toBe('\n');
  });

  it('multiple lines', () => {
    const sb = new StringBuilder();
    sb.appendLine('a').appendLine('b');
    expect(sb.toString()).toBe('a\nb\n');
  });
});

describe('StringBuilder — appendIf/appendAll/appendJoined', () => {
  it('appendIf true', () => {
    const sb = new StringBuilder();
    sb.appendIf('x', true);
    expect(sb.toString()).toBe('x');
  });

  it('appendIf false', () => {
    const sb = new StringBuilder();
    sb.appendIf('x', false);
    expect(sb.toString()).toBe('');
  });

  it('appendAll', () => {
    const sb = new StringBuilder();
    sb.appendAll(['a', 'b', 'c']);
    expect(sb.toString()).toBe('abc');
  });

  it('appendJoined', () => {
    const sb = new StringBuilder();
    sb.appendJoined(['a', 'b', 'c'], '-');
    expect(sb.toString()).toBe('a-b-c');
  });
});

describe('StringBuilder — clear', () => {
  it('clear', () => {
    const sb = new StringBuilder();
    sb.append('a');
    sb.clear();
    expect(sb.toString()).toBe('');
  });
});

describe('StringBuilder — static', () => {
  it('join', () => {
    expect(StringBuilder.join(['a', 'b', 'c'])).toBe('abc');
  });

  it('repeat', () => {
    expect(StringBuilder.repeat('ab', 3)).toBe('ababab');
  });

  it('repeat zero', () => {
    expect(StringBuilder.repeat('x', 0)).toBe('');
  });

  it('repeat negative', () => {
    expect(() => StringBuilder.repeat('x', -1)).toThrow();
  });
});

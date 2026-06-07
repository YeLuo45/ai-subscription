/**
 * Rope.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Rope } from '../Rope';

describe('Rope — basic', () => {
  it('fromString', () => {
    const r = Rope.fromString('hello');
    expect(r.length()).toBe(5);
    expect(r.toString()).toBe('hello');
  });

  it('charAt', () => {
    const r = Rope.fromString('hello');
    expect(r.charAt(0)).toBe('h');
    expect(r.charAt(4)).toBe('o');
    expect(r.charAt(5)).toBe('');
    expect(r.charAt(-1)).toBe('');
  });
});

describe('Rope — substring', () => {
  it('substring', () => {
    const r = Rope.fromString('hello world');
    expect(r.substring(0, 5)).toBe('hello');
    expect(r.substring(6)).toBe('world');
    expect(r.substring(0)).toBe('hello world');
  });
});

describe('Rope — insert', () => {
  it('insert middle', () => {
    const r = Rope.fromString('hello');
    r.insert(5, ' world');
    expect(r.toString()).toBe('hello world');
  });

  it('insert start', () => {
    const r = Rope.fromString('world');
    r.insert(0, 'hello ');
    expect(r.toString()).toBe('hello world');
  });

  it('insert empty', () => {
    const r = Rope.fromString('hello');
    r.insert(2, '');
    expect(r.toString()).toBe('hello');
  });
});

describe('Rope — delete', () => {
  it('delete middle', () => {
    const r = Rope.fromString('hello world');
    r.delete(5, 6);
    expect(r.toString()).toBe('helloworld');
  });

  it('delete all', () => {
    const r = Rope.fromString('hello');
    r.delete(0, 5);
    expect(r.toString()).toBe('');
  });
});

describe('Rope — fromArray', () => {
  it('build', () => {
    const r = Rope.fromArray(['a', 'b', 'c']);
    expect(r.toString()).toBe('abc');
    expect(r.length()).toBe(3);
  });
});

describe('Rope — long string', () => {
  it('roundtrip with edits', () => {
    const r = Rope.fromString('The quick brown fox');
    r.insert(19, ' jumps');
    r.insert(25, ' over');
    expect(r.toString()).toBe('The quick brown fox jumps over');
    r.delete(0, 4);
    expect(r.toString()).toBe('quick brown fox jumps over');
  });
});

/**
 * PropertiesParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PropertiesParser } from '../PropertiesParser';

describe('PropertiesParser — parse', () => {
  it('simple', () => {
    expect(PropertiesParser.parse('key = value')).toEqual({ key: 'value' });
  });

  it('colon separator', () => {
    expect(PropertiesParser.parse('key:value')).toEqual({ key: 'value' });
  });

  it('space separator', () => {
    expect(PropertiesParser.parse('key value')).toEqual({ key: 'value' });
  });

  it('no space', () => {
    expect(PropertiesParser.parse('key=value')).toEqual({ key: 'value' });
  });

  it('comment', () => {
    expect(PropertiesParser.parse('# comment\nkey=value')).toEqual({ key: 'value' });
  });

  it('! comment', () => {
    expect(PropertiesParser.parse('! comment\nkey=value')).toEqual({ key: 'value' });
  });

  it('multiple', () => {
    const r = PropertiesParser.parse('a=1\nb=2');
    expect(r).toEqual({ a: '1', b: '2' });
  });

  it('line continuation', () => {
    const r = PropertiesParser.parse('key=hello \\\nworld');
    expect(r).toEqual({ key: 'hello world' });
  });

  it('escape n', () => {
    expect(PropertiesParser.parse('key=hello\\nworld')).toEqual({ key: 'hello\nworld' });
  });

  it('unicode escape', () => {
    expect(PropertiesParser.parse('key=\\u4e2d\\u6587')).toEqual({ key: '中文' });
  });
});

describe('PropertiesParser — stringify', () => {
  it('basic', () => {
    expect(PropertiesParser.stringify({ a: '1', b: '2' })).toBe('a = 1\nb = 2');
  });

  it('escape newlines', () => {
    const s = PropertiesParser.stringify({ a: 'hello\nworld' });
    expect(s).toContain('\\n');
  });
});

describe('PropertiesParser — get/set/keys', () => {
  it('get existing', () => {
    const r = PropertiesParser.parse('a=1\nb=2');
    expect(PropertiesParser.get(r, 'a')).toBe('1');
  });

  it('get default', () => {
    expect(PropertiesParser.get({}, 'x', 'default')).toBe('default');
  });

  it('set', () => {
    const r: Record<string, string> = {};
    PropertiesParser.set(r, 'a', '1');
    expect(r.a).toBe('1');
  });

  it('keys', () => {
    const r = PropertiesParser.parse('a=1\nb=2');
    expect(PropertiesParser.keys(r)).toEqual(['a', 'b']);
  });
});

describe('PropertiesParser — unescape/escape', () => {
  it('unescape', () => {
    expect(PropertiesParser.unescape('a\\nb')).toBe('a\nb');
  });

  it('escape', () => {
    expect(PropertiesParser.escape('a=b')).toBe('a\\=b');
  });
});

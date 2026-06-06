/**
 * PlistParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PlistParser } from '../PlistParser';

describe('PlistParser — parse', () => {
  it('string', () => {
    const r = PlistParser.parse('<plist><string>hello</string></plist>');
    expect(r).toBe('hello');
  });

  it('integer', () => {
    expect(PlistParser.parse('<plist><integer>42</integer></plist>')).toBe(42);
  });

  it('real', () => {
    expect(PlistParser.parse('<plist><real>3.14</real></plist>')).toBe(3.14);
  });

  it('true', () => {
    expect(PlistParser.parse('<plist><true/></plist>')).toBe(true);
  });

  it('false', () => {
    expect(PlistParser.parse('<plist><false/></plist>')).toBe(false);
  });

  it('array', () => {
    const r = PlistParser.parse('<plist><array><string>a</string><string>b</string></array></plist>');
    expect(r).toEqual(['a', 'b']);
  });

  it('dict', () => {
    const r = PlistParser.parse('<plist><dict><key>name</key><string>foo</string><key>age</key><integer>42</integer></dict></plist>');
    expect(r).toEqual({ name: 'foo', age: 42 });
  });

  it('nested', () => {
    const xml = '<plist><dict><key>items</key><array><integer>1</integer><integer>2</integer></array></dict></plist>';
    expect(PlistParser.parse(xml)).toEqual({ items: [1, 2] });
  });

  it('escape', () => {
    const r = PlistParser.parse('<plist><string>a &amp; b</string></plist>');
    expect(r).toBe('a & b');
  });

  it('invalid', () => {
    expect(PlistParser.parse('not a plist')).toBe(null);
  });
});

describe('PlistParser — stringify', () => {
  it('string', () => {
    const s = PlistParser.stringify('hello');
    expect(s).toContain('<string>hello</string>');
  });

  it('integer', () => {
    const s = PlistParser.stringify(42);
    expect(s).toContain('<integer>42</integer>');
  });

  it('array', () => {
    const s = PlistParser.stringify(['a', 'b']);
    expect(s).toContain('<array>');
    expect(s).toContain('<string>a</string>');
  });

  it('dict', () => {
    const s = PlistParser.stringify({ name: 'foo' });
    expect(s).toContain('<dict>');
    expect(s).toContain('<key>name</key>');
  });

  it('doctype', () => {
    const s = PlistParser.stringify('x');
    expect(s).toContain('<?xml');
    expect(s).toContain('<plist');
  });
});

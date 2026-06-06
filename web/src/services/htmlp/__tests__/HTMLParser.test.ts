/**
 * HTMLParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { HTMLParser } from '../HTMLParser';

describe('HTMLParser — basic', () => {
  it('simple text', () => {
    const r = HTMLParser.parse('hello');
    expect(r.type).toBe('text');
  });

  it('simple tag', () => {
    const r = HTMLParser.parse('<div>hi</div>');
    expect(r.tagName).toBe('div');
    expect(HTMLParser.getText(r)).toBe('hi');
  });

  it('self-closing', () => {
    const r = HTMLParser.parse('<br/>');
    expect(r.tagName).toBe('br');
  });

  it('void tag', () => {
    const r = HTMLParser.parse('<p>a<br>b</p>');
    const brs = HTMLParser.queryAll(r, 'br');
    expect(brs.length).toBe(1);
  });

  it('attributes', () => {
    const r = HTMLParser.parse('<a href="x" class="y">go</a>');
    expect(r.attributes?.href).toBe('x');
    expect(r.attributes?.class).toBe('y');
  });

  it('nested', () => {
    const r = HTMLParser.parse('<div><span>x</span></div>');
    expect(HTMLParser.getText(r)).toBe('x');
    const spans = HTMLParser.queryAll(r, 'span');
    expect(spans.length).toBe(1);
  });
});

describe('HTMLParser — getText', () => {
  it('nested text', () => {
    const r = HTMLParser.parse('<div>a<span>b</span>c</div>');
    expect(HTMLParser.getText(r)).toBe('abc');
  });
});

describe('HTMLParser — queryAll', () => {
  it('find all', () => {
    const r = HTMLParser.parse('<div><p>a</p><p>b</p><p>c</p></div>');
    const ps = HTMLParser.queryAll(r, 'p');
    expect(ps.length).toBe(3);
  });
});

describe('HTMLParser — entities', () => {
  it('escape &', () => {
    const r = HTMLParser.parse('a &amp; b');
    expect(r.content).toBe('a & b');
  });
});

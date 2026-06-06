/**
 * HTMLTokenizer.test.ts — Pure unit tests for HTML tokenizer
 */

import { describe, it, expect } from 'vitest';
import { HTMLTokenizer } from '../HTMLTokenizer';

describe('HTMLTokenizer — tags', () => {
  it('opening tag', () => {
    const r = new HTMLTokenizer().tokenize('<div>');
    expect(r[0].type).toBe('starttag');
    expect(r[0].name).toBe('div');
  });

  it('closing tag', () => {
    const r = new HTMLTokenizer().tokenize('</div>');
    expect(r[0].type).toBe('endtag');
    expect(r[0].name).toBe('div');
  });

  it('self-closing tag', () => {
    const r = new HTMLTokenizer().tokenize('<br/>');
    expect(r[0].type).toBe('selfclosing');
    expect(r[0].name).toBe('br');
  });
});

describe('HTMLTokenizer — attributes', () => {
  it('parses attributes', () => {
    const r = new HTMLTokenizer().tokenize('<a href="x" id="1">');
    expect(r[0].attrs.href).toBe('x');
    expect(r[0].attrs.id).toBe('1');
  });

  it('boolean attribute', () => {
    const r = new HTMLTokenizer().tokenize('<input disabled>');
    expect(r[0].attrs.disabled).toBe('');
  });
});

describe('HTMLTokenizer — text', () => {
  it('text content', () => {
    const r = new HTMLTokenizer().tokenize('<p>hello</p>');
    const text = r.find((t) => t.type === 'text');
    expect(text?.value).toBe('hello');
  });

  it('decodes entities', () => {
    const r = new HTMLTokenizer().tokenize('<p>a &amp; b</p>');
    const text = r.find((t) => t.type === 'text');
    expect(text?.value).toBe('a & b');
  });
});

describe('HTMLTokenizer — special', () => {
  it('parses comment', () => {
    const r = new HTMLTokenizer().tokenize('<!-- comment -->');
    expect(r[0].type).toBe('comment');
    expect(r[0].value).toBe(' comment ');
  });

  it('parses DOCTYPE', () => {
    const r = new HTMLTokenizer().tokenize('<!DOCTYPE html>');
    expect(r[0].type).toBe('doctype');
  });

  it('parses CDATA', () => {
    const r = new HTMLTokenizer().tokenize('<![CDATA[raw]]>');
    expect(r[0].type).toBe('cdata');
  });
});

describe('HTMLTokenizer — full doc', () => {
  it('tokenizes complete document', () => {
    const html = '<html><head><title>T</title></head><body><p>Hello</p></body></html>';
    const r = new HTMLTokenizer().tokenize(html);
    expect(r.filter((t) => t.type !== 'text').length).toBeGreaterThan(5);
  });
});

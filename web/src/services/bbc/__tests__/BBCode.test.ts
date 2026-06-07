/**
 * BBCode.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BBCode } from '../BBCode';

describe('BBCode — basic', () => {
  it('bold', () => {
    expect(BBCode.toHtml('[b]hello[/b]')).toContain('<strong>hello</strong>');
  });

  it('italic', () => {
    expect(BBCode.toHtml('[i]hi[/i]')).toContain('<em>hi</em>');
  });

  it('underline', () => {
    expect(BBCode.toHtml('[u]x[/u]')).toContain('<u>x</u>');
  });

  it('strike', () => {
    expect(BBCode.toHtml('[s]x[/s]')).toContain('<s>x</s>');
  });

  it('combined', () => {
    const html = BBCode.toHtml('[i][b]x[/b][/i]');
    expect(html).toContain('<em>');
    expect(html).toContain('<strong>');
  });
});

describe('BBCode — url/img', () => {
  it('url with label', () => {
    const html = BBCode.toHtml('[url=https://x.com]click[/url]');
    expect(html).toContain('href="https://x.com"');
    expect(html).toContain('click');
  });

  it('url simple', () => {
    const html = BBCode.toHtml('[url]https://x.com[/url]');
    expect(html).toContain('href=');
  });

  it('image', () => {
    const html = BBCode.toHtml('[img]pic.jpg[/img]');
    expect(html).toContain('<img');
    expect(html).toContain('pic.jpg');
  });
});

describe('BBCode — quote/code', () => {
  it('quote', () => {
    const html = BBCode.toHtml('[quote]hi[/quote]');
    expect(html).toContain('<blockquote>');
  });

  it('code', () => {
    const html = BBCode.toHtml('[code]x = 1[/code]');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code>');
  });
});

describe('BBCode — color', () => {
  it('color', () => {
    const html = BBCode.toHtml('[color=red]text[/color]');
    expect(html).toContain('color:red');
  });
});

describe('BBCode — strip/validate', () => {
  it('strip', () => {
    expect(BBCode.strip('[b]hello[/b]')).toBe('hello');
  });

  it('validate balanced', () => {
    expect(BBCode.isValid('[b]a[/b]')).toBe(true);
  });

  it('validate unbalanced', () => {
    expect(BBCode.isValid('[b]a')).toBe(false);
  });
});

/**
 * MarkdownHTML.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { MarkdownHTML } from '../MarkdownHTML';

describe('MarkdownHTML — convert', () => {
  it('heading', () => {
    const html = MarkdownHTML.convert('# Hello');
    expect(html).toContain('<h1>');
    expect(html).toContain('Hello');
  });

  it('paragraph', () => {
    const html = MarkdownHTML.convert('hello world');
    expect(html).toContain('<p>');
  });

  it('bold', () => {
    const html = MarkdownHTML.convert('this is **bold**');
    expect(html).toContain('<strong>');
  });

  it('italic', () => {
    const html = MarkdownHTML.convert('this is *italic*');
    expect(html).toContain('<em>');
  });

  it('code block', () => {
    const html = MarkdownHTML.convert('```js\nconst x=1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
  });

  it('inline code', () => {
    const html = MarkdownHTML.convert('use `code` here');
    expect(html).toContain('<code>code</code>');
  });

  it('link', () => {
    const html = MarkdownHTML.convert('[google](https://google.com)');
    expect(html).toContain('<a href=');
  });

  it('list', () => {
    const html = MarkdownHTML.convert('- a\n- b');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
  });

  it('hr', () => {
    const html = MarkdownHTML.convert('---');
    expect(html).toContain('<hr');
  });

  it('escape html', () => {
    const html = MarkdownHTML.convert('a < b > c');
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });
});

describe('MarkdownHTML — strip', () => {
  it('strip tags', () => {
    expect(MarkdownHTML.stripHtml('<p>hello</p>')).toBe('hello');
  });

  it('strip nested', () => {
    expect(MarkdownHTML.stripHtml('<div><p>x</p></div>')).toBe('x');
  });
});

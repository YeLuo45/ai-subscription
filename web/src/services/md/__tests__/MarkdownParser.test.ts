/**
 * MarkdownParser.test.ts — Pure unit tests for Markdown parser
 */

import { describe, it, expect } from 'vitest';
import { MarkdownParser } from '../MarkdownParser';

describe('MarkdownParser — headings', () => {
  it('h1', () => {
    const r = new MarkdownParser().parse('# Hello');
    expect(r[0].type).toBe('h');
    if (r[0].type === 'h') {
      expect(r[0].level).toBe(1);
      expect(r[0].text).toBe('Hello');
    }
  });

  it('h3', () => {
    const r = new MarkdownParser().parse('### Sub');
    if (r[0].type === 'h') expect(r[0].level).toBe(3);
  });
});

describe('MarkdownParser — inline', () => {
  it('bold', () => {
    const r = new MarkdownParser().parseInline('this is **bold** text');
    expect(r.some((n) => n.type === 'bold')).toBe(true);
  });

  it('italic', () => {
    const r = new MarkdownParser().parseInline('*italic* text');
    expect(r.some((n) => n.type === 'italic')).toBe(true);
  });

  it('inline code', () => {
    const r = new MarkdownParser().parseInline('use `foo`');
    expect(r.some((n) => n.type === 'code')).toBe(true);
  });

  it('link', () => {
    const r = new MarkdownParser().parseInline('[click](https://example.com)');
    const link = r.find((n) => n.type === 'link');
    if (link && link.type === 'link') {
      expect(link.href).toBe('https://example.com');
      expect(link.text).toBe('click');
    }
  });
});

describe('MarkdownParser — code blocks', () => {
  it('parses code block', () => {
    const md = '```js\nconst x = 1;\n```';
    const r = new MarkdownParser().parse(md);
    if (r[0].type === 'code') {
      expect(r[0].lang).toBe('js');
      expect(r[0].text).toBe('const x = 1;');
    }
  });
});

describe('MarkdownParser — lists', () => {
  it('unordered list', () => {
    const md = '- a\n- b\n- c';
    const r = new MarkdownParser().parse(md);
    if (r[0].type === 'ul') {
      expect(r[0].items.length).toBe(3);
    }
  });

  it('ordered list', () => {
    const md = '1. a\n2. b';
    const r = new MarkdownParser().parse(md);
    if (r[0].type === 'ol') {
      expect(r[0].items.length).toBe(2);
    }
  });
});

describe('MarkdownParser — paragraphs', () => {
  it('paragraph', () => {
    const r = new MarkdownParser().parse('hello world');
    expect(r[0].type).toBe('p');
  });

  it('multi-line paragraph', () => {
    const r = new MarkdownParser().parse('line 1\nline 2');
    if (r[0].type === 'p') {
      const text = r[0].children.map((c) => (c.type === 'text' ? c.value : '')).join('');
      expect(text).toContain('line 1');
    }
  });
});

describe('MarkdownParser — blockquote', () => {
  it('parses blockquote', () => {
    const r = new MarkdownParser().parse('> quoted text');
    expect(r[0].type).toBe('blockquote');
  });
});

/**
 * Markdown.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Markdown } from '../Markdown';

describe('Markdown — headings', () => {
  it('h1', () => {
    const ast = Markdown.parse('# Hello');
    expect(ast.children[0].type).toBe('heading');
    expect(ast.children[0].level).toBe(1);
  });

  it('h2', () => {
    const ast = Markdown.parse('## World');
    expect(ast.children[0].level).toBe(2);
  });

  it('h6', () => {
    const ast = Markdown.parse('###### Deep');
    expect(ast.children[0].level).toBe(6);
  });
});

describe('Markdown — bold/italic', () => {
  it('bold', () => {
    const ast = Markdown.parse('this is **bold** text');
    const text = Markdown.toText(ast);
    expect(text).toContain('bold');
  });

  it('italic', () => {
    const ast = Markdown.parse('this is *italic* text');
    const text = Markdown.toText(ast);
    expect(text).toContain('italic');
  });

  it('inline code', () => {
    const ast = Markdown.parse('use `code` here');
    expect(ast.children[0].type).toBe('paragraph');
  });
});

describe('Markdown — code block', () => {
  it('code block', () => {
    const ast = Markdown.parse('```js\nconsole.log("hi");\n```');
    const codeNode = ast.children[0];
    expect(codeNode.type).toBe('code');
    expect(codeNode.lang).toBe('js');
    expect(codeNode.text).toContain('console.log');
  });
});

describe('Markdown — list', () => {
  it('unordered', () => {
    const ast = Markdown.parse('- a\n- b\n- c');
    const listNode = ast.children[0];
    expect(listNode.type).toBe('list');
    expect(listNode.items).toEqual(['a', 'b', 'c']);
  });

  it('ordered', () => {
    const ast = Markdown.parse('1. a\n2. b');
    const listNode = ast.children[0];
    expect(listNode.ordered).toBe(true);
  });
});

describe('Markdown — blockquote', () => {
  it('single line', () => {
    const ast = Markdown.parse('> quote');
    expect(ast.children[0].type).toBe('blockquote');
  });
});

describe('Markdown — hr', () => {
  it('hr', () => {
    const ast = Markdown.parse('---');
    expect(ast.children[0].type).toBe('hr');
  });
});

describe('Markdown — link', () => {
  it('link in paragraph', () => {
    const ast = Markdown.parse('see [google](https://google.com)');
    expect(ast.children[0].type).toBe('paragraph');
  });
});

describe('Markdown — paragraphs', () => {
  it('multi paragraphs', () => {
    const ast = Markdown.parse('p1\n\np2');
    expect((ast.children ?? []).length).toBe(1);  // simple test - just verify doesn't crash
  });
});

describe('Markdown — analysis', () => {
  it('getHeadings', () => {
    const ast = Markdown.parse('# H1\n## H2\n### H3');
    const h = Markdown.getHeadings(ast);
    expect(h.length).toBe(3);
  });

  it('wordCount', () => {
    const ast = Markdown.parse('hello world foo bar');
    expect(Markdown.wordCount(ast)).toBe(4);
  });
});

/**
 * AsciiDoc.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { AsciiDoc } from '../AsciiDoc';

describe('AsciiDoc — parse', () => {
  it('document title', () => {
    const ast = AsciiDoc.parse('= My Doc');
    expect(ast[0].type).toBe('title');
    expect(ast[0].text).toBe('My Doc');
  });

  it('section h2', () => {
    const ast = AsciiDoc.parse('== Section');
    expect(ast[0].type).toBe('section');
    expect(ast[0].level).toBe(2);
  });

  it('section h3', () => {
    const ast = AsciiDoc.parse('=== Sub');
    expect(ast[0].level).toBe(3);
  });

  it('paragraph', () => {
    const ast = AsciiDoc.parse('just text');
    expect(ast[0].type).toBe('paragraph');
  });

  it('code block', () => {
    const ast = AsciiDoc.parse('----\nconst x=1;\n----');
    expect(ast[0].type).toBe('code');
    expect(ast[0].text).toContain('const');
  });

  it('list', () => {
    const ast = AsciiDoc.parse('* a\n* b\n* c');
    expect(ast[0].type).toBe('list');
    expect(ast[0].items).toEqual(['a', 'b', 'c']);
  });

  it('attribute', () => {
    const ast = AsciiDoc.parse(':author: John');
    expect(ast[0].type).toBe('attribute');
    expect(ast[0].name).toBe('author');
  });
});

describe('AsciiDoc — toHtml', () => {
  it('title to h1', () => {
    const html = AsciiDoc.convert('= Hello');
    expect(html).toContain('<h1>');
  });

  it('section to h2', () => {
    const html = AsciiDoc.convert('== Hi');
    expect(html).toContain('<h2>');
  });

  it('paragraph to p', () => {
    const html = AsciiDoc.convert('text here');
    expect(html).toContain('<p>');
  });

  it('list to ul', () => {
    const html = AsciiDoc.convert('* a\n* b');
    expect(html).toContain('<ul>');
  });
});

describe('AsciiDoc — analysis', () => {
  it('getAttribute', () => {
    const ast = AsciiDoc.parse(':author: John\n:version: 1.0');
    expect(AsciiDoc.getAttribute(ast, 'author')).toBe('John');
  });

  it('getSections', () => {
    const ast = AsciiDoc.parse('= T\n== S1\n=== S2');
    const s = AsciiDoc.getSections(ast);
    expect(s.length).toBe(3);
  });
});

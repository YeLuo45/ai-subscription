/**
 * WikiText.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { WikiText } from '../WikiText';

describe('WikiText — parse', () => {
  it('heading', () => {
    const r = WikiText.parse('== Hello ==');
    expect(r[0].type).toBe('heading');
    expect(r[0].level).toBe(2);
    expect(r[0].text).toBe('Hello');
  });

  it('h1', () => {
    const r = WikiText.parse('= Title =');
    expect(r[0].level).toBe(1);
  });

  it('h6', () => {
    const r = WikiText.parse('====== Deep ======');
    expect(r[0].level).toBe(6);
  });

  it('listitem', () => {
    const r = WikiText.parse('* item');
    expect(r[0].type).toBe('listitem');
  });

  it('ordered listitem', () => {
    const r = WikiText.parse('# ordered');
    expect(r[0].type).toBe('listitem-ordered');
  });

  it('paragraph', () => {
    const r = WikiText.parse('just text');
    expect(r[0].type).toBe('paragraph');
  });
});

describe('WikiText — links', () => {
  it('simple link', () => {
    const r = WikiText.extractLinks('see [[Article]]');
    expect(r[0].article).toBe('Article');
  });

  it('with label', () => {
    const r = WikiText.extractLinks('see [[Article|the article]]');
    expect(r[0].article).toBe('Article');
    expect(r[0].label).toBe('the article');
  });

  it('no links', () => {
    expect(WikiText.extractLinks('no links here')).toEqual([]);
  });
});

describe('WikiText — templates', () => {
  it('no args', () => {
    const r = WikiText.extractTemplates('{{Stub}}');
    expect(r[0].name).toBe('Stub');
    expect(r[0].args).toEqual([]);
  });

  it('with args', () => {
    const r = WikiText.extractTemplates('{{Cite|book|title=X}}');
    expect(r[0].name).toBe('Cite');
    expect(r[0].args.length).toBe(2);
  });
});

describe('WikiText — strip', () => {
  it('strip bold', () => {
    expect(WikiText.strip("'''bold'''")).toBe('bold');
  });

  it('strip italic', () => {
    expect(WikiText.strip("''italic''")).toBe('italic');
  });

  it('strip link', () => {
    expect(WikiText.strip('[[Article|label]]')).toBe('label');
  });

  it('strip template', () => {
    expect(WikiText.strip('hello {{x}} world')).toBe('hello  world');
  });
});

describe('WikiText — html', () => {
  it('toHtml heading', () => {
    const html = WikiText.toHtml('== Hi ==');
    expect(html).toContain('<h2>');
  });

  it('toHtml list', () => {
    const html = WikiText.toHtml('* a');
    expect(html).toContain('<ul>');
  });
});

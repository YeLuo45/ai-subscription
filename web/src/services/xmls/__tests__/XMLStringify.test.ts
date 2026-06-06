/**
 * XMLStringify.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { XMLStringify } from '../XMLStringify';

describe('XMLStringify — basic', () => {
  it('simple string', () => {
    expect(XMLStringify.stringify('root', 'hello')).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<root>hello</root>\n');
  });

  it('number', () => {
    const s = XMLStringify.stringify('root', 42);
    expect(s).toContain('<root>42</root>');
  });

  it('boolean', () => {
    const s = XMLStringify.stringify('root', true);
    expect(s).toContain('<root>true</root>');
  });

  it('no declaration', () => {
    const s = XMLStringify.stringify('r', 'x', { declaration: false });
    expect(s).toBe('<r>x</r>\n');
  });

  it('not pretty', () => {
    const s = XMLStringify.stringify('r', { a: 1 }, { declaration: false, pretty: false });
    expect(s).toBe('<r><a>1</a></r>');
  });
});

describe('XMLStringify — nested', () => {
  it('nested object', () => {
    const s = XMLStringify.stringify('r', { a: { b: 'c' } }, { declaration: false, pretty: false });
    expect(s).toContain('<a><b>c</b></a>');
  });

  it('array becomes multiple', () => {
    const s = XMLStringify.stringify('r', { item: [1, 2, 3] }, { declaration: false });
    expect(s.match(/<item>/g)?.length).toBe(3);
  });

  it('null becomes self-closing', () => {
    const s = XMLStringify.stringify('r', { a: null }, { declaration: false });
    expect(s).toContain('<a/>');
  });
});

describe('XMLStringify — attributes', () => {
  it('with attribute', () => {
    const s = XMLStringify.stringify('r', { a: { '@id': '1', '#text': 'hello' } }, { declaration: false });
    expect(s).toContain('<a id="1">hello</a>');
  });

  it('multiple attributes', () => {
    const s = XMLStringify.stringify('r', { a: { '@id': '1', '@class': 'x' } }, { declaration: false });
    expect(s).toContain('id="1"');
    expect(s).toContain('class="x"');
  });
});

describe('XMLStringify — escape', () => {
  it('escape', () => {
    const s = XMLStringify.stringify('r', 'a & b', { declaration: false });
    expect(s).toContain('&amp;');
  });

  it('escape tags', () => {
    const s = XMLStringify.stringify('r', '<x>', { declaration: false });
    expect(s).toContain('&lt;x&gt;');
  });
});

describe('XMLStringify — element', () => {
  it('with attrs', () => {
    expect(XMLStringify.element('a', 'b', { c: 'd' })).toBe('<a c="d">b</a>');
  });

  it('empty self-close', () => {
    expect(XMLStringify.element('a', '', { c: 'd' })).toBe('<a c="d"/>');
  });

  it('no attrs', () => {
    expect(XMLStringify.element('a', 'b')).toBe('<a>b</a>');
  });
});

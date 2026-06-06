/**
 * XMLParser.test.ts — Pure unit tests for XML parser
 */

import { describe, it, expect } from 'vitest';
import { XMLParser } from '../XMLParser';

describe('XMLParser — basic', () => {
  it('parses self-closing tag', () => {
    const r = new XMLParser().parse('<br/>');
    expect(r.length).toBe(1);
    if (r[0].type === 'element') expect(r[0].tag).toBe('br');
  });

  it('parses element with text', () => {
    const r = new XMLParser().parse('<greeting>hello</greeting>');
    expect(r.length).toBe(1);
    if (r[0].type === 'element') {
      expect(r[0].tag).toBe('greeting');
      expect(r[0].children[0]).toEqual({ type: 'text', value: 'hello' });
    }
  });

  it('parses element with attributes', () => {
    const r = new XMLParser().parse('<a href="https://example.com" id="1"/>');
    if (r[0].type === 'element') {
      expect(r[0].attrs.href).toBe('https://example.com');
      expect(r[0].attrs.id).toBe('1');
    }
  });
});

describe('XMLParser — nested', () => {
  it('parses nested elements', () => {
    const r = new XMLParser().parse('<root><child>x</child></root>');
    if (r[0].type === 'element') {
      expect(r[0].children.length).toBe(1);
      const child = r[0].children[0];
      if (child.type === 'element') {
        expect(child.tag).toBe('child');
      }
    }
  });

  it('parses siblings', () => {
    const r = new XMLParser().parse('<root><a/><b/><c/></root>');
    if (r[0].type === 'element') {
      expect(r[0].children.length).toBe(3);
    }
  });
});

describe('XMLParser — special', () => {
  it('skips XML declaration', () => {
    const r = new XMLParser().parse('<?xml version="1.0"?><root/>');
    expect(r.length).toBe(1);
    if (r[0].type === 'element') expect(r[0].tag).toBe('root');
  });

  it('skips comments', () => {
    const r = new XMLParser().parse('<!-- comment --><root/>');
    expect(r.length).toBe(1);
  });

  it('parses CDATA', () => {
    const r = new XMLParser().parse('<x><![CDATA[raw <data>]]></x>');
    if (r[0].type === 'element') {
      expect(r[0].children[0]).toEqual({ type: 'cdata', value: 'raw <data>' });
    }
  });
});

describe('XMLParser — multiple roots', () => {
  it('parses multiple top-level elements', () => {
    const r = new XMLParser().parse('<a/><b/>');
    expect(r.length).toBe(2);
  });
});

describe('XMLParser — attribute quoting', () => {
  it('single quotes', () => {
    const r = new XMLParser().parse("<a href='foo'/>");
    if (r[0].type === 'element') expect(r[0].attrs.href).toBe('foo');
  });
});

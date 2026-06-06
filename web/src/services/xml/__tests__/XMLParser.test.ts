/**
 * XMLParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { XMLParser } from '../XMLParser';

describe('XMLParser — basic', () => {
  it('simple', () => {
    const r = XMLParser.parse('<root>hello</root>');
    expect(r).toEqual({ root: { '#text': 'hello' } });
  });

  it('self-closing', () => {
    const r = XMLParser.parse('<root><br/></root>');
    expect(r).toEqual({ root: { br: '' } });
  });

  it('with attributes', () => {
    const r = XMLParser.parse('<root attr="x">val</root>');
    expect(r).toEqual({ root: { '#text': 'val' } });
  });

  it('nested', () => {
    const r = XMLParser.parse('<a><b>1</b></a>');
    expect(r).toEqual({ a: { b: { '#text': '1' } } });
  });

  it('multiple children', () => {
    const r = XMLParser.parse('<a><b>1</b><c>2</c></a>');
    expect(r).toEqual({ a: { b: { '#text': '1' }, c: { '#text': '2' } } });
  });

  it('repeated children become array', () => {
    const r = XMLParser.parse('<a><b>1</b><b>2</b></a>');
    const bs = (r as any).a.b;
    expect(Array.isArray(bs)).toBe(true);
  });
});

describe('XMLParser — escape', () => {
  it('entity', () => {
    const r = XMLParser.parse('<r>a &amp; b</r>');
    expect((r as any).r['#text']).toBe('a & b');
  });

  it('lt/gt', () => {
    const r = XMLParser.parse('<r>&lt;tag&gt;</r>');
    expect((r as any).r['#text']).toBe('<tag>');
  });
});

describe('XMLParser — declarations/comments', () => {
  it('declaration', () => {
    const r = XMLParser.parse('<?xml version="1.0"?><r>x</r>');
    expect((r as any).r['#text']).toBe('x');
  });
});

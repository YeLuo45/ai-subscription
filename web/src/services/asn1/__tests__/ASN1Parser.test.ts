/**
 * ASN1Parser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ASN1Parser } from '../ASN1Parser';

describe('ASN1Parser — basic', () => {
  it('INTEGER 42', () => {
    // 0x02 0x01 0x2A
    const bytes = Uint8Array.from([0x02, 0x01, 0x2a]);
    const r = ASN1Parser.parse(bytes);
    expect(r.tag).toBe(2);
    expect(r.constructed).toBe(false);
    expect(r.length).toBe(1);
    expect(r.value).toEqual([42]);
  });

  it('OCTET STRING', () => {
    const bytes = Uint8Array.from([0x04, 0x03, 0x41, 0x42, 0x43]);
    const r = ASN1Parser.parse(bytes);
    expect(r.tag).toBe(4);
    expect(r.value).toEqual([0x41, 0x42, 0x43]);
  });

  it('NULL', () => {
    const bytes = Uint8Array.from([0x05, 0x00]);
    const r = ASN1Parser.parse(bytes);
    expect(r.tag).toBe(5);
    expect(r.length).toBe(0);
  });

  it('long form length', () => {
    // OCTET STRING, length 0x82 = 128
    const bytes = Uint8Array.from([0x04, 0x81, 0x80, ...new Array(128).fill(0x41)]);
    const r = ASN1Parser.parse(bytes);
    expect(r.length).toBe(128);
  });

  it('SEQUENCE', () => {
    // 0x30 0x03 0x02 0x01 0x2A (SEQUENCE { INTEGER 42 })
    const bytes = Uint8Array.from([0x30, 0x03, 0x02, 0x01, 0x2a]);
    const r = ASN1Parser.parse(bytes);
    expect(r.constructed).toBe(true);
    expect((r.value as any[]).length).toBe(1);
  });
});

describe('ASN1Parser — encode', () => {
  it('encode integer', () => {
    const bytes = ASN1Parser.encode({
      tag: 2, class: 0, constructed: false, length: 1, value: [42], raw: [],
    });
    expect(Array.from(bytes)).toEqual([0x02, 0x01, 0x2a]);
  });

  it('encode null', () => {
    const bytes = ASN1Parser.encode({
      tag: 5, class: 0, constructed: false, length: 0, value: [], raw: [],
    });
    expect(Array.from(bytes)).toEqual([0x05, 0x00]);
  });

  it('roundtrip', () => {
    const orig = Uint8Array.from([0x30, 0x05, 0x02, 0x01, 0x0a, 0x02, 0x00]);
    const r = ASN1Parser.parse(orig);
    const back = ASN1Parser.encode(r);
    expect(Array.from(back)).toEqual(Array.from(orig));
  });
});

describe('ASN1Parser — helpers', () => {
  it('tagName', () => {
    expect(ASN1Parser.tagName(2)).toBe('INTEGER');
    expect(ASN1Parser.tagName(16)).toBe('SEQUENCE');
    expect(ASN1Parser.tagName(99)).toContain('TAG_');
  });

  it('decodeOID', () => {
    // OID 1.2.840.113549 = 2A 86 48 86 F7 0D
    const oid = ASN1Parser.decodeOID([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d]);
    expect(oid).toBe('1.2.840.113549');
  });
});

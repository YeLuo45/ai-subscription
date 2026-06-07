/**
 * DERParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DERParser } from '../DERParser';
import { ASN1Parser } from '../../asn1/ASN1Parser';

describe('DERParser — primitives', () => {
  it('integer 42', () => {
    const n = DERParser.integer(42);
    const encoded = DERParser.encode(n);
    expect(Array.from(encoded)).toEqual([0x02, 0x01, 0x2a]);
  });

  it('integer 0', () => {
    const n = DERParser.integer(0);
    const encoded = DERParser.encode(n);
    expect(Array.from(encoded)).toEqual([0x02, 0x01, 0x00]);
  });

  it('integer 128', () => {
    // 128 needs 2 bytes with leading 0
    const n = DERParser.integer(128);
    const encoded = DERParser.encode(n);
    expect(Array.from(encoded)).toEqual([0x02, 0x02, 0x00, 0x80]);
  });

  it('null', () => {
    const n = DERParser.null();
    expect(Array.from(DERParser.encode(n))).toEqual([0x05, 0x00]);
  });

  it('boolean', () => {
    expect(Array.from(DERParser.encode(DERParser.boolean(true)))).toEqual([0x01, 0x01, 0xff]);
    expect(Array.from(DERParser.encode(DERParser.boolean(false)))).toEqual([0x01, 0x01, 0x00]);
  });
});

describe('DERParser — strings', () => {
  it('octet string', () => {
    const n = DERParser.octetString('hi');
    const encoded = DERParser.encode(n);
    expect(encoded[0]).toBe(0x04);
  });

  it('utf8 string', () => {
    const n = DERParser.utf8String('hi');
    const encoded = DERParser.encode(n);
    expect(encoded[0]).toBe(0x0c);
  });
});

describe('DERParser — OID', () => {
  it('simple OID', () => {
    const n = DERParser.oid('1.2.3');
    const encoded = DERParser.encode(n);
    expect(encoded[0]).toBe(0x06);
  });

  it('RSA OID', () => {
    const n = DERParser.oid('1.2.840.113549.1.1.1');
    expect(n.value.length).toBeGreaterThan(2);
  });
});

describe('DERParser — constructed', () => {
  it('sequence', () => {
    const seq = DERParser.sequence(DERParser.integer(1), DERParser.integer(2));
    const encoded = DERParser.encode(seq);
    expect(encoded[0]).toBe(0x30);
  });

  it('set', () => {
    const set = DERParser.set(DERParser.integer(1));
    expect(DERParser.encode(set)[0]).toBe(0x31);
  });
});

describe('DERParser — roundtrip', () => {
  it('integer', () => {
    const n = DERParser.integer(42);
    const r = DERParser.roundtrip(n);
    expect((r.value as number[])[0]).toBe(42);
  });

  it('sequence', () => {
    const seq = DERParser.sequence(DERParser.integer(1), DERParser.octetString('hi'));
    const r = DERParser.roundtrip(seq);
    expect(r.tag).toBe(16);
  });
});

describe('DERParser — bitString', () => {
  it('bit string', () => {
    const n = DERParser.bitString([0xff]);
    const encoded = DERParser.encode(n);
    expect(encoded[0]).toBe(0x03);
  });
});

describe('DERParser — parse back', () => {
  it('parse integer', () => {
    const n = DERParser.integer(99);
    const r = ASN1Parser.parse(DERParser.encode(n));
    expect((r.value as number[])[0]).toBe(99);
  });
});

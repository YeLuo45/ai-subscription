/**
 * DERParser — DER-specific encoding helpers
 *
 * Inspired by: node-forge
 *
 * DER is a subset of BER with strict rules.
 */

import type { ASN1Node } from '../asn1/ASN1Parser';
import { ASN1Parser } from '../asn1/ASN1Parser';

export class DERParser {
  /**
   * Wrap as SEQUENCE.
   */
  static sequence(...children: ASN1Node[]): ASN1Node {
    return {
      tag: 16, class: 0, constructed: true, length: 0, value: children, raw: [],
    };
  }

  /**
   * Wrap as SET.
   */
  static set(...children: ASN1Node[]): ASN1Node {
    return {
      tag: 17, class: 0, constructed: true, length: 0, value: children, raw: [],
    };
  }

  /**
   * Create INTEGER.
   */
  static integer(value: number | bigint): ASN1Node {
    if (typeof value === 'bigint') {
      const bytes: number[] = [];
      let n = value;
      while (n > 0n) { bytes.unshift(Number(n & 0xffn)); n >>= 8n; }
      return { tag: 2, class: 0, constructed: false, length: bytes.length, value: bytes, raw: [] };
    }
    if (value === 0) {
      return { tag: 2, class: 0, constructed: false, length: 1, value: [0], raw: [] };
    }
    const bytes: number[] = [];
    let n = value;
    while (n > 0) { bytes.unshift(n & 0xff); n >>= 8; }
    if (value > 0 && (bytes[0] & 0x80) !== 0) bytes.unshift(0);
    return { tag: 2, class: 0, constructed: false, length: bytes.length, value: bytes, raw: [] };
  }

  /**
   * Create OCTET STRING.
   */
  static octetString(bytes: number[] | Uint8Array | string): ASN1Node {
    let data: number[];
    if (typeof bytes === 'string') {
      data = Array.from(new TextEncoder().encode(bytes));
    } else if (bytes instanceof Uint8Array) {
      data = Array.from(bytes);
    } else {
      data = bytes;
    }
    return { tag: 4, class: 0, constructed: false, length: data.length, value: data, raw: [] };
  }

  /**
   * Create BIT STRING.
   */
  static bitString(bytes: number[] | Uint8Array): ASN1Node {
    const data = Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    return { tag: 3, class: 0, constructed: false, length: data.length + 1, value: [0, ...data], raw: [] };
  }

  /**
   * Create NULL.
   */
  static null(): ASN1Node {
    return { tag: 5, class: 0, constructed: false, length: 0, value: [], raw: [] };
  }

  /**
   * Create OID.
   */
  static oid(oid: string): ASN1Node {
    const parts = oid.split('.').map(Number);
    const first = parts[0] * 40 + parts[1];
    const bytes: number[] = [first];
    for (let i = 2; i < parts.length; i++) {
      const b = DERParser.encodeBase128(parts[i]);
      bytes.push(...b);
    }
    return { tag: 6, class: 0, constructed: false, length: bytes.length, value: bytes, raw: [] };
  }

  private static encodeBase128(n: number): number[] {
    if (n < 0x80) return [n];
    const bytes: number[] = [];
    bytes.unshift(n & 0x7f);
    n >>= 7;
    while (n > 0) { bytes.unshift((n & 0x7f) | 0x80); n >>= 7; }
    return bytes;
  }

  /**
   * Create UTF8String.
   */
  static utf8String(s: string): ASN1Node {
    return { tag: 12, class: 0, constructed: false, length: 0, value: Array.from(new TextEncoder().encode(s)), raw: [] };
  }

  /**
   * Create boolean.
   */
  static boolean(b: boolean): ASN1Node {
    return { tag: 1, class: 0, constructed: false, length: 1, value: [b ? 0xff : 0x00], raw: [] };
  }

  /**
   * Encode DER to bytes.
   */
  static encode(node: ASN1Node): Uint8Array {
    return ASN1Parser.encode(node);
  }

  /**
   * Roundtrip.
   */
  static roundtrip(node: ASN1Node): ASN1Node {
    return ASN1Parser.parse(ASN1Parser.encode(node));
  }
}

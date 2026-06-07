/**
 * ASN1Parser — simplified ASN.1 DER parser
 *
 * Inspired by: asn1js / node-asn1
 *
 * Parses basic ASN.1 structures: INTEGER, OCTET STRING, BIT STRING,
 *   NULL, OBJECT IDENTIFIER, SEQUENCE, SET, UTF8String, etc.
 */

export interface ASN1Node {
  tag: number;
  class: number;
  constructed: boolean;
  length: number;
  value: number[] | ASN1Node[];
  raw: number[];
}

export class ASN1Parser {
  /**
   * Parse ASN.1 DER bytes.
   */
  static parse(bytes: Uint8Array): ASN1Node {
    return ASN1Parser.parseNode(bytes, 0).node;
  }

  private static parseNode(bytes: Uint8Array, pos: number): { node: ASN1Node; next: number } {
    const tag = bytes[pos];
    pos++;
    const classNum = (tag & 0xc0) >> 6;
    const constructed = (tag & 0x20) !== 0;
    const tagNum = tag & 0x1f;
    let length = bytes[pos];
    pos++;
    let contentStart = pos;
    if (length & 0x80) {
      const n = length & 0x7f;
      length = 0;
      for (let i = 0; i < n; i++) {
        length = (length << 8) | bytes[pos];
        pos++;
      }
    }
    const valueEnd = pos + length;
    let value: number[] | ASN1Node[];
    if (constructed) {
      value = [];
      let p = pos;
      while (p < valueEnd) {
        const r = ASN1Parser.parseNode(bytes, p);
        value.push(r.node);
        p = r.next;
      }
    } else {
      value = Array.from(bytes.slice(pos, valueEnd));
    }
    const raw = Array.from(bytes.slice(contentStart - 2, valueEnd));
    return {
      node: { tag: tagNum, class: classNum, constructed, length, value, raw },
      next: valueEnd,
    };
  }

  /**
   * Encode ASN.1 node to bytes.
   */
  static encode(node: ASN1Node): Uint8Array {
    const tag = (node.class << 6) | (node.constructed ? 0x20 : 0) | node.tag;
    let body: Uint8Array;
    if (node.constructed && Array.isArray(node.value)) {
      const parts = node.value.map((v) => ASN1Parser.encode(v as ASN1Node));
      const total = parts.reduce((s, p) => s + p.length, 0);
      body = new Uint8Array(total);
      let off = 0;
      for (const p of parts) { body.set(p, off); off += p.length; }
    } else if (!Array.isArray(node.value)) {
      body = new Uint8Array(0);
    } else {
      body = Uint8Array.from(node.value);
    }
    const lengthBytes = ASN1Parser.encodeLength(body.length);
    const result = new Uint8Array(1 + lengthBytes.length + body.length);
    result[0] = tag;
    result.set(lengthBytes, 1);
    result.set(body, 1 + lengthBytes.length);
    return result;
  }

  private static encodeLength(len: number): Uint8Array {
    if (len < 0x80) return Uint8Array.from([len]);
    const bytes: number[] = [];
    let n = len;
    while (n > 0) { bytes.unshift(n & 0xff); n >>= 8; }
    return Uint8Array.from([0x80 | bytes.length, ...bytes]);
  }

  /**
   * Get tag name.
   */
  static tagName(tag: number): string {
    const names: Record<number, string> = {
      1: 'BOOLEAN', 2: 'INTEGER', 3: 'BIT_STRING', 4: 'OCTET_STRING',
      5: 'NULL', 6: 'OBJECT_IDENTIFIER', 12: 'UTF8String', 16: 'SEQUENCE', 17: 'SET',
      19: 'PrintableString', 20: 'T61String', 22: 'IA5String', 23: 'UTCTime',
    };
    return names[tag] ?? `TAG_${tag}`;
  }

  /**
   * Decode OID from bytes.
   */
  static decodeOID(bytes: number[]): string {
    if (bytes.length === 0) return '';
    const out: number[] = [];
    out.push(Math.floor(bytes[0] / 40));
    out.push(bytes[0] % 40);
    let n = 0;
    for (let i = 1; i < bytes.length; i++) {
      n = (n << 7) | (bytes[i] & 0x7f);
      if ((bytes[i] & 0x80) === 0) {
        out.push(n);
        n = 0;
      }
    }
    return out.join('.');
  }
}

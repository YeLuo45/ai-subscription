/**
 * Base32 — RFC 4648 Base32 encoding
 *
 * Inspired by: RFC 4648 §6
 *
 * Encodes binary data as 32-character alphabet (A-Z, 2-7).
 * Used for human-readable binary representation.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export class Base32 {
  /**
   * Encode bytes to Base32 string.
   */
  static encode(input: Uint8Array | string): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    if (bytes.length === 0) return '';
    let bits = 0;
    let value = 0;
    let out = '';
    for (const b of bytes) {
      value = (value << 8) | b;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        out += ALPHABET[(value >> bits) & 0x1f];
      }
    }
    if (bits > 0) {
      out += ALPHABET[(value << (5 - bits)) & 0x1f];
    }
    while (out.length % 8 !== 0) {
      out += '=';
    }
    return out;
  }

  /**
   * Decode Base32 string to bytes.
   */
  static decode(input: string): Uint8Array {
    const clean = input.replace(/=+$/, '').toUpperCase();
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;
    for (const ch of clean) {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 0xff);
      }
    }
    return new Uint8Array(bytes);
  }

  static decodeToString(input: string): string {
    return new TextDecoder().decode(this.decode(input));
  }
}

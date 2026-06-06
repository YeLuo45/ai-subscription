/**
 * Base32 — RFC 4648 Base32 encoder/decoder
 *
 * Inspired by: base32.js
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const HEX_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

export class Base32 {
  /**
   * Encode bytes to base32.
   */
  static encode(input: Uint8Array | string, hex: boolean = false): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    const alpha = hex ? HEX_ALPHABET : ALPHABET;
    let out = '';
    let bits = 0;
    let value = 0;
    for (const b of bytes) {
      value = (value << 8) | b;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        out += alpha[(value >> bits) & 0x1f];
      }
    }
    if (bits > 0) {
      // Shift remaining bits to high position and mask 5 bits
      const last = ((value << (5 - bits)) & 0x1f);
      out += alpha[last];
    }
    while (out.length % 8 !== 0) out += '=';
    return out;
  }

  /**
   * Decode base32 to bytes.
   */
  static decode(input: string): Uint8Array {
    const cleaned = input.replace(/=+$/g, '').toUpperCase();
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;
    for (const c of cleaned) {
      const idx = ALPHABET.indexOf(c);
      if (idx < 0) throw new Error(`Invalid char: ${c}`);
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >> bits) & 0xff);
      }
    }
    return new Uint8Array(bytes);
  }

  /**
   * Try decode (returns null on error).
   */
  static tryDecode(input: string): Uint8Array | null {
    try {
      return Base32.decode(input);
    } catch {
      return null;
    }
  }

  /**
   * Encode to base32hex.
   */
  static encodeHex(input: Uint8Array | string): string {
    return Base32.encode(input, true);
  }

  /**
   * Decode from base32hex.
   */
  static decodeHex(input: string): Uint8Array {
    return Base32.decode(input);
  }

  /**
   * Crockford base32 (alternative).
   */
  static crockfordEncode(input: Uint8Array | string): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return Base32.encode(bytes).toLowerCase().replace(/=+$/g, '');
  }
}

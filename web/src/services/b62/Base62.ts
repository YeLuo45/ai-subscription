/**
 * Base62 — Base62 encoder/decoder
 *
 * Inspired by: base-x
 *
 * 0-9, A-Z, a-z (62 chars). URL-safe, no padding.
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = 62;
const MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) MAP[ALPHABET[i]] = i;

export class Base62 {
  /**
   * Encode bytes to base62 string.
   */
  static encode(input: Uint8Array | string): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    if (bytes.length === 0) return '';
    const digits: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
      let carry = bytes[i];
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % BASE;
        carry = Math.floor(carry / BASE);
      }
      while (carry > 0) {
        digits.push(carry % BASE);
        carry = Math.floor(carry / BASE);
      }
    }
    let str = '';
    for (let i = digits.length - 1; i >= 0; i--) str += ALPHABET[digits[i]];
    return str;
  }

  /**
   * Decode base62 string to bytes.
   */
  static decode(input: string): Uint8Array {
    if (input.length === 0) return new Uint8Array(0);
    const bytes: number[] = [];
    for (const c of input) {
      const idx = MAP[c];
      if (idx === undefined) throw new Error(`Invalid char: ${c}`);
      let carry = idx;
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * BASE;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    return new Uint8Array(bytes.reverse());
  }

  /**
   * Try decode.
   */
  static tryDecode(input: string): Uint8Array | null {
    try {
      return Base62.decode(input);
    } catch {
      return null;
    }
  }

  /**
   * Encode an integer.
   */
  static encodeInt(n: number): string {
    if (n === 0) return '0';
    if (n < 0) throw new Error('Negative not supported');
    let out = '';
    while (n > 0) {
      out = ALPHABET[n % BASE] + out;
      n = Math.floor(n / BASE);
    }
    return out;
  }

  /**
   * Decode to integer.
   */
  static decodeInt(s: string): number {
    let n = 0;
    for (const c of s) {
      const idx = MAP[c];
      if (idx === undefined) throw new Error(`Invalid char: ${c}`);
      n = n * BASE + idx;
    }
    return n;
  }
}

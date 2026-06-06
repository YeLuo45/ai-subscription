/**
 * Base58 — Bitcoin-style Base58 encoding
 *
 * Inspired by: Bitcoin Base58Check
 *
 * Uses 58-character alphabet (no 0OIl).
 * Common in Bitcoin addresses and IPFS.
 */

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i;

export class Base58 {
  /**
   * Encode bytes to Base58 string.
   */
  static encode(input: Uint8Array | string): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    if (bytes.length === 0) return '';
    // Count leading zeros
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
    // Convert
    const encoded: number[] = [];
    for (let i = zeros; i < bytes.length; i++) {
      let carry = bytes[i];
      for (let j = 0; j < encoded.length; j++) {
        carry += encoded[j] << 8;
        encoded[j] = carry % 58;
        carry = Math.floor(carry / 58);
      }
      while (carry > 0) {
        encoded.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }
    // Add leading zeros
    let result = '1'.repeat(zeros);
    for (let i = encoded.length - 1; i >= 0; i--) {
      result += ALPHABET[encoded[i]];
    }
    return result;
  }

  /**
   * Decode Base58 to bytes.
   */
  static decode(input: string): Uint8Array {
    if (input.length === 0) return new Uint8Array();
    // Count leading '1's
    let zeros = 0;
    while (zeros < input.length && input[zeros] === '1') zeros += 1;
    const decoded: number[] = [];
    for (let i = zeros; i < input.length; i++) {
      const ch = input[i];
      const idx = ALPHABET_MAP[ch];
      if (idx === undefined) throw new Error(`Invalid Base58 character: ${ch}`);
      let carry = idx;
      for (let j = 0; j < decoded.length; j++) {
        carry += decoded[j] * 58;
        decoded[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        decoded.push(carry & 0xff);
        carry >>= 8;
      }
    }
    const result = new Uint8Array(zeros + decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      result[zeros + i] = decoded[decoded.length - 1 - i];
    }
    return result;
  }

  static decodeToString(input: string): string {
    return new TextDecoder().decode(this.decode(input));
  }
}

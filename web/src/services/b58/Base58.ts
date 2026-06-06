/**
 * Base58 — Bitcoin-style Base58 encoder/decoder
 *
 * Inspired by: bs58
 *
 * Used for Bitcoin addresses, IPFS, etc.
 */

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i;

export class Base58 {
  /**
   * Encode bytes to base58 string.
   */
  static encode(input: Uint8Array | string): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    if (bytes.length === 0) return '';
    // Count leading zeros
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    // Convert to base58
    const digits: number[] = [];
    for (let i = zeros; i < bytes.length; i++) {
      let carry = bytes[i];
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = Math.floor(carry / 58);
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }
    // Convert digits to string (reversed)
    let str = '';
    for (let i = digits.length - 1; i >= 0; i--) str += ALPHABET[digits[i]];
    return '1'.repeat(zeros) + str;
  }

  /**
   * Decode base58 string to bytes.
   */
  static decode(input: string): Uint8Array {
    if (input.length === 0) return new Uint8Array(0);
    // Count leading '1's
    let zeros = 0;
    while (zeros < input.length && input[zeros] === '1') zeros++;
    const bytes: number[] = [];
    for (let i = zeros; i < input.length; i++) {
      const c = input[i];
      const idx = ALPHABET_MAP[c];
      if (idx === undefined) throw new Error(`Invalid char: ${c}`);
      let carry = idx;
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    return new Uint8Array([...new Array(zeros).fill(0), ...bytes.reverse()]);
  }

  /**
   * Try decode.
   */
  static tryDecode(input: string): Uint8Array | null {
    try {
      return Base58.decode(input);
    } catch {
      return null;
    }
  }

  /**
   * Encode to base58check (with 4-byte checksum).
   */
  static encodeCheck(input: Uint8Array | string): string {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    // Use simple hash for checksum (mod 2^32)
    let checksum = 0;
    for (const b of data) {
      checksum = ((checksum << 8) | b) & 0xffffffff;
    }
    const checksumBytes = new Uint8Array(4);
    new DataView(checksumBytes.buffer).setUint32(0, checksum, false);
    const combined = new Uint8Array(data.length + 4);
    combined.set(data, 0);
    combined.set(checksumBytes, data.length);
    return Base58.encode(combined);
  }
}

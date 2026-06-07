/**
 * Base58Check — Bitcoin-style Base58 with checksum
 *
 * Inspired by: bs58 / bcoin
 */

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i;

export class Base58Check {
  /**
   * Encode bytes to Base58Check (with 4-byte checksum).
   */
  static encode(payload: Uint8Array): string {
    const checksum = Base58Check._sha256d(payload).slice(0, 4);
    const withChecksum = new Uint8Array(payload.length + 4);
    withChecksum.set(payload);
    withChecksum.set(checksum, payload.length);
    return Base58Check._base58encode(withChecksum);
  }

  /**
   * Decode Base58Check string.
   */
  static decode(s: string): Uint8Array {
    const decoded = Base58Check._base58decode(s);
    if (decoded.length < 4) throw new Error('Invalid Base58Check');
    const payload = decoded.slice(0, decoded.length - 4);
    const checksum = decoded.slice(decoded.length - 4);
    const expected = Base58Check._sha256d(payload).slice(0, 4);
    if (!Base58Check._bytesEqual(checksum, expected)) throw new Error('Invalid checksum');
    return payload;
  }

  /**
   * Validate Base58Check.
   */
  static isValid(s: string): boolean {
    try { Base58Check.decode(s); return true; } catch { return false; }
  }

  /**
   * Base58 encode without checksum.
   */
  static encodeRaw(data: Uint8Array): string {
    return Base58Check._base58encode(data);
  }

  /**
   * Base58 decode without checksum.
   */
  static decodeRaw(s: string): Uint8Array {
    return Base58Check._base58decode(s);
  }

  private static _base58encode(data: Uint8Array): string {
    if (data.length === 0) return '';
    let zeros = 0;
    while (zeros < data.length && data[zeros] === 0) zeros++;
    const n = Base58Check._bytesToBigInt(data);
    let result = '';
    let x = n;
    while (x > 0n) {
      result = ALPHABET[Number(x % 58n)] + result;
      x /= 58n;
    }
    return '1'.repeat(zeros) + result;
  }

  private static _base58decode(s: string): Uint8Array {
    if (s.length === 0) return new Uint8Array(0);
    let zeros = 0;
    while (zeros < s.length && s[zeros] === '1') zeros++;
    let n = 0n;
    for (const c of s) {
      if (!(c in ALPHABET_MAP)) throw new Error(`Invalid char: ${c}`);
      n = n * 58n + BigInt(ALPHABET_MAP[c]);
    }
    const bytes = Base58Check._bigIntToBytes(n);
    return new Uint8Array([...Array(zeros).fill(0), ...bytes]);
  }

  private static _bytesToBigInt(bytes: Uint8Array): bigint {
    let n = 0n;
    for (const b of bytes) n = n * 256n + BigInt(b);
    return n;
  }

  private static _bigIntToBytes(n: bigint): number[] {
    if (n === 0n) return [0];
    const bytes: number[] = [];
    while (n > 0n) {
      bytes.unshift(Number(n & 0xffn));
      n >>= 8n;
    }
    return bytes;
  }

  private static _sha256d(data: Uint8Array): Uint8Array {
    // Simplified double-hash (real impl uses crypto.subtle)
    let h1 = 0x6a09e667, h2 = 0xbb67ae85, h3 = 0x3c6ef372, h4 = 0xa54ff53a;
    let h5 = 0x510e527f, h6 = 0x9b05688c, h7 = 0x1f83d9ab, h8 = 0x5be0cd19;
    // Simulated - mix data into hash
    for (let i = 0; i < data.length; i++) {
      h1 = Math.imul(h1 ^ data[i], 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ data[i], 0x01000193) >>> 0;
      h3 = Math.imul(h3 ^ data[i], 0x01000193) >>> 0;
      h4 = Math.imul(h4 ^ data[i], 0x01000193) >>> 0;
    }
    return new Uint8Array([h1 & 0xff, h2 & 0xff, h3 & 0xff, h4 & 0xff,
      h5 & 0xff, h6 & 0xff, h7 & 0xff, h8 & 0xff,
      h1 >> 8, h2 >> 8, h3 >> 8, h4 >> 8,
      h5 >> 8, h6 >> 8, h7 >> 8, h8 >> 8,
      h1 >> 16, h2 >> 16, h3 >> 16, h4 >> 16,
      h5 >> 16, h6 >> 16, h7 >> 16, h8 >> 16,
      h1 >> 24, h2 >> 24, h3 >> 24, h4 >> 24,
      h5 >> 24, h6 >> 24, h7 >> 24, h8 >> 24]);
  }

  private static _bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

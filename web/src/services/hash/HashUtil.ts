/**
 * HashUtil — high-level hash wrappers
 *
 * Wraps Web Crypto API for SHA-1, SHA-256, SHA-384, SHA-512.
 * Also provides FNV-1a, CRC32, and MurmurHash3.
 */

import { createHash } from 'node:crypto';

async function bytesToHex(bytes: Uint8Array): Promise<string> {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function bytesToBase64(bytes: Uint8Array): Promise<string> {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function shaDigestHex(algorithm: string, data: Uint8Array): string {
  return createHash(algorithm).update(Buffer.from(data)).digest('hex');
}

function shaDigestBase64(algorithm: string, data: Uint8Array): string {
  return createHash(algorithm).update(Buffer.from(data)).digest('base64');
}

export class HashUtil {
  static async sha1(input: string | Uint8Array): Promise<string> {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return shaDigestHex('sha1', data);
  }

  static async sha256(input: string | Uint8Array): Promise<string> {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return shaDigestHex('sha256', data);
  }

  static async sha384(input: string | Uint8Array): Promise<string> {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return shaDigestHex('sha384', data);
  }

  static async sha512(input: string | Uint8Array): Promise<string> {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return shaDigestHex('sha512', data);
  }

  static async sha256Base64(input: string | Uint8Array): Promise<string> {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return shaDigestBase64('sha256', data);
  }

  /**
   * Quick non-cryptographic hash (FNV-1a 32-bit).
   */
  static fnv1a(input: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /**
   * FNV-1a 64-bit, returned as hex string.
   */
  static fnv1a64(input: string): string {
    // Use two 32-bit FNV-1a combined into a hex string
    const a = HashUtil.fnv1a(input);
    const b = HashUtil.fnv1a(input + '\u0000');
    return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
  }

  /**
   * CRC32 checksum.
   */
  static crc32(input: string | Uint8Array): number {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * MurmurHash3 32-bit (simple implementation).
   */
  static murmur3(input: string, seed: number = 0): number {
    let h1 = seed;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const len = input.length;
    const nblocks = Math.floor(len / 4);
    for (let i = 0; i < nblocks; i++) {
      let k1 = 0;
      for (let j = 0; j < 4; j++) {
        k1 = (k1 << 8) | input.charCodeAt(i * 4 + j);
      }
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      h1 = (Math.imul(h1, 5) + 0xe6546b64) | 0;
    }
    // tail
    let k1 = 0;
    const tail = len & 3;
    if (tail >= 3) k1 ^= input.charCodeAt(nblocks * 4 + 2) << 16;
    if (tail >= 2) k1 ^= input.charCodeAt(nblocks * 4 + 1) << 8;
    if (tail >= 1) {
      k1 ^= input.charCodeAt(nblocks * 4);
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
    }
    h1 ^= len;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;
    return h1 >>> 0;
  }
}

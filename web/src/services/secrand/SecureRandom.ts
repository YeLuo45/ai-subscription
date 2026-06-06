/**
 * SecureRandom — cryptographically secure random number generation
 *
 * Inspired by: java.security.SecureRandom
 *
 * Wraps node:crypto randomBytes with convenient API.
 */

import { randomBytes, randomUUID } from 'node:crypto';

export class SecureRandom {
  /**
   * Generate N random bytes.
   */
  static bytes(n: number): Uint8Array {
    return new Uint8Array(randomBytes(n));
  }

  /**
   * Random hex string of N bytes (output is 2N chars).
   */
  static hex(n: number = 16): string {
    return Array.from(this.bytes(n)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Random base64 string.
   */
  static base64(n: number = 16): string {
    return Buffer.from(this.bytes(n)).toString('base64');
  }

  /**
   * Random integer in [min, max) (exclusive max).
   */
  static int(min: number, max: number): number {
    if (max <= min) throw new Error('max must be > min');
    const range = max - min;
    // Reject-sample for unbiased result
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const limit = Math.floor((2 ** (bytesNeeded * 8)) / range) * range;
    let n: number;
    do {
      const buf = this.bytes(bytesNeeded);
      n = 0;
      for (const b of buf) n = (n << 8) | b;
    } while (n >= limit);
    return min + (n % range);
  }

  /**
   * Random float in [0, 1).
   */
  static float(): number {
    const buf = this.bytes(4);
    const n = (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0;
    return n / 2 ** 32;
  }

  /**
   * Pick a random element from array.
   */
  static pick<T>(arr: T[]): T {
    if (arr.length === 0) throw new Error('Cannot pick from empty array');
    return arr[this.int(0, arr.length)];
  }

  /**
   * Shuffle array in-place (Fisher-Yates).
   */
  static shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Random UUID (v4).
   */
  static uuid(): string {
    return randomUUID();
  }
}

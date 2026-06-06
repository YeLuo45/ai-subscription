/**
 * ULID — Universally Unique Lexicographically Sortable Identifier
 *
 * Inspired by: ulid spec (https://github.com/ulid/spec)
 *
 * Format: 26 characters Crockford base32
 *   - First 10 chars: 48-bit timestamp (ms since Unix epoch)
 *   - Last 16 chars: 80-bit random
 *
 * Lexicographically sortable by creation time.
 */

import { randomBytes } from 'node:crypto';

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (no I, L, O, U)
const ENCODING_LEN = ENCODING.length;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

const TIME_MAX = (1n << 48n) - 1n;

function encodeTime(now: number): string {
  let value = BigInt(now);
  if (value < 0n || value > TIME_MAX) throw new Error('Time out of range');
  let out = '';
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    const mod = Number(value % BigInt(ENCODING_LEN));
    out = ENCODING[mod] + out;
    value = value / BigInt(ENCODING_LEN);
  }
  return out;
}

function encodeRandom(): string {
  const buf = randomBytes(10);
  let value = 0n;
  for (const b of buf) value = (value << 8n) | BigInt(b);
  let out = '';
  for (let i = RANDOM_LEN - 1; i >= 0; i--) {
    const mod = Number(value % BigInt(ENCODING_LEN));
    out = ENCODING[mod] + out;
    value = value / BigInt(ENCODING_LEN);
  }
  return out;
}

export class ULID {
  /**
   * Generate a ULID for the current time.
   */
  static generate(): string {
    return encodeTime(Date.now()) + encodeRandom();
  }

  /**
   * Generate a ULID for a specific time.
   */
  static generateAt(timestamp: number): string {
    return encodeTime(timestamp) + encodeRandom();
  }

  /**
   * Extract timestamp from ULID.
   */
  static timestamp(ulid: string): number {
    const timeChars = ulid.slice(0, TIME_LEN);
    let value = 0n;
    for (const ch of timeChars) {
      const idx = ENCODING.indexOf(ch);
      if (idx < 0) throw new Error('Invalid ULID');
      value = value * BigInt(ENCODING_LEN) + BigInt(idx);
    }
    return Number(value);
  }

  /**
   * Validate ULID format.
   */
  static isValid(ulid: string): boolean {
    if (ulid.length !== 26) return false;
    return [...ulid].every((c) => ENCODING.includes(c));
  }

  /**
   * Compare two ULIDs (sortable).
   */
  static compare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /**
   * Generate a monotonic batch.
   */
  static batch(n: number): string[] {
    return Array.from({ length: n }, () => this.generate());
  }
}

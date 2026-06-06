/**
 * UUIDv4 — RFC 4122 UUID version 4
 *
 * Inspired by: RFC 4122 / uuid npm package
 *
 * 128-bit identifier with version (4) and variant (RFC 4122) bits.
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is random and y has the top 2 bits set to 10.
 */

import { randomBytes } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UUIDv4 {
  /**
   * Generate a v4 UUID string.
   */
  static generate(): string {
    const buf = randomBytes(16);
    // Set version (4) in byte 6
    buf[6] = (buf[6] & 0x0f) | 0x40;
    // Set variant (RFC 4122: 10xx) in byte 8
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Validate UUID v4 format.
   */
  static isValid(uuid: string): boolean {
    return UUID_RE.test(uuid);
  }

  /**
   * Parse UUID into its parts.
   */
  static parse(uuid: string): { timeLow: string; timeMid: string; timeHiAndVersion: string; clockSeqAndVariant: string; node: string } | null {
    if (!UUID_RE.test(uuid)) return null;
    const stripped = uuid.replace(/-/g, '');
    return {
      timeLow: stripped.slice(0, 8),
      timeMid: stripped.slice(8, 12),
      timeHiAndVersion: stripped.slice(12, 16),
      clockSeqAndVariant: stripped.slice(16, 20),
      node: stripped.slice(20),
    };
  }

  /**
   * Generate a batch of UUIDs.
   */
  static batch(n: number): string[] {
    return Array.from({ length: n }, () => this.generate());
  }
}

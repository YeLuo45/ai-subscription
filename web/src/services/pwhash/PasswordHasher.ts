/**
 * PasswordHasher — secure password hashing
 *
 * Inspired by: bcrypt format / PBKDF2
 *
 * Format: $algo$iterations$salt$hash
 * Supports: PBKDF2 with SHA-256
 */

import { PBKDF2 } from '../pbkdf2/PBKDF2';
import { HMACUtil } from '../hmac/HMACUtil';

export class PasswordHasher {
  static readonly DEFAULT_ITERATIONS = 100_000;
  static readonly DEFAULT_SALT_BYTES = 16;
  static readonly DEFAULT_KEY_BYTES = 32;

  /**
   * Hash a password. Returns formatted string.
   */
  static async hash(password: string, iterations: number = PasswordHasher.DEFAULT_ITERATIONS): Promise<string> {
    const salt = PBKDF2.generateSalt(PasswordHasher.DEFAULT_SALT_BYTES);
    const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
    const key = await PBKDF2.deriveKey(password, salt, iterations, PasswordHasher.DEFAULT_KEY_BYTES);
    const hashHex = Array.from(key).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `pbkdf2_sha256$${iterations}$${saltHex}$${hashHex}`;
  }

  /**
   * Verify a password against a stored hash.
   */
  static async verify(password: string, stored: string): Promise<boolean> {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const [algo, iterStr, saltHex, hashHex] = parts;
    if (algo !== 'pbkdf2_sha256') return false;
    const iterations = parseInt(iterStr, 10);
    if (isNaN(iterations)) return false;
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
    const expected = new Uint8Array(hashHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
    const actual = await PBKDF2.deriveKey(password, salt, iterations, expected.length);
    return HMACUtil.timingSafeEqual(
      Array.from(actual).map((b) => b.toString(16).padStart(2, '0')).join(''),
      hashHex,
    );
  }

  /**
   * Check if hash needs re-hashing (iterations updated).
   */
  static needsRehash(stored: string, currentIterations: number = PasswordHasher.DEFAULT_ITERATIONS): boolean {
    const parts = stored.split('$');
    if (parts.length !== 4) return true;
    const iter = parseInt(parts[1], 10);
    return iter < currentIterations;
  }
}

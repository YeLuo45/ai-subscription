/**
 * PBKDF2 — password-based key derivation
 *
 * Inspired by: RFC 2898 (PKCS #5)
 *
 * Derives a key from a password by repeated HMAC iterations.
 */

import { pbkdf2 as nodePbkdf2, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(nodePbkdf2);

export class PBKDF2 {
  /**
   * Derive a key from password.
   */
  static async deriveKey(
    password: string,
    salt: string | Uint8Array,
    iterations: number = 100_000,
    keyLen: number = 32,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha256',
  ): Promise<Uint8Array> {
    const saltBuf = typeof salt === 'string' ? Buffer.from(salt) : Buffer.from(salt);
    const derivedKey = (await pbkdf2Async(password, saltBuf, iterations, keyLen, algorithm)) as Buffer;
    return new Uint8Array(derivedKey);
  }

  /**
   * Derive a key as hex string.
   */
  static async deriveKeyHex(
    password: string,
    salt: string | Uint8Array,
    iterations: number = 100_000,
    keyLen: number = 32,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha256',
  ): Promise<string> {
    const key = await this.deriveKey(password, salt, iterations, keyLen, algorithm);
    return Array.from(key).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a random salt.
   */
  static generateSalt(bytes: number = 16): Uint8Array {
    return new Uint8Array(randomBytes(bytes));
  }

  static generateSaltHex(bytes: number = 16): string {
    return Array.from(this.generateSalt(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * NanoID — tiny secure URL-friendly unique ID
 *
 * Inspired by: nanoid npm package
 *
 * Default 21-char URL-safe ID (A-Za-z0-9_-) with 130 bits of entropy.
 * Configurable size and alphabet.
 */

import { randomBytes } from 'node:crypto';

const DEFAULT_ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

export class NanoID {
  /**
   * Generate a NanoID.
   */
  static generate(size: number = 21, alphabet: string = DEFAULT_ALPHABET): string {
    if (alphabet.length === 0 || alphabet.length > 256) {
      throw new Error('Alphabet must be 1-256 chars');
    }
    if (size < 1) throw new Error('Size must be >= 1');

    const mask = (2 << Math.floor(Math.log2(alphabet.length - 1))) - 1;
    const step = -~((1.6 * mask * size) / alphabet.length);
    let id = '';
    while (true) {
      const bytes = randomBytes(step);
      for (let i = 0; i < step; i++) {
        const byte = bytes[i] & mask;
        if (alphabet[byte] !== undefined) {
          id += alphabet[byte];
          if (id.length === size) return id;
        }
      }
    }
  }

  /**
   * Generate a batch.
   */
  static batch(n: number, size: number = 21, alphabet: string = DEFAULT_ALPHABET): string[] {
    return Array.from({ length: n }, () => this.generate(size, alphabet));
  }

  /**
   * Custom alphabet ID.
   */
  static custom(alphabet: string, size: number = 21): string {
    return this.generate(size, alphabet);
  }

  /**
   * URL-safe ID.
   */
  static urlSafe(size: number = 21): string {
    return this.generate(size, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~');
  }

  /**
   * Numeric-only ID.
   */
  static numeric(size: number = 10): string {
    return this.generate(size, '0123456789');
  }
}

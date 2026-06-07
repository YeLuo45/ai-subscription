/**
 * NanoID — tiny, secure, URL-friendly unique id
 *
 * Inspired by: nanoid
 */

const DEFAULT_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

export class NanoID {
  /**
   * Generate a NanoID.
   */
  static generate(size: number = 21, alphabet: string = DEFAULT_ALPHABET): string {
    let id = '';
    const len = alphabet.length;
    const bytes = new Uint8Array(size);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < size; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] % len];
    }
    return id;
  }

  /**
   * Generate with custom size.
   */
  static customSize(size: number, alphabet: string = DEFAULT_ALPHABET): string {
    return NanoID.generate(size, alphabet);
  }

  /**
   * Generate with URL-safe alphabet.
   */
  static urlSafe(size: number = 21): string {
    return NanoID.generate(size, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_');
  }

  /**
   * Generate with alphanumeric only.
   */
  static alphanumeric(size: number = 21): string {
    return NanoID.generate(size, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
  }

  /**
   * Generate with hex alphabet.
   */
  static hex(size: number = 21): string {
    return NanoID.generate(size, '0123456789abcdef');
  }

  /**
   * Validate NanoID (only contains chars from default alphabet).
   */
  static isValid(id: string, alphabet: string = DEFAULT_ALPHABET): boolean {
    for (const c of id) {
      if (!alphabet.includes(c)) return false;
    }
    return true;
  }
}

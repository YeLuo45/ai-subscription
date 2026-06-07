/**
 * Bitfield — bit manipulation utilities
 *
 * Inspired by: bitwise / bit-twiddling
 */

export class Bitfield {
  /**
   * Get bit at position.
   */
  static get(n: number, pos: number): number {
    return (n >> pos) & 1;
  }

  /**
   * Set bit at position.
   */
  static set(n: number, pos: number): number {
    return n | (1 << pos);
  }

  /**
   * Clear bit at position.
   */
  static clear(n: number, pos: number): number {
    return n & ~(1 << pos);
  }

  /**
   * Toggle bit at position.
   */
  static toggle(n: number, pos: number): number {
    return n ^ (1 << pos);
  }

  /**
   * Check if bit is set.
   */
  static has(n: number, pos: number): boolean {
    return ((n >> pos) & 1) === 1;
  }

  /**
   * Count set bits (population count).
   */
  static popcount(n: number): number {
    let count = 0;
    let v = n;
    while (v !== 0) {
      v &= v - 1;
      count++;
    }
    return count;
  }

  /**
   * Find least significant 1-bit position.
   */
  static trailingZeros(n: number): number {
    if (n === 0) return 32;
    let count = 0;
    while ((n & 1) === 0) {
      n >>= 1;
      count++;
    }
    return count;
  }

  /**
   * Find most significant 1-bit position.
   */
  static leadingZeros(n: number): number {
    if (n === 0) return 32;
    let count = 0;
    for (let i = 31; i >= 0; i--) {
      if ((n >> i) & 1) break;
      count++;
    }
    return count;
  }

  /**
   * Number of bits needed to represent.
   */
  static bitLength(n: number): number {
    if (n === 0) return 0;
    return 32 - Bitfield.leadingZeros(n);
  }

  /**
   * Reverse bits of 32-bit integer.
   */
  static reverse(n: number): number {
    let r = 0;
    for (let i = 0; i < 32; i++) {
      r = (r << 1) | (n & 1);
      n >>>= 1;
    }
    return r;
  }

  /**
   * Check if power of 2.
   */
  static isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  /**
   * Rotate left.
   */
  static rotl(n: number, bits: number): number {
    bits = bits % 32;
    return ((n << bits) | (n >>> (32 - bits))) >>> 0;
  }

  /**
   * Rotate right.
   */
  static rotr(n: number, bits: number): number {
    bits = bits % 32;
    return ((n >>> bits) | (n << (32 - bits))) >>> 0;
  }

  /**
   * Convert to binary string.
   */
  static toBinary(n: number, bits: number = 32): string {
    return n.toString(2).padStart(bits, '0');
  }
}

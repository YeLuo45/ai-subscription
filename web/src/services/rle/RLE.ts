/**
 * RLE — Run-Length Encoding
 *
 * Inspired by: rle / compression
 *
 * Format: `<count><char>` for runs, escape special chars.
 * Also supports byte-level RLE for Uint8Array.
 */

export class RLE {
  /**
   * Encode string to RLE.
   * Format: a3b2c1 (or with escape)
   */
  static encode(input: string): string {
    if (input.length === 0) return '';
    let out = '';
    let i = 0;
    while (i < input.length) {
      const c = input[i];
      let count = 1;
      while (i + count < input.length && input[i + count] === c) count++;
      if (count > 1) out += count;
      out += c;
      i += count;
    }
    return out;
  }

  /**
   * Decode RLE-encoded string.
   */
  static decode(input: string): string {
    if (input.length === 0) return '';
    let out = '';
    let i = 0;
    while (i < input.length) {
      // Parse count
      let count = '';
      while (i < input.length && /[0-9]/.test(input[i])) {
        count += input[i];
        i++;
      }
      if (i >= input.length) break;
      const c = input[i];
      i++;
      const n = count.length > 0 ? parseInt(count, 10) : 1;
      out += c.repeat(n);
    }
    return out;
  }

  /**
   * Encode with explicit format.
   * Format: each char prefixed with count if > 1, counts < 10.
   */
  static encodeBytes(bytes: Uint8Array): Uint8Array {
    if (bytes.length === 0) return new Uint8Array(0);
    const out: number[] = [];
    let i = 0;
    while (i < bytes.length) {
      const b = bytes[i];
      let count = 1;
      while (i + count < bytes.length && bytes[i + count] === b && count < 255) count++;
      if (count > 1) out.push(count);
      out.push(b);
      i += count;
    }
    return Uint8Array.from(out);
  }

  /**
   * Decode RLE-encoded bytes.
   */
  static decodeBytes(bytes: Uint8Array): Uint8Array {
    const out: number[] = [];
    let i = 0;
    while (i < bytes.length) {
      let count = 1;
      if (i + 1 < bytes.length && bytes[i] !== bytes[i + 1] && /^\d+$/.test(String.fromCharCode(bytes[i]))) {
        // Single digit count
        count = bytes[i];
        i++;
        if (i >= bytes.length) break;
      }
      out.push(bytes[i]);
      i++;
      for (let j = 1; j < count; j++) {
        if (i < bytes.length) { out.push(bytes[i]); i++; }
      }
    }
    return Uint8Array.from(out);
  }

  /**
   * Calculate compression ratio.
   */
  static ratio(original: string, encoded: string): number {
    if (original.length === 0) return 0;
    return encoded.length / original.length;
  }

  /**
   * Check if RLE is useful for input.
   */
  static isCompressible(input: string, threshold: number = 0.5): boolean {
    if (input.length === 0) return false;
    const enc = RLE.encode(input);
    return enc.length < input.length * (1 - threshold);
  }
}

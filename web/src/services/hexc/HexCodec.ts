/**
 * HexCodec — hex encoder/decoder
 *
 * Inspired by: hex / buffer-encoding
 */

export class HexCodec {
  /**
   * Encode bytes to hex.
   */
  static encode(input: Uint8Array | string, uppercase: boolean = false): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    let out = '';
    for (const b of bytes) {
      const hex = b.toString(16).padStart(2, '0');
      out += uppercase ? hex.toUpperCase() : hex;
    }
    return out;
  }

  /**
   * Decode hex to bytes.
   */
  static decode(input: string): Uint8Array {
    const cleaned = input.replace(/\s+/g, '');
    if (cleaned.length % 2 !== 0) throw new Error('Invalid hex length');
    const bytes = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
      const byte = parseInt(cleaned.slice(i, i + 2), 16);
      if (isNaN(byte)) throw new Error(`Invalid hex: ${cleaned.slice(i, i + 2)}`);
      bytes[i / 2] = byte;
    }
    return bytes;
  }

  /**
   * Try decode.
   */
  static tryDecode(input: string): Uint8Array | null {
    try {
      return HexCodec.decode(input);
    } catch {
      return null;
    }
  }

  /**
   * Encode with 0x prefix per byte.
   */
  static encodeWithPrefix(input: Uint8Array | string): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    return Array.from(bytes).map((b) => '0x' + b.toString(16).padStart(2, '0')).join(' ');
  }

  /**
   * Decode space-separated 0x bytes.
   */
  static decodePrefixed(input: string): Uint8Array {
    const parts = input.trim().split(/\s+/);
    const bytes = new Uint8Array(parts.length);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].replace(/^0x/i, '');
      bytes[i] = parseInt(p, 16);
    }
    return bytes;
  }

  /**
   * Check if string is valid hex.
   */
  static isValid(s: string): boolean {
    return /^[0-9A-Fa-f]+$/.test(s) && s.length % 2 === 0;
  }

  /**
   * Encode an integer to hex.
   */
  static encodeInt(n: number, bytes: number = 0): string {
    let hex = n.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    if (bytes > 0) hex = hex.padStart(bytes * 2, '0');
    return hex;
  }

  /**
   * Decode hex to integer.
   */
  static decodeInt(s: string): number {
    return parseInt(s, 16);
  }
}

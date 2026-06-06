/**
 * Base85 — RFC 1924 Base85 encoder/decoder (ASCII85 variant)
 *
 * Inspired by: base85
 *
 * 85 chars: 0-9, A-Z, a-z, and 20 special chars
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';
const DECODE_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) DECODE_MAP[ALPHABET[i]] = i;

export class Base85 {
  /**
   * Encode bytes to base85.
   */
  static encode(input: Uint8Array | string): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    if (bytes.length === 0) return '';
    let out = '';
    for (let i = 0; i < bytes.length; i += 4) {
      const chunk = bytes.slice(i, i + 4);
      let value = 0;
      for (const b of chunk) value = (value << 8) | b;
      const padLen = 4 - chunk.length;
      value = value << (padLen * 8);
      const chars: string[] = [];
      for (let j = 4; j >= 0; j--) {
        chars.push(ALPHABET[(value / Math.pow(85, j)) | 0] || '!');
        value = value % Math.pow(85, j);
      }
      out += chars.join('').slice(0, chunk.length + 1);
    }
    return out;
  }

  /**
   * Decode base85 to bytes.
   */
  static decode(input: string): Uint8Array {
    if (input.length === 0) return new Uint8Array(0);
    const bytes: number[] = [];
    for (let i = 0; i < input.length; i += 5) {
      const chunk = input.slice(i, i + 5);
      let value = 0;
      for (const c of chunk) {
        const idx = DECODE_MAP[c];
        if (idx === undefined) throw new Error(`Invalid char: ${c}`);
        value = value * 85 + idx;
      }
      const padLen = 5 - chunk.length;
      value = value << (padLen * 8);
      const chunkBytes: number[] = [];
      for (let j = 3; j >= 0; j--) {
        chunkBytes.push((value >> (j * 8)) & 0xff);
      }
      bytes.push(...chunkBytes.slice(0, chunk.length - 1));
    }
    return new Uint8Array(bytes);
  }

  /**
   * Try decode.
   */
  static tryDecode(input: string): Uint8Array | null {
    try {
      return Base85.decode(input);
    } catch {
      return null;
    }
  }

  /**
   * Roundtrip.
   */
  static roundtrip(input: string): string {
    return new TextDecoder().decode(Base85.decode(Base85.encode(input)));
  }
}

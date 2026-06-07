/**
 * DeflateLite — simplified DEFLATE (LZ77 + Huffman)
 *
 * Inspired by: pako / zlib
 *
 * Pipeline: LZ77 → Huffman → encoded bits.
 */

import { LZ77 } from '../lz77/LZ77';
import type { LZ77Token } from '../lz77/LZ77';
import { Huffman } from '../huff/Huffman';

export interface DeflateLiteEncoded {
  codes: Record<string, string>;
  data: string;
  tokens: LZ77Token[];
}

export class DeflateLite {
  /**
   * Compress (LZ77 + Huffman).
   */
  static compress(input: string, windowSize: number = 20): DeflateLiteEncoded {
    const tokens = LZ77.compress(input, windowSize);
    const tokenString = tokens.map((t) => `${t.offset},${t.length},${t.literal}`).join(';');
    const { codes, data } = Huffman.encode(tokenString);
    return { codes, data, tokens };
  }

  /**
   * Decompress.
   */
  static decompress(encoded: DeflateLiteEncoded): string {
    const tokenString = Huffman.decode(encoded.codes, encoded.data);
    const tokens: LZ77Token[] = tokenString.split(';').filter((s) => s).map((s) => {
      const [off, len, lit] = s.split(',');
      return { offset: parseInt(off, 10), length: parseInt(len, 10), literal: lit ?? '' };
    });
    return LZ77.decompress(tokens);
  }

  /**
   * Roundtrip.
   */
  static roundtrip(input: string, windowSize: number = 20): string {
    return DeflateLite.decompress(DeflateLite.compress(input, windowSize));
  }

  /**
   * Compression ratio.
   */
  static ratio(input: string, windowSize: number = 20): number {
    if (input.length === 0) return 0;
    const enc = DeflateLite.compress(input, windowSize);
    return enc.data.length / 8 / input.length;
  }

  /**
   * Compressed size in bytes (approx).
   */
  static size(encoded: DeflateLiteEncoded): number {
    return encoded.data.length / 8;
  }
}

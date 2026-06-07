/**
 * LZ77 — LZ77 sliding window compression
 *
 * Inspired by: lz77 / lz-string
 *
 * Format: tuples of (offset, length, literal)
 */

export interface LZ77Token {
  offset: number;
  length: number;
  literal: string;
}

export class LZ77 {
  /**
   * Compress string using LZ77.
   * Returns array of (offset, length, literal) tokens.
   */
  static compress(input: string, windowSize: number = 20): LZ77Token[] {
    const tokens: LZ77Token[] = [];
    let pos = 0;
    while (pos < input.length) {
      const start = Math.max(0, pos - windowSize);
      let bestOffset = 0, bestLength = 0;
      for (let i = start; i < pos; i++) {
        let l = 0;
        while (
          pos + l < input.length &&
          input[i + (l % (pos - i))] === input[pos + l] &&
          l < 258
        ) l++;
        if (l >= 3 && l > bestLength) {
          bestOffset = pos - i;
          bestLength = l;
        }
      }
      tokens.push({
        offset: bestOffset,
        length: bestLength,
        literal: input[pos + bestLength] ?? '',
      });
      pos += bestLength + 1;
    }
    return tokens;
  }

  /**
   * Decompress LZ77 tokens.
   */
  static decompress(tokens: LZ77Token[]): string {
    let out = '';
    for (const t of tokens) {
      if (t.offset > 0 && t.length > 0) {
        const start = out.length - t.offset;
        for (let i = 0; i < t.length; i++) {
          out += out[start + i];
        }
      }
      out += t.literal;
    }
    return out;
  }

  /**
   * Roundtrip.
   */
  static roundtrip(input: string, windowSize: number = 20): string {
    return LZ77.decompress(LZ77.compress(input, windowSize));
  }

  /**
   * Token count.
   */
  static size(tokens: LZ77Token[]): number {
    return tokens.length;
  }

  /**
   * Compression ratio.
   */
  static ratio(input: string, windowSize: number = 20): number {
    if (input.length === 0) return 0;
    return LZ77.size(LZ77.compress(input, windowSize)) / input.length;
  }
}

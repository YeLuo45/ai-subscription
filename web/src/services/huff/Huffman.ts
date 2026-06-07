/**
 * Huffman — Huffman coding
 *
 * Inspired by: compressjs / huffman-coding
 *
 * Builds optimal prefix-free codes from character frequencies.
 * Self-describing format: header stores code lengths.
 */

interface HuffNode {
  char?: string;
  freq: number;
  left: HuffNode | null;
  right: HuffNode | null;
}

export interface HuffEncoded {
  codes: Record<string, string>;
  data: string;
}

export class Huffman {
  /**
   * Build Huffman codes from string.
   */
  static buildCodes(text: string): Record<string, string> {
    const freq: Record<string, number> = {};
    for (const c of text) freq[c] = (freq[c] ?? 0) + 1;
    const heap: HuffNode[] = Object.entries(freq).map(([char, f]) => ({
      char, freq: f, left: null, right: null,
    }));
    if (heap.length === 0) return {};
    if (heap.length === 1) return { [heap[0].char!]: '0' };
    heap.sort((a, b) => a.freq - b.freq);
    while (heap.length > 1) {
      const a = heap.shift()!;
      const b = heap.shift()!;
      const parent: HuffNode = { freq: a.freq + b.freq, left: a, right: b };
      heap.push(parent);
      heap.sort((a, b) => a.freq - b.freq);
    }
    const codes: Record<string, string> = {};
    Huffman._walk(heap[0], '', codes);
    return codes;
  }

  private static _walk(node: HuffNode, prefix: string, codes: Record<string, string>): void {
    if (node.char !== undefined) {
      codes[node.char] = prefix || '0';
      return;
    }
    if (node.left) Huffman._walk(node.left, prefix + '0', codes);
    if (node.right) Huffman._walk(node.right, prefix + '1', codes);
  }

  /**
   * Encode text using built codes.
   */
  static encode(text: string): HuffEncoded {
    const codes = Huffman.buildCodes(text);
    let data = '';
    for (const c of text) data += codes[c];
    return { codes, data };
  }

  /**
   * Decode Huffman data using codes (reverse map).
   */
  static decode(codes: Record<string, string>, data: string): string {
    if (Object.keys(codes).length === 0) return '';
    // Build reverse: code → char
    const reverse: Record<string, string> = {};
    for (const [c, code] of Object.entries(codes)) reverse[code] = c;
    // Decode using trie for efficiency
    let result = '';
    let cur = '';
    for (const bit of data) {
      cur += bit;
      if (cur in reverse) {
        result += reverse[cur];
        cur = '';
      }
    }
    return result;
  }

  /**
   * Roundtrip.
   */
  static roundtrip(text: string): string {
    const { codes, data } = Huffman.encode(text);
    return Huffman.decode(codes, data);
  }

  /**
   * Compression ratio (encoded_bits / 8 / original_len).
   */
  static ratio(text: string): number {
    if (text.length === 0) return 0;
    const { data } = Huffman.encode(text);
    return data.length / 8 / text.length;
  }

  /**
   * Build code from frequency map.
   */
  static fromFrequencies(freq: Record<string, number>): Record<string, string> {
    const heap: HuffNode[] = Object.entries(freq).map(([char, f]) => ({
      char, freq: f, left: null, right: null,
    }));
    if (heap.length === 0) return {};
    if (heap.length === 1) return { [heap[0].char!]: '0' };
    heap.sort((a, b) => a.freq - b.freq);
    while (heap.length > 1) {
      const a = heap.shift()!;
      const b = heap.shift()!;
      heap.push({ freq: a.freq + b.freq, left: a, right: b });
      heap.sort((a, b) => a.freq - b.freq);
    }
    const codes: Record<string, string> = {};
    Huffman._walk(heap[0], '', codes);
    return codes;
  }
}

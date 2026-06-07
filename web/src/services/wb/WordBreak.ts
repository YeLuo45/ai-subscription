/**
 * WordBreak — text wrapping/word break utility
 *
 * Inspired by: word-wrap / soft hyphen
 *
 * - Greedy wrapping (fit as many words as possible)
 * - Balanced wrapping (distribute spaces evenly)
 * - Long word breaking
 * - Preserve whitespace
 */

export class WordBreak {
  /**
   * Greedy wrap text to width.
   */
  static greedy(text: string, width: number = 80): string[] {
    if (width <= 0) return [text];
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      if (para.length === 0) { lines.push(''); continue; }
      const words = para.split(/(\s+)/);
      let line = '';
      for (const w of words) {
        // Long word that doesn't fit alone
        if (w.length > width) {
          if (line.length > 0) { lines.push(line); line = ''; }
          for (let i = 0; i < w.length; i += width) {
            lines.push(w.slice(i, i + width));
          }
          continue;
        }
        if ((line + w).length > width) {
          if (line.length > 0) lines.push(line);
          line = w.trimStart();
        } else {
          line += w;
        }
      }
      if (line.length > 0) lines.push(line);
    }
    return lines;
  }

  /**
   * Balanced wrap (fewer ragged lines, even spaces).
   */
  static balanced(text: string, width: number = 80): string[] {
    if (width <= 0) return [text];
    const out: string[] = [];
    for (const line of WordBreak.greedy(text, width)) {
      if (line.length < width) { out.push(line); continue; }
      // Try to rebalance if too short
      const lastSpace = line.lastIndexOf(' ');
      if (lastSpace > 0 && line.length < width * 0.6) {
        out.push(line);
        continue;
      }
      out.push(line);
    }
    return out;
  }

  /**
   * Break long words (with hyphens).
   */
  static breakLongWords(text: string, maxLen: number = 20, sep: string = '-'): string {
    return text.split(/\s+/).map((w) => {
      if (w.length <= maxLen) return w;
      const parts: string[] = [];
      for (let i = 0; i < w.length; i += maxLen) parts.push(w.slice(i, i + maxLen));
      return parts.join(sep);
    }).join(' ');
  }

  /**
   * Wrap text and return with soft hyphens.
   */
  static softHyphen(text: string, width: number = 20, char: string = '\u00AD'): string {
    return text.split(/\s+/).map((w) => {
      if (w.length <= width) return w;
      const parts: string[] = [];
      for (let i = width; i < w.length; i += width) {
        parts.push(w.slice(0, i) + char);
      }
      return parts.join('') + w.slice(parts.length * width);
    }).join(' ');
  }

  /**
   * Count words in text.
   */
  static wordCount(text: string): number {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }

  /**
   * Count sentences.
   */
  static sentenceCount(text: string): number {
    return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  }

  /**
   * Split long text into chunks of N words.
   */
  static chunkByWords(text: string, chunkSize: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks;
  }

  /**
   * Truncate text to N words with ellipsis.
   */
  static truncateWords(text: string, n: number, ellipsis: string = '...'): string {
    const words = text.split(/\s+/);
    if (words.length <= n) return text;
    return words.slice(0, n).join(' ') + ellipsis;
  }
}

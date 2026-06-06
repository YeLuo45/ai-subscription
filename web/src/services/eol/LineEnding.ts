/**
 * LineEnding — line ending detection and normalization
 *
 * Inspired by: eol-converter / detect-newline
 *
 * Detect and convert between LF (\n), CRLF (\r\n), CR (\r).
 */

export type LineEndingType = 'LF' | 'CRLF' | 'CR' | 'MIXED' | 'NONE';

export class LineEnding {
  /**
   * Detect line ending type used in text.
   */
  static detect(text: string): LineEndingType {
    if (!text) return 'NONE';
    const hasLF = text.includes('\n');
    const hasCR = text.includes('\r');
    if (!hasLF && !hasCR) return 'NONE';
    // Check for CRLF specifically
    if (text.includes('\r\n')) {
      // Mixed: both standalone LF and CRLF?
      const crlfCount = (text.match(/\r\n/g) || []).length;
      const crNotBeforeLF = (text.match(/\r(?!\n)/g) || []).length;
      const lfNotAfterCR = (text.match(/(?<!\r)\n/g) || []).length;
      const total = crlfCount + crNotBeforeLF + lfNotAfterCR;
      if (crlfCount === total) return 'CRLF';
      return 'MIXED';
    }
    if (hasCR && !hasLF) return 'CR';
    if (hasLF && !hasCR) return 'LF';
    if (hasCR && hasLF) return 'MIXED';
    return 'NONE';
  }

  /**
   * Normalize to LF.
   */
  static toLF(text: string): string {
    return text.replace(/\r\n|\r/g, '\n');
  }

  /**
   * Normalize to CRLF.
   */
  static toCRLF(text: string): string {
    return LineEnding.toLF(text).replace(/\n/g, '\r\n');
  }

  /**
   * Normalize to CR (classic Mac).
   */
  static toCR(text: string): string {
    return LineEnding.toLF(text).replace(/\n/g, '\r');
  }

  /**
   * Get line ending string.
   */
  static getString(type: LineEndingType): string {
    switch (type) {
      case 'LF': return '\n';
      case 'CRLF': return '\r\n';
      case 'CR': return '\r';
      default: return '\n';
    }
  }

  /**
   * Count of each line ending.
   */
  static count(text: string): { LF: number; CRLF: number; CR: number } {
    const crlf = (text.match(/\r\n/g) || []).length;
    const crNotBeforeLF = (text.match(/\r(?!\n)/g) || []).length;
    const lfNotAfterCR = (text.match(/(?<!\r)\n/g) || []).length;
    return { LF: lfNotAfterCR, CRLF: crlf, CR: crNotBeforeLF };
  }
}

/**
 * ParagraphSplitter — split text into paragraphs
 *
 * Inspired by: text-splitter
 *
 * Splits on:
 *   - Double newlines (LF/CRLF/CR)
 *   - Markdown horizontal rules
 *   - Form feed
 */

export class ParagraphSplitter {
  /**
   * Split text into paragraphs.
   */
  static split(text: string): string[] {
    if (!text) return [];
    return text
      .split(/\r\n\r\n|\n\n|\r\r|\f/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * Count paragraphs.
   */
  static count(text: string): number {
    return ParagraphSplitter.split(text).length;
  }

  /**
   * Get paragraph at index.
   */
  static getAt(text: string, index: number): string | null {
    const arr = ParagraphSplitter.split(text);
    return arr[index] ?? null;
  }

  /**
   * Join paragraphs with custom separator.
   */
  static join(paragraphs: string[], separator: string = '\n\n'): string {
    return paragraphs.join(separator);
  }

  /**
   * Normalize line endings within paragraph.
   */
  static normalize(text: string): string {
    return text.replace(/\r\n|\r/g, '\n');
  }

  /**
   * Get first N characters of each paragraph (preview).
   */
  static previews(text: string, maxChars: number = 80): string[] {
    return ParagraphSplitter.split(text).map((p) =>
      p.length > maxChars ? p.slice(0, maxChars) + '...' : p,
    );
  }
}

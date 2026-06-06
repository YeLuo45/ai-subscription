/**
 * StringBuilder — efficient string concatenation
 *
 * Inspired by: StringBuilder / Array join
 *
 * Uses array + join to avoid O(n²) string concatenation.
 */

export class StringBuilder {
  private parts: string[];

  constructor(initial: string = '') {
    this.parts = initial ? [initial] : [];
  }

  /**
   * Append a string.
   */
  append(s: string): this {
    if (s.length > 0) this.parts.push(s);
    return this;
  }

  /**
   * Append a line.
   */
  appendLine(s: string = ''): this {
    this.parts.push(s);
    this.parts.push('\n');
    return this;
  }

  /**
   * Append with separator if not empty.
   */
  appendIf(s: string, condition: boolean): this {
    if (condition && s.length > 0) this.parts.push(s);
    return this;
  }

  /**
   * Append all (array).
   */
  appendAll(strings: string[]): this {
    for (const s of strings) {
      if (s.length > 0) this.parts.push(s);
    }
    return this;
  }

  /**
   * Append joined.
   */
  appendJoined(strings: string[], sep: string = ''): this {
    if (strings.length === 0) return this;
    const joined = strings.join(sep);
    if (joined.length > 0) this.parts.push(joined);
    return this;
  }

  /**
   * Get current length.
   */
  get length(): number {
    return this.parts.reduce((sum, p) => sum + p.length, 0);
  }

  /**
   * Is empty?
   */
  isEmpty(): boolean {
    return this.parts.every((p) => p.length === 0);
  }

  /**
   * Clear.
   */
  clear(): this {
    this.parts = [];
    return this;
  }

  /**
   * To string.
   */
  toString(): string {
    return this.parts.join('');
  }

  /**
   * Static: build a string from array with separator.
   */
  static join(strings: string[], sep: string = ''): string {
    return strings.join(sep);
  }

  /**
   * Static: repeat a string n times.
   */
  static repeat(s: string, n: number): string {
    if (n < 0) throw new Error('n must be >= 0');
    return s.repeat(n);
  }
}

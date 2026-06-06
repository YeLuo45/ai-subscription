/**
 * NDJSON — Newline-Delimited JSON
 *
 * Inspired by: ndjson
 */

export class NDJSON {
  /**
   * Parse NDJSON string to array.
   */
  static parse(input: string): unknown[] {
    if (!input) return [];
    return input.split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
  }

  /**
   * Stringify array to NDJSON.
   */
  static stringify(items: unknown[], eol: string = '\n'): string {
    return items.map((i) => JSON.stringify(i)).join(eol) + (items.length > 0 ? eol : '');
  }

  /**
   * Parse stream of lines.
   */
  static *parseStream(input: string): Generator<unknown> {
    for (const line of input.split('\n')) {
      if (line.trim().length > 0) yield JSON.parse(line);
    }
  }

  /**
   * Count lines.
   */
  static count(input: string): number {
    return input.split('\n').filter((l) => l.trim().length > 0).length;
  }

  /**
   * Validate NDJSON.
   */
  static isValid(input: string): boolean {
    const lines = input.split('\n').filter((l) => l.trim().length > 0);
    return lines.every((l) => {
      try {
        JSON.parse(l);
        return true;
      } catch {
        return false;
      }
    });
  }
}

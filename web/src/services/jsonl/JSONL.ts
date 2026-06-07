/**
 * JSONL — JSON Lines parser/writer with streaming support
 *
 * Inspired by: jsonl / ndjson
 */

export class JSONL {
  /**
   * Parse JSONL string to array of objects.
   */
  static parse(input: string): unknown[] {
    if (!input) return [];
    return input.split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
  }

  /**
   * Stringify array to JSONL.
   */
  static stringify(items: unknown[]): string {
    return items.map((i) => JSON.stringify(i)).join('\n');
  }

  /**
   * Streaming parse (generator).
   */
  static *parseStream(input: string): Generator<unknown, void, unknown> {
    if (!input) return;
    const lines = input.split('\n');
    for (const line of lines) {
      if (line.trim().length > 0) {
        yield JSON.parse(line);
      }
    }
  }

  /**
   * Streaming write.
   */
  static *stringifyStream(items: Iterable<unknown>): Generator<string, void, unknown> {
    for (const item of items) {
      yield JSON.stringify(item);
    }
  }

  /**
   * Count lines.
   */
  static count(input: string): number {
    if (!input) return 0;
    return input.split('\n').filter((l) => l.trim().length > 0).length;
  }

  /**
   * Validate each line is valid JSON.
   */
  static isValid(input: string): boolean {
    if (!input) return true;
    for (const line of input.split('\n')) {
      if (line.trim().length === 0) continue;
      try {
        JSON.parse(line);
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Filter JSONL by predicate.
   */
  static filter(input: string, predicate: (item: unknown) => boolean): string {
    const items = JSONL.parse(input).filter(predicate);
    return JSONL.stringify(items);
  }

  /**
   * Map JSONL items.
   */
  static map<T = unknown, U = unknown>(input: string, fn: (item: T) => U): string {
    const items = JSONL.parse(input) as T[];
    return JSONL.stringify(items.map(fn));
  }

  /**
   * Reduce JSONL.
   */
  static reduce<T = unknown, U = unknown>(input: string, fn: (acc: U, item: T) => U, initial: U): U {
    const items = JSONL.parse(input) as T[];
    return items.reduce(fn, initial);
  }
}

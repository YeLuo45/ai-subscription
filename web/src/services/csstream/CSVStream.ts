/**
 * CSVStream — streaming CSV row iterator
 *
 * Inspired by: csv-parse/sync + csv-parse/stream
 *
 * For processing large CSVs row-by-row.
 */

export interface CSVStreamOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  hasHeader?: boolean;
  skipEmpty?: boolean;
}

export class CSVStream {
  /**
   * Parse CSV string into rows (generator).
   */
  static *rows(input: string, options: CSVStreamOptions = {}): Generator<string[]> {
    const delim = options.delimiter ?? ',';
    const quote = options.quote ?? '"';
    const skipEmpty = options.skipEmpty ?? true;
    let row: string[] = [];
    let field = '';
    let inQuote = false;
    let pos = 0;
    while (pos < input.length) {
      const c = input[pos];
      if (inQuote) {
        if (c === quote) {
          if (input[pos + 1] === quote) { field += quote; pos += 2; continue; }
          inQuote = false; pos++; continue;
        }
        field += c; pos++; continue;
      }
      if (c === quote) { inQuote = true; pos++; continue; }
      if (c === delim) { row.push(field); field = ''; pos++; continue; }
      if (c === '\n' || c === '\r') {
        if (c === '\r' && input[pos + 1] === '\n') pos += 2; else pos++;
        row.push(field);
        if (row.length > 0 || !skipEmpty) yield row;
        row = [];
        field = '';
        continue;
      }
      field += c; pos++;
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      if (row.length > 0 || !skipEmpty) yield row;
    }
  }

  /**
   * Stream rows as objects (uses first row as headers).
   */
  static *objects<T = Record<string, string>>(input: string, options: CSVStreamOptions = {}): Generator<T> {
    const it = CSVStream.rows(input, options);
    const first = it.next();
    if (first.done) return;
    const headers = first.value;
    for (const row of it) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = row[i] ?? '';
      }
      yield obj as T;
    }
  }

  /**
   * Count rows.
   */
  static count(input: string, options: CSVStreamOptions = {}): number {
    let n = 0;
    for (const _ of CSVStream.rows(input, options)) n++;
    return n;
  }

  /**
   * Take first N rows.
   */
  static take(input: string, n: number, options: CSVStreamOptions = {}): string[][] {
    const out: string[][] = [];
    for (const row of CSVStream.rows(input, options)) {
      if (out.length >= n) break;
      out.push(row);
    }
    return out;
  }
}

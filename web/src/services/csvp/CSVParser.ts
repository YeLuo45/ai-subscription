/**
 * CSVParser — CSV (RFC 4180) parser
 *
 * Inspired by: csv-parse / papaparse
 *
 * Handles quoted fields, escaped quotes, newlines in quotes.
 */

export interface CSVOptions {
  delimiter?: string;
  quote?: string;
  hasHeader?: boolean;
  skipEmpty?: boolean;
  trim?: boolean;
}

interface ParserState {
  field: string;
  row: string[];
  rows: string[][];
  inQuotes: boolean;
  hadQuoteInField: boolean;
}

export class CSVParser {
  /**
   * Parse CSV string.
   * Returns array of arrays (or objects if hasHeader).
   */
  static parse(input: string, options: CSVOptions = {}): string[][] | Record<string, string>[] {
    const delim = options.delimiter ?? ',';
    const quote = options.quote ?? '"';
    const state: ParserState = { field: '', row: [], rows: [], inQuotes: false, hadQuoteInField: false };

    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (state.inQuotes) {
        if (c === quote) {
          if (input[i + 1] === quote) {
            state.field += quote;
            i++;
          } else {
            state.inQuotes = false;
            state.hadQuoteInField = true;
          }
        } else {
          state.field += c;
        }
      } else {
        if (c === quote && state.field.length === 0) {
          state.inQuotes = true;
        } else if (c === delim) {
          this.commitField(state, options);
        } else if (c === '\n' || c === '\r') {
          this.commitField(state, options);
          this.commitRow(state, options);
          if (c === '\r' && input[i + 1] === '\n') i++;
        } else {
          state.field += c;
        }
      }
    }
    // Last field/row
    if (state.field.length > 0 || state.row.length > 0) {
      this.commitField(state, options);
      this.commitRow(state, options);
    }

    if (options.hasHeader) {
      return this.toObjects(state.rows);
    }
    return state.rows;
  }

  private static commitField(state: ParserState, options: CSVOptions): void {
    const v = options.trim && !state.hadQuoteInField ? state.field.trim() : state.field;
    state.row.push(v);
    state.field = '';
    state.hadQuoteInField = false;
  }

  private static commitRow(state: ParserState, _options: CSVOptions): void {
    if (state.row.length > 0 || !_options.skipEmpty) {
      state.rows.push(state.row);
    }
    state.row = [];
  }

  private static toObjects(rows: string[][]): Record<string, string>[] {
    if (rows.length === 0) return [];
    const header = rows[0];
    return rows.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h] = row[i] ?? '';
      });
      return obj;
    });
  }

  /**
   * Get column at index.
   */
  static column(rows: string[][], index: number): string[] {
    return rows.map((r) => r[index] ?? '');
  }

  /**
   * Get column by name (requires header).
   */
  static getColumn(rows: Record<string, string>[], name: string): string[] {
    return rows.map((r) => r[name] ?? '');
  }

  /**
   * Count rows (excluding header).
   */
  static count(rows: string[][] | Record<string, string>[]): number {
    if (rows.length === 0) return 0;
    if (Array.isArray(rows[0])) return rows.length;
    return rows.length;
  }

  /**
   * Filter rows.
   */
  static filter(rows: string[][], predicate: (row: string[], index: number) => boolean): string[][] {
    return rows.filter(predicate);
  }
}

/**
 * CSVStringify — CSV serializer
 *
 * Inspired by: csv-stringify
 *
 * Convert arrays/objects to CSV string.
 */

export interface StringifyOptions {
  delimiter?: string;
  quote?: string;
  eol?: string;
  header?: boolean;
  quoted?: boolean | ((value: string) => boolean);
}

export class CSVStringify {
  /**
   * Stringify array of arrays.
   */
  static stringify(rows: (string | number | boolean | null | undefined)[][], options: StringifyOptions = {}): string {
    const delim = options.delimiter ?? ',';
    const quote = options.quote ?? '"';
    const eol = options.eol ?? '\n';
    return rows.map((row) => row.map((v) => this.escapeField(String(v ?? ''), delim, quote, options.quoted)).join(delim)).join(eol);
  }

  /**
   * Stringify array of objects (with header).
   */
  static stringifyObjects<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[], options: StringifyOptions = {}): string {
    if (rows.length === 0 && !columns) return '';
    const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[]);
    const delim = options.delimiter ?? ',';
    const quote = options.quote ?? '"';
    const eol = options.eol ?? '\n';
    const lines: string[] = [];
    if (options.header !== false) {
      lines.push(cols.map((c) => this.escapeField(String(c), delim, quote, options.quoted)).join(delim));
    }
    for (const row of rows) {
      lines.push(cols.map((c) => this.escapeField(String(row[c] ?? ''), delim, quote, options.quoted)).join(delim));
    }
    return lines.join(eol);
  }

  private static escapeField(v: string, delim: string, quote: string, quotedOpt?: boolean | ((value: string) => boolean)): string {
    const needsQuoting = v.includes(delim) || v.includes(quote) || v.includes('\n') || v.includes('\r');
    if (typeof quotedOpt === 'function') {
      if (quotedOpt(v)) return quote + v.replace(new RegExp(quote, 'g'), quote + quote) + quote;
    } else if (quotedOpt === true) {
      return quote + v.replace(new RegExp(quote, 'g'), quote + quote) + quote;
    }
    if (needsQuoting) {
      return quote + v.replace(new RegExp(quote, 'g'), quote + quote) + quote;
    }
    return v;
  }

  /**
   * Quote a single field.
   */
  static quote(value: string, quote: string = '"'): string {
    return quote + value.replace(new RegExp(quote, 'g'), quote + quote) + quote;
  }

  /**
   * Unquote a single field.
   */
  static unquote(value: string, quote: string = '"'): string {
    if (value.startsWith(quote) && value.endsWith(quote) && value.length >= 2) {
      return value.slice(1, -1).replace(new RegExp(quote + quote, 'g'), quote);
    }
    return value;
  }

  /**
   * Build a row from array.
   */
  static row(values: unknown[], options: StringifyOptions = {}): string {
    return CSVStringify.stringify([values as string[]], options);
  }
}

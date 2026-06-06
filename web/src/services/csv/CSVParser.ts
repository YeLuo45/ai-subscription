/**
 * CSVParser — RFC 4180 CSV parser/stringifier
 *
 * Inspired by: papaparse, csv-parse
 *
 * Supports:
 *   - quoted fields with embedded commas/newlines
 *   - escaped quotes ("")
 *   - custom delimiter and quote char
 *   - header row
 */

export class CSVParser {
  private delimiter: string;
  private quote: string;
  private newline: string;

  constructor(opts: { delimiter?: string; quote?: string; newline?: string } = {}) {
    this.delimiter = opts.delimiter ?? ',';
    this.quote = opts.quote ?? '"';
    this.newline = opts.newline ?? '\n';
  }

  parse(input: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < input.length) {
      const c = input[i];
      if (inQuotes) {
        if (c === this.quote) {
          if (input[i + 1] === this.quote) {
            field += this.quote;
            i += 2;
          } else {
            inQuotes = false;
            i += 1;
          }
        } else {
          field += c;
          i += 1;
        }
      } else {
        if (c === this.quote && field === '') {
          inQuotes = true;
          i += 1;
        } else if (c === this.delimiter) {
          row.push(field);
          field = '';
          i += 1;
        } else if (c === '\n' || c === '\r') {
          row.push(field);
          field = '';
          rows.push(row);
          row = [];
          if (c === '\r' && input[i + 1] === '\n') i += 1;
          i += 1;
        } else {
          field += c;
          i += 1;
        }
      }
    }
    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  parseWithHeader(input: string): Record<string, string>[] {
    const rows = this.parse(input);
    if (rows.length === 0) return [];
    const [header, ...body] = rows;
    return body.map((row) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < header.length; i++) {
        obj[header[i]] = row[i] ?? '';
      }
      return obj;
    });
  }

  stringify(rows: string[][]): string {
    return rows.map((row) => row.map((f) => this.escapeField(f)).join(this.delimiter)).join(this.newline);
  }

  stringifyWithHeader(header: string[], rows: (string | number | boolean)[][]): string {
    const allRows = [header, ...rows.map((r) => r.map((v) => String(v)))];
    return this.stringify(allRows);
  }

  private escapeField(field: string): string {
    if (field.includes(this.delimiter) || field.includes(this.quote) || field.includes('\n') || field.includes('\r')) {
      return this.quote + field.replace(new RegExp(this.quote, 'g'), this.quote + this.quote) + this.quote;
    }
    return field;
  }
}

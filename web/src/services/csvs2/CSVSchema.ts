/**
 * CSVSchema — CSV schema inference
 *
 * Inspired by: pandas read_csv (dtype inference)
 *
 * Infers column types: int, float, bool, date, string
 */

export type CSVType = 'int' | 'float' | 'bool' | 'date' | 'string';

export interface CSVColumnSchema {
  name: string;
  type: CSVType;
  nullCount: number;
  uniqueCount: number;
  sample?: string;
}

export interface CSVSchema {
  columns: CSVColumnSchema[];
  rowCount: number;
}

export class CSVSchema {
  /**
   * Infer schema from CSV (with header).
   */
  static infer(csv: string, delimiter: string = ','): CSVSchema {
    const lines = csv.trim().split('\n').filter((l) => l.length > 0);
    if (lines.length === 0) return { columns: [], rowCount: 0 };
    const headers = CSVSchema._parseLine(lines[0], delimiter);
    const rows = lines.slice(1).map((l) => CSVSchema._parseLine(l, delimiter));
    const rowCount = rows.length;
    const columns: CSVColumnSchema[] = headers.map((name, i) => {
      const values = rows.map((r) => r[i] ?? '');
      return CSVSchema._inferColumn(name, values);
    });
    return { columns, rowCount };
  }

  private static _inferColumn(name: string, values: string[]): CSVColumnSchema {
    const nonNull = values.filter((v) => v !== '' && v !== 'null' && v !== 'NULL');
    const nullCount = values.length - nonNull.length;
    const unique = new Set(nonNull);
    let type: CSVType = 'string';
    if (nonNull.length > 0) {
      if (nonNull.every((v) => /^-?\d+$/.test(v))) {
        type = 'int';
      } else if (nonNull.every((v) => /^-?\d*\.?\d+([eE][-+]?\d+)?$/.test(v))) {
        type = 'float';
      } else if (nonNull.every((v) => /^(true|false|TRUE|FALSE|True|False)$/.test(v))) {
        type = 'bool';
      } else if (nonNull.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) {
        type = 'date';
      } else {
        type = 'string';
      }
    }
    return {
      name,
      type,
      nullCount,
      uniqueCount: unique.size,
      sample: nonNull[0],
    };
  }

  private static _parseLine(line: string, delimiter: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && !inQuote) { inQuote = true; continue; }
      if (c === '"' && inQuote && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (c === '"' && inQuote) { inQuote = false; continue; }
      if (c === delimiter && !inQuote) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  }

  /**
   * Validate CSV against schema.
   */
  static validate(csv: string, schema: CSVSchema, delimiter: string = ','): string[] {
    const errors: string[] = [];
    const lines = csv.trim().split('\n').filter((l) => l.length > 0);
    if (lines.length === 0) return errors;
    const rows = lines.slice(1).map((l) => CSVSchema._parseLine(l, delimiter));
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < schema.columns.length; c++) {
        const v = rows[r][c] ?? '';
        if (v === '') continue;
        const col = schema.columns[c];
        if (!CSVSchema._matchType(v, col.type)) {
          errors.push(`Row ${r + 1} col "${col.name}": "${v}" is not ${col.type}`);
        }
      }
    }
    return errors;
  }

  private static _matchType(v: string, type: CSVType): boolean {
    if (type === 'int') return /^-?\d+$/.test(v);
    if (type === 'float') return /^-?\d*\.?\d+([eE][-+]?\d+)?$/.test(v);
    if (type === 'bool') return /^(true|false|TRUE|FALSE|True|False)$/.test(v);
    if (type === 'date') return /^\d{4}-\d{2}-\d{2}/.test(v);
    return true;
  }
}

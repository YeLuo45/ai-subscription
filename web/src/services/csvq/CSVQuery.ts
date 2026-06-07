/**
 * CSVQuery — simplified SQL-like CSV query
 *
 * Inspired by: csvq / sqly
 *
 * Supports: select cols, where (=, >, <, !=), order by, limit, count, sum, avg
 */

export interface QueryResult {
  columns: string[];
  rows: Array<Record<string, string | number>>;
  affected: number;
}

export class CSVQuery {
  /**
   * Execute a simple query against CSV.
   */
  static query(csv: string, query: string, delimiter: string = ','): QueryResult {
    const lines = csv.trim().split('\n').filter((l) => l.length > 0);
    if (lines.length === 0) return { columns: [], rows: [], affected: 0 };
    const headers = CSVQuery._parseLine(lines[0], delimiter);
    const rows = lines.slice(1).map((l) => {
      const values = CSVQuery._parseLine(l, delimiter);
      const obj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = values[i] ?? '';
      return obj;
    });

    const q = query.trim();
    if (q.toLowerCase().startsWith('select ')) {
      return CSVQuery._select(q, headers, rows, delimiter);
    }
    if (q.toLowerCase().startsWith('count')) {
      return {
        columns: ['count'],
        rows: [{ count: rows.length }],
        affected: rows.length,
      };
    }
    return { columns: headers, rows, affected: rows.length };
  }

  private static _select(q: string, headers: string[], rows: Array<Record<string, string>>, delimiter: string): QueryResult {
    // Parse: SELECT [cols] FROM csv [WHERE col op val] [ORDER BY col [ASC|DESC]] [LIMIT n]
    const m = q.match(/^SELECT\s+(.+?)\s+FROM\s+\w+(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!m) return { columns: headers, rows, affected: rows.length };
    const [, colsStr, where, orderCol, orderDir, limitStr] = m;
    const cols = colsStr === '*' ? headers : colsStr.split(',').map((c) => c.trim());
    let result = rows;
    if (where) {
      const wm = where.match(/^(\w+)\s*(=|!=|>|<|>=|<=)\s*(.+)$/);
      if (wm) {
        const [, col, op, valRaw] = wm;
        const val = valRaw.replace(/^['"]|['"]$/g, '');
        result = rows.filter((r) => {
          const cell = r[col];
          const cellNum = parseFloat(cell);
          const valNum = parseFloat(val);
          if (op === '=') return cell === val || cell === String(valNum);
          if (op === '!=') return cell !== val && cell !== String(valNum);
          if (op === '>') return cellNum > valNum;
          if (op === '<') return cellNum < valNum;
          if (op === '>=') return cellNum >= valNum;
          if (op === '<=') return cellNum <= valNum;
          return false;
        });
      }
    }
    if (orderCol) {
      const dir = (orderDir ?? 'ASC').toUpperCase();
      result = [...result].sort((a, b) => {
        const av = a[orderCol], bv = b[orderCol];
        const an = parseFloat(av), bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) {
          return dir === 'ASC' ? an - bn : bn - an;
        }
        return dir === 'ASC' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    if (limitStr) {
      const n = parseInt(limitStr, 10);
      result = result.slice(0, n);
    }
    const projected = result.map((r) => {
      const obj: Record<string, string | number> = {};
      for (const c of cols) obj[c] = r[c];
      return obj;
    });
    return { columns: cols, rows: projected, affected: projected.length };
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
   * Sum column.
   */
  static sum(csv: string, col: string, delimiter: string = ','): number {
    const lines = csv.trim().split('\n').slice(1);
    let total = 0;
    for (const line of lines) {
      const values = CSVQuery._parseLine(line, delimiter);
      const headers = CSVQuery._parseLine(csv.trim().split('\n')[0], delimiter);
      const i = headers.indexOf(col);
      if (i >= 0) total += parseFloat(values[i]) || 0;
    }
    return total;
  }

  /**
   * Avg column.
   */
  static avg(csv: string, col: string, delimiter: string = ','): number {
    const lines = csv.trim().split('\n').slice(1);
    const headers = CSVQuery._parseLine(csv.trim().split('\n')[0], delimiter);
    const i = headers.indexOf(col);
    if (i < 0) return 0;
    let total = 0, count = 0;
    for (const line of lines) {
      const values = CSVQuery._parseLine(line, delimiter);
      const n = parseFloat(values[i]);
      if (!isNaN(n)) { total += n; count++; }
    }
    return count > 0 ? total / count : 0;
  }
}

/**
 * SQLBuilder — programmatic SQL query construction
 *
 * Inspired by: knex.js / sql-template-tag
 *
 * Build SELECT/INSERT/UPDATE/DELETE queries with safe parameter binding.
 */

export type ParamValue = string | number | boolean | null | Date;
export type Order = 'ASC' | 'DESC';

export interface WhereClause {
  sql: string;
  params: ParamValue[];
}

export class SQLBuilder {
  private _table: string = '';
  private _select: string[] = ['*'];
  private _wheres: WhereClause[] = [];
  private _joins: string[] = [];
  private _orderBy: string = '';
  private _groupBy: string = '';
  private _limit: number | null = null;
  private _offset: number | null = null;
  private _insertCols: string[] = [];
  private _insertVals: ParamValue[][] = [];
  private _updates: WhereClause = { sql: '', params: [] };
  private _type: 'select' | 'insert' | 'update' | 'delete' = 'select';

  static select(cols: string | string[] = '*'): SQLBuilder {
    const b = new SQLBuilder();
    b._type = 'select';
    b._select = Array.isArray(cols) ? cols : [cols];
    return b;
  }

  static insertInto(table: string): SQLBuilder {
    const b = new SQLBuilder();
    b._type = 'insert';
    b._table = table;
    return b;
  }

  static update(table: string): SQLBuilder {
    const b = new SQLBuilder();
    b._type = 'update';
    b._table = table;
    return b;
  }

  static deleteFrom(table: string): SQLBuilder {
    const b = new SQLBuilder();
    b._type = 'delete';
    b._table = table;
    return b;
  }

  from(table: string): this {
    this._table = table;
    return this;
  }

  where(col: string, op: string, val: ParamValue): this {
    this._wheres.push({ sql: `${col} ${op} ?`, params: [val] });
    return this;
  }

  whereEq(col: string, val: ParamValue): this { return this.where(col, '=', val); }
  whereGt(col: string, val: ParamValue): this { return this.where(col, '>', val); }
  whereLt(col: string, val: ParamValue): this { return this.where(col, '<', val); }
  whereIn(col: string, vals: ParamValue[]): this {
    if (vals.length === 0) {
      this._wheres.push({ sql: '0 = 1', params: [] });
    } else {
      const placeholders = vals.map(() => '?').join(',');
      this._wheres.push({ sql: `${col} IN (${placeholders})`, params: vals });
    }
    return this;
  }

  join(table: string, on: string): this {
    this._joins.push(`JOIN ${table} ON ${on}`);
    return this;
  }

  leftJoin(table: string, on: string): this {
    this._joins.push(`LEFT JOIN ${table} ON ${on}`);
    return this;
  }

  orderBy(col: string, dir: Order = 'ASC'): this {
    this._orderBy = `ORDER BY ${col} ${dir}`;
    return this;
  }

  groupBy(col: string): this {
    this._groupBy = `GROUP BY ${col}`;
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  values(data: Record<string, ParamValue>): this {
    const cols = Object.keys(data);
    const vals = cols.map((k) => data[k]);
    this._insertCols = cols;
    this._insertVals.push(vals);
    return this;
  }

  set(data: Record<string, ParamValue>): this {
    const sets: string[] = [];
    const params: ParamValue[] = [];
    for (const [k, v] of Object.entries(data)) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
    this._updates = { sql: sets.join(', '), params };
    return this;
  }

  toSQL(): { sql: string; params: ParamValue[] } {
    switch (this._type) {
      case 'select': return this.buildSelect();
      case 'insert': return this.buildInsert();
      case 'update': return this.buildUpdate();
      case 'delete': return this.buildDelete();
    }
  }

  private buildSelect(): { sql: string; params: ParamValue[] } {
    const params: ParamValue[] = [];
    let sql = `SELECT ${this._select.join(', ')} FROM ${this._table}`;
    if (this._joins.length > 0) sql += ' ' + this._joins.join(' ');
    if (this._wheres.length > 0) {
      sql += ' WHERE ' + this._wheres.map((w) => {
        params.push(...w.params);
        return w.sql;
      }).join(' AND ');
    }
    if (this._groupBy) sql += ' ' + this._groupBy;
    if (this._orderBy) sql += ' ' + this._orderBy;
    if (this._limit !== null) sql += ` LIMIT ${this._limit}`;
    if (this._offset !== null) sql += ` OFFSET ${this._offset}`;
    return { sql, params };
  }

  private buildInsert(): { sql: string; params: ParamValue[] } {
    const allParams: ParamValue[] = [];
    const valueRows = this._insertVals.map((row) => {
      allParams.push(...row);
      return '(' + row.map(() => '?').join(',') + ')';
    });
    const sql = `INSERT INTO ${this._table} (${this._insertCols.join(', ')}) VALUES ${valueRows.join(', ')}`;
    return { sql, params: allParams };
  }

  private buildUpdate(): { sql: string; params: ParamValue[] } {
    const params = [...this._updates.params];
    let sql = `UPDATE ${this._table} SET ${this._updates.sql}`;
    if (this._wheres.length > 0) {
      sql += ' WHERE ' + this._wheres.map((w) => {
        params.push(...w.params);
        return w.sql;
      }).join(' AND ');
    }
    return { sql, params };
  }

  private buildDelete(): { sql: string; params: ParamValue[] } {
    const params: ParamValue[] = [];
    let sql = `DELETE FROM ${this._table}`;
    if (this._wheres.length > 0) {
      sql += ' WHERE ' + this._wheres.map((w) => {
        params.push(...w.params);
        return w.sql;
      }).join(' AND ');
    }
    return { sql, params };
  }
}

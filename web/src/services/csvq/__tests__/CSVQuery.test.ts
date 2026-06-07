/**
 * CSVQuery.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CSVQuery } from '../CSVQuery';

const CSV = 'name,age,city\nAlice,30,NYC\nBob,25,LA\nCharlie,35,NYC\nDave,40,LA';

describe('CSVQuery — select', () => {
  it('select all', () => {
    const r = CSVQuery.query(CSV, 'SELECT * FROM csv');
    expect(r.rows.length).toBe(4);
  });

  it('select specific cols', () => {
    const r = CSVQuery.query(CSV, 'SELECT name,age FROM csv');
    expect(r.columns).toEqual(['name', 'age']);
    expect(r.rows[0].name).toBe('Alice');
  });

  it('where equals', () => {
    const r = CSVQuery.query(CSV, 'SELECT * FROM csv WHERE city = NYC');
    expect(r.rows.length).toBe(2);
  });

  it('where greater than', () => {
    const r = CSVQuery.query(CSV, 'SELECT * FROM csv WHERE age > 30');
    expect(r.rows.length).toBe(2);
  });

  it('where less than', () => {
    const r = CSVQuery.query(CSV, 'SELECT * FROM csv WHERE age < 30');
    expect(r.rows.length).toBe(1);
  });

  it('order by asc', () => {
    const r = CSVQuery.query(CSV, 'SELECT * FROM csv ORDER BY age ASC');
    expect(r.rows[0].name).toBe('Bob');
  });

  it('order by desc', () => {
    const r = CSVQuery.query(CSV, 'SELECT * FROM csv ORDER BY age DESC');
    expect(r.rows[0].name).toBe('Dave');
  });

  it('limit', () => {
    const r = CSVQuery.query(CSV, 'SELECT * FROM csv LIMIT 2');
    expect(r.rows.length).toBe(2);
  });
});

describe('CSVQuery — aggregate', () => {
  it('count', () => {
    const r = CSVQuery.query(CSV, 'COUNT');
    expect(r.rows[0].count).toBe(4);
  });

  it('sum', () => {
    expect(CSVQuery.sum(CSV, 'age')).toBe(130);
  });

  it('avg', () => {
    expect(CSVQuery.avg(CSV, 'age')).toBe(32.5);
  });
});

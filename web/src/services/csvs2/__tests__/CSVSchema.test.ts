/**
 * CSVSchema.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CSVSchema } from '../CSVSchema';

describe('CSVSchema — infer', () => {
  it('int column', () => {
    const csv = 'a,b\n1,2\n3,4\n5,6';
    const s = CSVSchema.infer(csv);
    expect(s.columns[0].type).toBe('int');
    expect(s.columns[1].type).toBe('int');
  });

  it('float column', () => {
    const csv = 'x\n1.5\n2.3\n3.14';
    const s = CSVSchema.infer(csv);
    expect(s.columns[0].type).toBe('float');
  });

  it('bool column', () => {
    const csv = 'b\ntrue\nfalse\ntrue';
    const s = CSVSchema.infer(csv);
    expect(s.columns[0].type).toBe('bool');
  });

  it('string column', () => {
    const csv = 'name\nAlice\nBob\nCharlie';
    const s = CSVSchema.infer(csv);
    expect(s.columns[0].type).toBe('string');
  });

  it('date column', () => {
    const csv = 'd\n2023-01-01\n2023-01-02\n2023-01-03';
    const s = CSVSchema.infer(csv);
    expect(s.columns[0].type).toBe('date');
  });

  it('mixed', () => {
    const csv = 'id,name,age,active\n1,Alice,30,true\n2,Bob,25,false';
    const s = CSVSchema.infer(csv);
    expect(s.columns.length).toBe(4);
  });

  it('rowCount', () => {
    const csv = 'a\n1\n2\n3';
    const s = CSVSchema.infer(csv);
    expect(s.rowCount).toBe(3);
  });

  it('null count', () => {
    const csv = 'a\n1\n2\n3';
    const s = CSVSchema.infer(csv);
    expect(s.columns[0].nullCount).toBe(0);
  });

  it('unique count', () => {
    const csv = 'a\n1\n1\n2\n2\n3';
    const s = CSVSchema.infer(csv);
    expect(s.columns[0].uniqueCount).toBe(3);
  });
});

describe('CSVSchema — validate', () => {
  it('valid', () => {
    const csv = 'a\n1\n2\n3';
    const schema = CSVSchema.infer(csv);
    expect(CSVSchema.validate(csv, schema)).toEqual([]);
  });

  it('invalid int', () => {
    const csv = 'a\n1\nfoo\n3';
    const schema = CSVSchema.infer('a\n1\n2\n3');
    const errs = CSVSchema.validate(csv, schema);
    expect(errs.length).toBeGreaterThan(0);
  });
});

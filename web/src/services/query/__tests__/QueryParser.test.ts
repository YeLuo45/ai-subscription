/**
 * QueryParser.test.ts — Pure unit tests for SQL-like query parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QueryParser } from '../QueryParser';

describe('QueryParser — equality and inequality', () => {
  let p: QueryParser;
  beforeEach(() => { p = new QueryParser(); });

  it('parses equality', () => {
    const r = p.parse('name = "Alice"');
    expect(r.type).toBe('eq');
    expect(r.field).toBe('name');
    expect(r.value).toBe('Alice');
  });

  it('parses double-equals', () => {
    const r = p.parse('age == 30');
    expect(r.type).toBe('eq');
  });

  it('parses not-equals', () => {
    const r = p.parse('name != "Bob"');
    expect(r.type).toBe('ne');
  });

  it('parses number values', () => {
    const r = p.parse('age = 30');
    expect(r.value).toBe(30);
  });

  it('parses boolean values', () => {
    const r = p.parse('active = true');
    expect(r.value).toBe(true);
  });

  it('parses null values', () => {
    const r = p.parse('deleted = null');
    expect(r.value).toBe(null);
  });
});

describe('QueryParser — comparison', () => {
  let p: QueryParser;
  beforeEach(() => { p = new QueryParser(); });

  it('parses greater than', () => {
    const r = p.parse('age > 18');
    expect(r.type).toBe('gt');
  });

  it('parses greater equal', () => {
    const r = p.parse('age >= 18');
    expect(r.type).toBe('gte');
  });

  it('parses less than', () => {
    const r = p.parse('age < 65');
    expect(r.type).toBe('lt');
  });

  it('parses less equal', () => {
    const r = p.parse('age <= 65');
    expect(r.type).toBe('lte');
  });
});

describe('QueryParser — IN, NOT IN, LIKE', () => {
  let p: QueryParser;
  beforeEach(() => { p = new QueryParser(); });

  it('parses IN', () => {
    const r = p.parse('role IN ("admin", "user")');
    expect(r.type).toBe('in');
    expect((r.value as string[]).length).toBe(2);
  });

  it('parses NOT IN', () => {
    const r = p.parse('role NOT IN ("banned")');
    expect(r.type).toBe('nin');
  });

  it('parses LIKE', () => {
    const r = p.parse('name LIKE "Al%"');
    expect(r.type).toBe('like');
  });
});

describe('QueryParser — boolean logic', () => {
  let p: QueryParser;
  beforeEach(() => { p = new QueryParser(); });

  it('parses AND', () => {
    const r = p.parse('a = 1 AND b = 2');
    expect(r.type).toBe('and');
    expect(r.children?.length).toBe(2);
  });

  it('parses OR', () => {
    const r = p.parse('a = 1 OR b = 2');
    expect(r.type).toBe('or');
  });

  it('parses NOT', () => {
    const r = p.parse('NOT a = 1');
    expect(r.type).toBe('not');
  });

  it('parses parenthesized expression', () => {
    const r = p.parse('(a = 1 OR b = 2) AND c = 3');
    expect(r.type).toBe('and');
  });
});

describe('QueryParser — evaluation', () => {
  let p: QueryParser;
  beforeEach(() => { p = new QueryParser(); });

  it('evaluates equality match', () => {
    expect(p.evaluate(p.parse('age = 30'), { age: 30 })).toBe(true);
    expect(p.evaluate(p.parse('age = 30'), { age: 25 })).toBe(false);
  });

  it('evaluates comparison', () => {
    expect(p.evaluate(p.parse('age >= 18'), { age: 20 })).toBe(true);
    expect(p.evaluate(p.parse('age < 18'), { age: 20 })).toBe(false);
  });

  it('evaluates IN', () => {
    expect(p.evaluate(p.parse('role IN ("admin", "user")'), { role: 'admin' })).toBe(true);
    expect(p.evaluate(p.parse('role IN ("admin", "user")'), { role: 'guest' })).toBe(false);
  });

  it('evaluates LIKE prefix match', () => {
    expect(p.evaluate(p.parse('name LIKE "Al%"'), { name: 'Alice' })).toBe(true);
    expect(p.evaluate(p.parse('name LIKE "Al%"'), { name: 'Bob' })).toBe(false);
  });

  it('evaluates AND', () => {
    expect(p.evaluate(p.parse('a = 1 AND b = 2'), { a: 1, b: 2 })).toBe(true);
    expect(p.evaluate(p.parse('a = 1 AND b = 2'), { a: 1, b: 3 })).toBe(false);
  });

  it('evaluates OR', () => {
    expect(p.evaluate(p.parse('a = 1 OR b = 2'), { a: 1, b: 99 })).toBe(true);
    expect(p.evaluate(p.parse('a = 1 OR b = 2'), { a: 99, b: 2 })).toBe(true);
  });

  it('evaluates NOT', () => {
    expect(p.evaluate(p.parse('NOT a = 1'), { a: 2 })).toBe(true);
    expect(p.evaluate(p.parse('NOT a = 1'), { a: 1 })).toBe(false);
  });
});

describe('QueryParser — filter', () => {
  let p: QueryParser;
  beforeEach(() => { p = new QueryParser(); });

  it('filters collection by string', () => {
    const rows = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Alex' }];
    const r = p.filter(rows, 'name LIKE "Al%"');
    expect(r.length).toBe(2);
  });

  it('filters collection by AND', () => {
    const rows = [
      { age: 30, active: true },
      { age: 30, active: false },
      { age: 25, active: true },
    ];
    const r = p.filter(rows, 'age >= 30 AND active = true');
    expect(r.length).toBe(1);
  });

  it('filters collection by OR', () => {
    const rows = [
      { role: 'admin' },
      { role: 'user' },
      { role: 'guest' },
    ];
    const r = p.filter(rows, 'role = "admin" OR role = "user"');
    expect(r.length).toBe(2);
  });
});

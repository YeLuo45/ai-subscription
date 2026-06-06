/**
 * SQLBuilder.test.ts — Pure unit tests for SQL builder
 */

import { describe, it, expect } from 'vitest';
import { SQLBuilder } from '../SQLBuilder';

describe('SQLBuilder — select', () => {
  it('basic select', () => {
    const r = SQLBuilder.select().from('users').toSQL();
    expect(r.sql).toBe('SELECT * FROM users');
  });

  it('select specific columns', () => {
    const r = SQLBuilder.select(['id', 'name']).from('users').toSQL();
    expect(r.sql).toBe('SELECT id, name FROM users');
  });

  it('where eq', () => {
    const r = SQLBuilder.select().from('users').whereEq('id', 5).toSQL();
    expect(r.sql).toBe('SELECT * FROM users WHERE id = ?');
    expect(r.params).toEqual([5]);
  });

  it('multiple where', () => {
    const r = SQLBuilder.select().from('users').whereEq('a', 1).whereGt('b', 2).toSQL();
    expect(r.sql).toContain('WHERE a = ? AND b > ?');
    expect(r.params).toEqual([1, 2]);
  });

  it('whereIn', () => {
    const r = SQLBuilder.select().from('users').whereIn('id', [1, 2, 3]).toSQL();
    expect(r.sql).toContain('IN (?,?,?)');
    expect(r.params).toEqual([1, 2, 3]);
  });

  it('orderBy and limit', () => {
    const r = SQLBuilder.select().from('users').orderBy('name').limit(10).toSQL();
    expect(r.sql).toBe('SELECT * FROM users ORDER BY name ASC LIMIT 10');
  });

  it('offset', () => {
    const r = SQLBuilder.select().from('users').limit(10).offset(20).toSQL();
    expect(r.sql).toContain('LIMIT 10 OFFSET 20');
  });

  it('join', () => {
    const r = SQLBuilder.select().from('users').join('orders', 'users.id = orders.user_id').toSQL();
    expect(r.sql).toContain('JOIN orders ON');
  });
});

describe('SQLBuilder — insert', () => {
  it('basic insert', () => {
    const r = SQLBuilder.insertInto('users')
      .values({ name: 'Alice', age: 30 })
      .toSQL();
    expect(r.sql).toBe('INSERT INTO users (name, age) VALUES (?,?)');
    expect(r.params).toEqual(['Alice', 30]);
  });
});

describe('SQLBuilder — update', () => {
  it('basic update', () => {
    const r = SQLBuilder.update('users')
      .set({ name: 'Bob' })
      .whereEq('id', 5)
      .toSQL();
    expect(r.sql).toBe('UPDATE users SET name = ? WHERE id = ?');
    expect(r.params).toEqual(['Bob', 5]);
  });
});

describe('SQLBuilder — delete', () => {
  it('basic delete', () => {
    const r = SQLBuilder.deleteFrom('users').whereEq('id', 5).toSQL();
    expect(r.sql).toBe('DELETE FROM users WHERE id = ?');
    expect(r.params).toEqual([5]);
  });

  it('delete all', () => {
    const r = SQLBuilder.deleteFrom('users').toSQL();
    expect(r.sql).toBe('DELETE FROM users');
  });
});

describe('SQLBuilder — leftJoin + groupBy', () => {
  it('leftJoin', () => {
    const r = SQLBuilder.select().from('users').leftJoin('orders', 'users.id = orders.user_id').toSQL();
    expect(r.sql).toContain('LEFT JOIN orders');
  });

  it('groupBy', () => {
    const r = SQLBuilder.select(['dept', 'COUNT(*)']).from('users').groupBy('dept').toSQL();
    expect(r.sql).toContain('GROUP BY dept');
  });
});

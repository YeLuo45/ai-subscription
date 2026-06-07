/**
 * JSONPath.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JSONPath } from '../JSONPath';

describe('JSONPath — basic', () => {
  it('root', () => {
    expect(JSONPath.query({ a: 1 }, '$')).toEqual([{ a: 1 }]);
  });

  it('property', () => {
    expect(JSONPath.query({ a: 1 }, '$.a')).toEqual([1]);
  });

  it('nested', () => {
    expect(JSONPath.query({ a: { b: 2 } }, '$.a.b')).toEqual([2]);
  });

  it('array index', () => {
    expect(JSONPath.query([10, 20, 30], '$[1]')).toEqual([20]);
  });

  it('wildcard', () => {
    expect(JSONPath.query({ a: 1, b: 2 }, '$.*')).toEqual([1, 2]);
  });

  it('array wildcard', () => {
    expect(JSONPath.query([1, 2, 3], '$[*]')).toEqual([1, 2, 3]);
  });
});

describe('JSONPath — recursive', () => {
  it('descend', () => {
    const data = { a: { b: { c: 1 } } };
    const r = JSONPath.query(data, '$..c');
    expect(r).toEqual([1]);
  });

  it('descend with key', () => {
    const data = { a: { x: 1 }, b: { x: 2 }, c: { y: 3 } };
    const r = JSONPath.query(data, '$..x');
    expect(r.sort()).toEqual([1, 2]);
  });
});

describe('JSONPath — slices', () => {
  it('slice', () => {
    expect(JSONPath.query([1, 2, 3, 4, 5], '$[1:3]')).toEqual([2, 3]);
  });

  it('multi-index', () => {
    expect(JSONPath.query([1, 2, 3, 4], '$[0,2]')).toEqual([1, 3]);
  });
});

describe('JSONPath — paths', () => {
  it('queryPaths', () => {
    const data = { a: 1, b: { c: 2 } };
    const r = JSONPath.queryPaths(data, '$.b.c');
    expect(r.length).toBe(1);
    expect(r[0].value).toBe(2);
  });
});

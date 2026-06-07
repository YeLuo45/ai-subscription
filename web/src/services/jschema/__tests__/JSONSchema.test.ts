/**
 * JSONSchema.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JSONSchema } from '../JSONSchema';

describe('JSONSchema — type', () => {
  it('string', () => {
    expect(JSONSchema.isValid('hi', { type: 'string' })).toBe(true);
  });

  it('number', () => {
    expect(JSONSchema.isValid(42, { type: 'number' })).toBe(true);
  });

  it('integer', () => {
    expect(JSONSchema.isValid(42, { type: 'integer' })).toBe(true);
    expect(JSONSchema.isValid(3.14, { type: 'integer' })).toBe(false);
  });

  it('boolean', () => {
    expect(JSONSchema.isValid(true, { type: 'boolean' })).toBe(true);
  });

  it('null', () => {
    expect(JSONSchema.isValid(null, { type: 'null' })).toBe(true);
  });

  it('array', () => {
    expect(JSONSchema.isValid([], { type: 'array' })).toBe(true);
  });

  it('object', () => {
    expect(JSONSchema.isValid({}, { type: 'object' })).toBe(true);
  });

  it('multi-type', () => {
    expect(JSONSchema.isValid(42, { type: ['string', 'number'] })).toBe(true);
  });

  it('type mismatch', () => {
    expect(JSONSchema.isValid(42, { type: 'string' })).toBe(false);
  });
});

describe('JSONSchema — string', () => {
  it('minLength', () => {
    expect(JSONSchema.isValid('hi', { type: 'string', minLength: 3 })).toBe(false);
  });

  it('maxLength', () => {
    expect(JSONSchema.isValid('hello', { type: 'string', maxLength: 3 })).toBe(false);
  });

  it('pattern', () => {
    expect(JSONSchema.isValid('abc', { type: 'string', pattern: '^[a-z]+$' })).toBe(true);
    expect(JSONSchema.isValid('ABC', { type: 'string', pattern: '^[a-z]+$' })).toBe(false);
  });
});

describe('JSONSchema — number', () => {
  it('minimum', () => {
    expect(JSONSchema.isValid(10, { type: 'number', minimum: 5 })).toBe(true);
  });

  it('maximum', () => {
    expect(JSONSchema.isValid(10, { type: 'number', maximum: 5 })).toBe(false);
  });
});

describe('JSONSchema — array', () => {
  it('minItems', () => {
    expect(JSONSchema.isValid([1], { type: 'array', minItems: 2 })).toBe(false);
  });

  it('items', () => {
    const r = JSONSchema.validate([1, 'x'], { type: 'array', items: { type: 'number' } });
    expect(r.length).toBe(1);
  });
});

describe('JSONSchema — object', () => {
  it('required', () => {
    const r = JSONSchema.validate({}, { type: 'object', required: ['a'] });
    expect(r.length).toBe(1);
  });

  it('properties', () => {
    const r = JSONSchema.validate({ a: 'hi' }, { type: 'object', properties: { a: { type: 'string' } } });
    expect(r.length).toBe(0);
  });

  it('nested', () => {
    const r = JSONSchema.validate(
      { a: { b: 'hi' } },
      { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'number' } } } } },
    );
    expect(r.length).toBe(1);
  });
});

describe('JSONSchema — enum', () => {
  it('match', () => {
    expect(JSONSchema.isValid('a', { enum: ['a', 'b', 'c'] })).toBe(true);
  });

  it('no match', () => {
    expect(JSONSchema.isValid('d', { enum: ['a', 'b', 'c'] })).toBe(false);
  });
});

describe('JSONSchema — errors', () => {
  it('returns errors', () => {
    const r = JSONSchema.validate(42, { type: 'string' });
    expect(r.length).toBe(1);
    expect(r[0].message).toContain('string');
  });
});

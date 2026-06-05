/**
 * SchemaValidator.test.ts — Pure unit tests for JSON Schema validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaValidator } from '../SchemaValidator';

describe('SchemaValidator — type checking', () => {
  let v: SchemaValidator;
  beforeEach(() => { v = new SchemaValidator(); });

  it('validates string', () => {
    expect(v.validate('hello', { type: 'string' }).valid).toBe(true);
  });

  it('rejects wrong type', () => {
    const r = v.validate(42, { type: 'string' });
    expect(r.valid).toBe(false);
    expect(r.errors[0].keyword).toBe('type');
  });

  it('validates number', () => {
    expect(v.validate(42, { type: 'number' }).valid).toBe(true);
  });

  it('validates integer', () => {
    expect(v.validate(42, { type: 'integer' }).valid).toBe(true);
    expect(v.validate(42.5, { type: 'integer' }).valid).toBe(false);
  });

  it('validates boolean', () => {
    expect(v.validate(true, { type: 'boolean' }).valid).toBe(true);
  });

  it('validates array', () => {
    expect(v.validate([1, 2], { type: 'array' }).valid).toBe(true);
  });

  it('validates object', () => {
    expect(v.validate({}, { type: 'object' }).valid).toBe(true);
  });

  it('validates null', () => {
    expect(v.validate(null, { type: 'null' }).valid).toBe(true);
  });

  it('nullable allows null', () => {
    expect(v.validate(null, { type: 'string', nullable: true }).valid).toBe(true);
  });

  it('accepts union types', () => {
    expect(v.validate('a', { type: ['string', 'number'] }).valid).toBe(true);
    expect(v.validate(5, { type: ['string', 'number'] }).valid).toBe(true);
    expect(v.validate(true, { type: ['string', 'number'] }).valid).toBe(false);
  });
});

describe('SchemaValidator — string constraints', () => {
  let v: SchemaValidator;
  beforeEach(() => { v = new SchemaValidator(); });

  it('minLength', () => {
    expect(v.validate('a', { type: 'string', minLength: 2 }).valid).toBe(false);
    expect(v.validate('ab', { type: 'string', minLength: 2 }).valid).toBe(true);
  });

  it('maxLength', () => {
    expect(v.validate('abc', { type: 'string', maxLength: 2 }).valid).toBe(false);
    expect(v.validate('ab', { type: 'string', maxLength: 2 }).valid).toBe(true);
  });

  it('pattern', () => {
    expect(v.validate('123', { type: 'string', pattern: '^\\d+$' }).valid).toBe(true);
    expect(v.validate('abc', { type: 'string', pattern: '^\\d+$' }).valid).toBe(false);
  });
});

describe('SchemaValidator — number constraints', () => {
  let v: SchemaValidator;
  beforeEach(() => { v = new SchemaValidator(); });

  it('minimum', () => {
    expect(v.validate(5, { type: 'number', minimum: 10 }).valid).toBe(false);
    expect(v.validate(10, { type: 'number', minimum: 10 }).valid).toBe(true);
  });

  it('maximum', () => {
    expect(v.validate(15, { type: 'number', maximum: 10 }).valid).toBe(false);
  });

  it('exclusiveMinimum', () => {
    expect(v.validate(10, { type: 'number', exclusiveMinimum: 10 }).valid).toBe(false);
    expect(v.validate(11, { type: 'number', exclusiveMinimum: 10 }).valid).toBe(true);
  });

  it('exclusiveMaximum', () => {
    expect(v.validate(10, { type: 'number', exclusiveMaximum: 10 }).valid).toBe(false);
    expect(v.validate(9, { type: 'number', exclusiveMaximum: 10 }).valid).toBe(true);
  });
});

describe('SchemaValidator — array constraints', () => {
  let v: SchemaValidator;
  beforeEach(() => { v = new SchemaValidator(); });

  it('minItems', () => {
    expect(v.validate([1], { type: 'array', minItems: 2 }).valid).toBe(false);
  });

  it('maxItems', () => {
    expect(v.validate([1, 2, 3], { type: 'array', maxItems: 2 }).valid).toBe(false);
  });

  it('uniqueItems catches duplicates', () => {
    expect(v.validate([1, 1], { type: 'array', uniqueItems: true }).valid).toBe(false);
    expect(v.validate([1, 2], { type: 'array', uniqueItems: true }).valid).toBe(true);
  });

  it('items validates each element', () => {
    const r = v.validate([1, 'a', 3], { type: 'array', items: { type: 'number' } });
    expect(r.valid).toBe(false);
  });
});

describe('SchemaValidator — object constraints', () => {
  let v: SchemaValidator;
  beforeEach(() => { v = new SchemaValidator(); });

  it('required field', () => {
    const r = v.validate({}, { type: 'object', required: ['name'] });
    expect(r.valid).toBe(false);
  });

  it('properties validation', () => {
    const r = v.validate({ age: 'old' }, { type: 'object', properties: { age: { type: 'number' } } });
    expect(r.valid).toBe(false);
  });

  it('passes valid object', () => {
    const r = v.validate({ name: 'Alice', age: 30 }, {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
    });
    expect(r.valid).toBe(true);
  });
});

describe('SchemaValidator — enum and const', () => {
  let v: SchemaValidator;
  beforeEach(() => { v = new SchemaValidator(); });

  it('enum validates', () => {
    expect(v.validate('a', { enum: ['a', 'b'] }).valid).toBe(true);
    expect(v.validate('c', { enum: ['a', 'b'] }).valid).toBe(false);
  });

  it('const validates', () => {
    expect(v.validate('exact', { const: 'exact' }).valid).toBe(true);
    expect(v.validate('other', { const: 'exact' }).valid).toBe(false);
  });
});

describe('SchemaValidator — composition', () => {
  let v: SchemaValidator;
  beforeEach(() => { v = new SchemaValidator(); });

  it('anyOf passes if any matches', () => {
    const r = v.validate('hi', { anyOf: [{ type: 'string' }, { type: 'number' }] });
    expect(r.valid).toBe(true);
  });

  it('allOf requires all to match', () => {
    const r = v.validate(5, { allOf: [{ type: 'number' }, { minimum: 0 }] });
    expect(r.valid).toBe(true);
    const r2 = v.validate(-1, { allOf: [{ type: 'number' }, { minimum: 0 }] });
    expect(r2.valid).toBe(false);
  });

  it('oneOf requires exactly one match', () => {
    const r = v.validate(5, { oneOf: [{ type: 'number' }, { minimum: 10 }] });
    // matches number only
    expect(r.valid).toBe(true);
  });
});

describe('SchemaValidator — $ref', () => {
  it('resolves $ref', () => {
    const v = new SchemaValidator();
    v.define('PositiveInt', { type: 'integer', minimum: 0 });
    const r = v.validate(5, { $ref: 'PositiveInt' });
    expect(r.valid).toBe(true);
    const r2 = v.validate(-1, { $ref: 'PositiveInt' });
    expect(r2.valid).toBe(false);
  });

  it('reports unresolved $ref', () => {
    const v = new SchemaValidator();
    const r = v.validate(5, { $ref: 'Missing' });
    expect(r.valid).toBe(false);
    expect(r.errors[0].message).toContain('unresolved');
  });
});

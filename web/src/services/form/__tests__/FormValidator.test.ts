/**
 * FormValidator.test.ts — Pure unit tests for form validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormValidator } from '../FormValidator';

describe('FormValidator — required and length', () => {
  let v: FormValidator;
  beforeEach(() => { v = new FormValidator(); });

  it('passes valid values', () => {
    const r = v.validate({ name: 'Alice' }, { name: { required: true, minLength: 1 } });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('fails on required empty', () => {
    const r = v.validate({ name: '' }, { name: { required: true } });
    expect(r.valid).toBe(false);
    expect(r.errors[0].rule).toBe('required');
  });

  it('fails on required null', () => {
    const r = v.validate({ name: null }, { name: { required: true } });
    expect(r.valid).toBe(false);
  });

  it('fails on minLength', () => {
    const r = v.validate({ name: 'a' }, { name: { minLength: 3 } });
    expect(r.errors[0].rule).toBe('minLength');
  });

  it('fails on maxLength', () => {
    const r = v.validate({ name: 'abcdef' }, { name: { maxLength: 3 } });
    expect(r.errors[0].rule).toBe('maxLength');
  });

  it('empty value skips length rules when not required', () => {
    const r = v.validate({ name: '' }, { name: { minLength: 3 } });
    expect(r.valid).toBe(true);
  });
});

describe('FormValidator — numeric', () => {
  let v: FormValidator;
  beforeEach(() => { v = new FormValidator(); });

  it('fails on min', () => {
    const r = v.validate({ age: 5 }, { age: { min: 18 } });
    expect(r.errors[0].rule).toBe('min');
  });

  it('fails on max', () => {
    const r = v.validate({ age: 100 }, { age: { max: 65 } });
    expect(r.errors[0].rule).toBe('max');
  });

  it('passes valid number', () => {
    const r = v.validate({ age: 30 }, { age: { min: 0, max: 120 } });
    expect(r.valid).toBe(true);
  });
});

describe('FormValidator — pattern and formats', () => {
  let v: FormValidator;
  beforeEach(() => { v = new FormValidator(); });

  it('fails on pattern mismatch', () => {
    const r = v.validate({ code: 'abc' }, { code: { pattern: /^\d+$/ } });
    expect(r.errors[0].rule).toBe('pattern');
  });

  it('passes pattern match', () => {
    const r = v.validate({ code: '123' }, { code: { pattern: /^\d+$/ } });
    expect(r.valid).toBe(true);
  });

  it('validates email', () => {
    const r = v.validate({ email: 'bad' }, { email: { email: true } });
    expect(r.errors[0].rule).toBe('email');
  });

  it('accepts valid email', () => {
    const r = v.validate({ email: 'a@b.com' }, { email: { email: true } });
    expect(r.valid).toBe(true);
  });

  it('validates URL', () => {
    const r = v.validate({ url: 'not-a-url' }, { url: { url: true } });
    expect(r.errors[0].rule).toBe('url');
  });

  it('accepts valid URL', () => {
    const r = v.validate({ url: 'https://example.com' }, { url: { url: true } });
    expect(r.valid).toBe(true);
  });

  it('validates UUID', () => {
    const r = v.validate({ id: 'bad' }, { id: { uuid: true } });
    expect(r.errors[0].rule).toBe('uuid');
  });

  it('accepts valid UUID', () => {
    const r = v.validate({ id: '550e8400-e29b-41d4-a716-446655440000' }, { id: { uuid: true } });
    expect(r.valid).toBe(true);
  });
});

describe('FormValidator — oneOf and matches', () => {
  let v: FormValidator;
  beforeEach(() => { v = new FormValidator(); });

  it('fails when value not in oneOf', () => {
    const r = v.validate({ role: 'guest' }, { role: { oneOf: ['admin', 'user'] } });
    expect(r.errors[0].rule).toBe('oneOf');
  });

  it('passes when value in oneOf', () => {
    const r = v.validate({ role: 'admin' }, { role: { oneOf: ['admin', 'user'] } });
    expect(r.valid).toBe(true);
  });

  it('matches another field', () => {
    const r = v.validate({ password: 'a', confirm: 'b' }, { confirm: { matches: 'password' } });
    expect(r.errors[0].rule).toBe('matches');
  });

  it('passes matches when equal', () => {
    const r = v.validate({ password: 'a', confirm: 'a' }, { confirm: { matches: 'password' } });
    expect(r.valid).toBe(true);
  });
});

describe('FormValidator — custom', () => {
  let v: FormValidator;
  beforeEach(() => { v = new FormValidator(); });

  it('runs custom validator', () => {
    const r = v.validate({ name: 'a' }, { name: { custom: (v) => (v as string).length < 3 ? 'too short' : null } });
    expect(r.errors[0].message).toBe('too short');
  });

  it('passes when custom returns null', () => {
    const r = v.validate({ name: 'abc' }, { name: { custom: (v) => (v as string).length < 3 ? 'too short' : null } });
    expect(r.valid).toBe(true);
  });
});

describe('FormValidator — multi-field and labels', () => {
  let v: FormValidator;
  beforeEach(() => { v = new FormValidator(); });

  it('validates multiple fields', () => {
    const r = v.validate({ name: '', age: 5 }, { name: { required: true }, age: { min: 18 } });
    expect(r.errors.length).toBe(2);
  });

  it('uses custom label in error', () => {
    const r = v.validate({ email: '' }, { email: { required: true, label: 'Email Address' } });
    expect(r.errors[0].message).toContain('Email Address');
  });

  it('errorMap maps first error per field', () => {
    const r = v.validate({ name: 'a' }, { name: { minLength: 3, maxLength: 1 } });
    expect(r.errorMap.name).toBeDefined();
  });

  it('isFieldValid returns true for valid', () => {
    const ok = v.isFieldValid('name', 'Alice', { minLength: 1 });
    expect(ok).toBe(true);
  });

  it('isFieldValid returns false for invalid', () => {
    const ok = v.isFieldValid('name', '', { required: true });
    expect(ok).toBe(false);
  });
});

/**
 * URLSlug.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { URLSlug } from '../URLSlug';

describe('URLSlug — generate', () => {
  it('basic', () => {
    expect(URLSlug.generate('Hello World')).toBe('hello-world');
  });

  it('multiple spaces', () => {
    expect(URLSlug.generate('Hello   World')).toBe('hello-world');
  });

  it('special chars', () => {
    expect(URLSlug.generate('Hello, World!')).toBe('hello-world');
  });

  it('underscore', () => {
    expect(URLSlug.generate('hello_world')).toBe('helloworld');
  });

  it('trim dashes', () => {
    expect(URLSlug.generate('--hello--')).toBe('hello');
  });

  it('keep upper', () => {
    expect(URLSlug.generate('Hello World', { lower: false })).toBe('Hello-World');
  });

  it('custom separator', () => {
    expect(URLSlug.generate('Hello World', { separator: '_' })).toBe('hello_world');
  });

  it('max length', () => {
    expect(URLSlug.generate('Hello World', { maxLength: 5 })).toBe('hello');
  });
});

describe('URLSlug — unique', () => {
  it('not in existing', () => {
    expect(URLSlug.unique('Hello', [])).toBe('hello');
  });

  it('first collision', () => {
    expect(URLSlug.unique('Hello', ['hello'])).toBe('hello-1');
  });

  it('multiple collisions', () => {
    expect(URLSlug.unique('Hello', ['hello', 'hello-1', 'hello-2'])).toBe('hello-3');
  });
});

describe('URLSlug — validation', () => {
  it('valid', () => {
    expect(URLSlug.isValid('hello-world')).toBe(true);
  });

  it('invalid uppercase', () => {
    expect(URLSlug.isValid('Hello')).toBe(false);
  });

  it('invalid empty', () => {
    expect(URLSlug.isValid('')).toBe(false);
  });

  it('invalid leading dash', () => {
    expect(URLSlug.isValid('-hello')).toBe(false);
  });
});

describe('URLSlug — increment', () => {
  it('add suffix', () => {
    expect(URLSlug.increment('hello')).toBe('hello-1');
  });

  it('increment existing', () => {
    expect(URLSlug.increment('hello-1')).toBe('hello-2');
  });

  it('increment complex', () => {
    expect(URLSlug.increment('my-post-9')).toBe('my-post-10');
  });
});

describe('URLSlug — helpers', () => {
  it('unslugify', () => {
    expect(URLSlug.unslugify('hello-world')).toBe('hello world');
  });
});

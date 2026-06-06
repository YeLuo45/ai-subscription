/**
 * Slug.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Slug } from '../Slug';

describe('Slug — make', () => {
  it('simple', () => {
    expect(Slug.make('Hello World')).toBe('hello-world');
  });

  it('multiple spaces', () => {
    expect(Slug.make('hello   world')).toBe('hello-world');
  });

  it('punctuation removed', () => {
    expect(Slug.make('Hello, World!')).toBe('hello-world');
  });

  it('underscore', () => {
    expect(Slug.make('hello_world')).toBe('hello-world');
  });

  it('custom separator', () => {
    expect(Slug.make('hello world', { separator: '_' })).toBe('hello_world');
  });

  it('no lowercase', () => {
    expect(Slug.make('Hello World', { lowercase: false })).toBe('Hello-World');
  });

  it('maxLength', () => {
    expect(Slug.make('hello world foo', { maxLength: 10 })).toBe('hello-worl');
  });

  it('empty', () => {
    expect(Slug.make('')).toBe('');
  });

  it('only special', () => {
    expect(Slug.make('!@#$%')).toBe('');
  });
});

describe('Slug — isValid', () => {
  it('valid', () => {
    expect(Slug.isValid('hello-world')).toBe(true);
  });

  it('invalid uppercase', () => {
    expect(Slug.isValid('Hello-World')).toBe(false);
  });

  it('invalid space', () => {
    expect(Slug.isValid('hello world')).toBe(false);
  });

  it('invalid leading dash', () => {
    expect(Slug.isValid('-hello')).toBe(false);
  });
});

describe('Slug — withSuffix/withPrefix/unique', () => {
  it('withSuffix new', () => {
    expect(Slug.withSuffix('hello', '.html')).toBe('hello.html');
  });

  it('withSuffix existing', () => {
    expect(Slug.withSuffix('hello.html', '.html')).toBe('hello.html');
  });

  it('withPrefix new', () => {
    expect(Slug.withPrefix('hello', '/blog/')).toBe('/blog/hello');
  });

  it('withPrefix existing', () => {
    expect(Slug.withPrefix('/blog/hello', '/blog/')).toBe('/blog/hello');
  });

  it('unique new', () => {
    expect(Slug.unique('hello', ['other'])).toBe('hello');
  });

  it('unique existing', () => {
    expect(Slug.unique('hello', ['hello', 'hello-1'])).toBe('hello-2');
  });
});

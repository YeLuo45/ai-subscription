/**
 * CacheControl.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CacheControl } from '../CacheControl';

describe('CacheControl — parse', () => {
  it('max-age', () => {
    const c = CacheControl.parse('max-age=3600');
    expect(c.get('maxAge')).toBe(3600);
  });

  it('multiple directives', () => {
    const c = CacheControl.parse('max-age=60, must-revalidate, public');
    expect(c.get('maxAge')).toBe(60);
    expect(c.get('mustRevalidate')).toBe(true);
    expect(c.get('public')).toBe(true);
  });

  it('no-store', () => {
    expect(CacheControl.parse('no-store').get('noStore')).toBe(true);
  });

  it('s-maxage', () => {
    expect(CacheControl.parse('s-maxage=300').get('sMaxAge')).toBe(300);
  });
});

describe('CacheControl — round trip', () => {
  it('round trip', () => {
    const original = 'max-age=3600, public';
    const c = CacheControl.parse(original);
    expect(c.toString()).toBe(original);
  });

  it('empty', () => {
    const c = new CacheControl();
    expect(c.toString()).toBe('');
  });
});

describe('CacheControl — queries', () => {
  it('isCacheable', () => {
    expect(CacheControl.parse('max-age=60').isCacheable()).toBe(true);
    expect(CacheControl.parse('no-store').isCacheable()).toBe(false);
  });

  it('isPublicCacheable', () => {
    expect(CacheControl.parse('max-age=60, public').isPublicCacheable()).toBe(true);
    expect(CacheControl.parse('max-age=60, private').isPublicCacheable()).toBe(false);
  });

  it('requiresRevalidation', () => {
    expect(CacheControl.parse('no-cache').requiresRevalidation()).toBe(true);
    expect(CacheControl.parse('max-age=60').requiresRevalidation()).toBe(false);
  });
});

describe('CacheControl — get/set/toObject', () => {
  it('set', () => {
    const c = new CacheControl();
    c.set('maxAge', 60);
    expect(c.get('maxAge')).toBe(60);
  });

  it('toObject', () => {
    const c = new CacheControl({ maxAge: 60, public: true });
    expect(c.toObject()).toEqual({ maxAge: 60, public: true });
  });
});

describe('CacheControl — additional', () => {
  it('stale-while-revalidate', () => {
    expect(CacheControl.parse('stale-while-revalidate=60').get('staleWhileRevalidate')).toBe(60);
  });

  it('immutable', () => {
    expect(CacheControl.parse('max-age=31536000, immutable').get('immutable')).toBe(true);
  });

  it('private', () => {
    expect(CacheControl.parse('private').get('private')).toBe(true);
  });
});

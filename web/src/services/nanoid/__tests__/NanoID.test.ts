/**
 * NanoID.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { NanoID } from '../NanoID';

describe('NanoID — basic', () => {
  it('default size 21', () => {
    expect(NanoID.generate().length).toBe(21);
  });

  it('custom size', () => {
    expect(NanoID.generate(10).length).toBe(10);
    expect(NanoID.generate(30).length).toBe(30);
  });

  it('unique IDs', () => {
    const set = new Set();
    for (let i = 0; i < 1000; i++) set.add(NanoID.generate());
    expect(set.size).toBe(1000);
  });

  it('uses URL-safe alphabet', () => {
    const id = NanoID.generate();
    expect(/^[A-Za-z0-9_-]+$/.test(id)).toBe(true);
  });
});

describe('NanoID — custom alphabet', () => {
  it('hex alphabet', () => {
    const id = NanoID.generate(16, '0123456789abcdef');
    expect(/^[0-9a-f]+$/.test(id)).toBe(true);
  });

  it('alphabet of size 1', () => {
    const id = NanoID.generate(5, 'a');
    expect(id).toBe('aaaaa');
  });

  it('throws on empty alphabet', () => {
    expect(() => NanoID.generate(10, '')).toThrow();
  });

  it('throws on size 0', () => {
    expect(() => NanoID.generate(0)).toThrow();
  });
});

describe('NanoID — batch', () => {
  it('batch of N', () => {
    const b = NanoID.batch(50);
    expect(b.length).toBe(50);
  });
});

describe('NanoID — urlSafe', () => {
  it('URL-safe characters only', () => {
    const id = NanoID.urlSafe();
    expect(/^[A-Za-z0-9\-._~]+$/.test(id)).toBe(true);
  });
});

describe('NanoID — numeric', () => {
  it('numeric only', () => {
    const id = NanoID.numeric();
    expect(/^\d+$/.test(id)).toBe(true);
  });
});

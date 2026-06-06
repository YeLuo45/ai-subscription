/**
 * Hash.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Hash } from '../Hash';

describe('Hash — SHA-256', () => {
  it('empty string', () => {
    expect(Hash.sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('hello', () => {
    expect(Hash.sha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('length 64', () => {
    expect(Hash.sha256('a').length).toBe(64);
  });

  it('unicode', () => {
    const h = Hash.sha256('中文');
    expect(h.length).toBe(64);
    expect(h).not.toBe(Hash.sha256('English'));
  });
});

describe('Hash — SHA-1', () => {
  it('length 40', () => {
    expect(Hash.sha1('hello').length).toBe(40);
  });

  it('hello', () => {
    expect(Hash.sha1('hello')).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
  });
});

describe('Hash — MD5', () => {
  it('length 32', () => {
    expect(Hash.md5('hello').length).toBe(32);
  });

  it('different content different hash', () => {
    expect(Hash.md5('hello')).not.toBe(Hash.md5('world'));
  });

  it('unicode', () => {
    expect(Hash.md5('中文').length).toBe(32);
  });
});

describe('Hash — bytes', () => {
  it('sha256Bytes', () => {
    const bytes = new TextEncoder().encode('hello');
    expect(Hash.sha256Bytes(bytes)).toBe(Hash.sha256('hello'));
  });
});

describe('Hash — HMAC-SHA256', () => {
  it('length 64', () => {
    expect(Hash.hmacSha256('key', 'msg').length).toBe(64);
  });

  it('deterministic', () => {
    expect(Hash.hmacSha256('key', 'msg')).toBe(Hash.hmacSha256('key', 'msg'));
  });

  it('different key', () => {
    expect(Hash.hmacSha256('k1', 'msg')).not.toBe(Hash.hmacSha256('k2', 'msg'));
  });

  it('different msg', () => {
    expect(Hash.hmacSha256('key', 'm1')).not.toBe(Hash.hmacSha256('key', 'm2'));
  });
});

describe('Hash — toHex', () => {
  it('basic', () => {
    expect(Hash.toHex([0, 1, 15, 255])).toBe('00010fff');
  });

  it('Uint8Array', () => {
    expect(Hash.toHex(new Uint8Array([10, 20]))).toBe('0a14');
  });
});

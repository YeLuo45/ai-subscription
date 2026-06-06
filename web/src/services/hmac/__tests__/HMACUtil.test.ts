/**
 * HMACUtil.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { HMACUtil } from '../HMACUtil';

describe('HMACUtil — basic', () => {
  it('hmac sha1 of empty', () => {
    // RFC 2202 test vector
    const r = HMACUtil.hmacSha1('', '');
    expect(r).toBe('fbdb1d1b18aa6c08324b7d64b71fb76370690e1d');
  });

  it('hmac sha256 of empty', () => {
    const r = HMACUtil.hmacSha256('', '');
    expect(r).toBe('b613679a0814d9ec772f95d778c35fc5ff1697c493715653c6c712144292c5ad');
  });

  it('hmac sha256 with key', () => {
    const r = HMACUtil.hmacSha256('key', 'The quick brown fox jumps over the lazy dog');
    expect(r).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  });
});

describe('HMACUtil — different algos', () => {
  it('sha1 vs sha256 differ', () => {
    const a = HMACUtil.hmacSha1('key', 'msg');
    const b = HMACUtil.hmacSha256('key', 'msg');
    expect(a).not.toBe(b);
  });

  it('sha512 length', () => {
    const r = HMACUtil.hmacSha512('k', 'm');
    expect(r.length).toBe(128); // 64 bytes hex
  });
});

describe('HMACUtil — base64', () => {
  it('base64 output', () => {
    const r = HMACUtil.hmacBase64('sha256', 'k', 'm');
    expect(r.length).toBeGreaterThan(0);
    expect(r.endsWith('=') || !r.includes('=')).toBe(true);
  });
});

describe('HMACUtil — timing safe', () => {
  it('equal strings return true', () => {
    expect(HMACUtil.timingSafeEqual('abc', 'abc')).toBe(true);
  });

  it('different strings return false', () => {
    expect(HMACUtil.timingSafeEqual('abc', 'abd')).toBe(false);
  });

  it('different lengths return false', () => {
    expect(HMACUtil.timingSafeEqual('a', 'ab')).toBe(false);
  });
});

describe('HMACUtil — Uint8Array input', () => {
  it('Uint8Array key', () => {
    const key = new Uint8Array([1, 2, 3]);
    const r = HMACUtil.hmacSha256(key, 'msg');
    expect(r.length).toBe(64);
  });
});

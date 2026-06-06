/**
 * HashUtil.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { HashUtil } from '../HashUtil';

describe('HashUtil — SHA', () => {
  it('sha1 of empty', async () => {
    expect(await HashUtil.sha1('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });

  it('sha256 of empty', async () => {
    expect(await HashUtil.sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('sha256 of "abc"', async () => {
    expect(await HashUtil.sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('sha512 of "abc"', async () => {
    expect(await HashUtil.sha512('abc')).toBe('ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f');
  });

  it('sha384 of "abc"', async () => {
    const r = await HashUtil.sha384('abc');
    expect(r.length).toBe(96); // 48 bytes hex
  });
});

describe('HashUtil — base64', () => {
  it('sha256 base64', async () => {
    const r = await HashUtil.sha256Base64('abc');
    expect(r).toBe('ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
  });
});

describe('HashUtil — FNV-1a', () => {
  it('FNV-1a of empty', () => {
    expect(HashUtil.fnv1a('')).toBe(0x811c9dc5);
  });

  it('FNV-1a of "a"', () => {
    expect(HashUtil.fnv1a('a')).toBe(0xe40c292c);
  });
});

describe('HashUtil — CRC32', () => {
  it('CRC32 of empty', () => {
    expect(HashUtil.crc32('')).toBe(0);
  });

  it('CRC32 of "123456789"', () => {
    expect(HashUtil.crc32('123456789')).toBe(0xcbf43926);
  });
});

describe('HashUtil — Murmur3', () => {
  it('murmur3 of "abc"', () => {
    const r = HashUtil.murmur3('abc', 0);
    expect(r).toBe(0xb3dd93fa);
  });
});

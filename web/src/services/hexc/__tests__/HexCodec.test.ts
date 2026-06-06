/**
 * HexCodec.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { HexCodec } from '../HexCodec';

describe('HexCodec — encode/decode', () => {
  it('empty', () => {
    expect(HexCodec.encode(new Uint8Array(0))).toBe('');
    expect(HexCodec.decode('').length).toBe(0);
  });

  it('hello', () => {
    expect(HexCodec.encode('hello')).toBe('68656c6c6f');
  });

  it('decode', () => {
    expect(new TextDecoder().decode(HexCodec.decode('68656c6c6f'))).toBe('hello');
  });

  it('uppercase', () => {
    expect(HexCodec.encode('hi', true)).toBe('6869'.toUpperCase());
  });

  it('roundtrip', () => {
    const data = new Uint8Array([0, 1, 2, 255, 100, 50]);
    expect(Array.from(HexCodec.decode(HexCodec.encode(data)))).toEqual([0, 1, 2, 255, 100, 50]);
  });

  it('with spaces', () => {
    expect(new TextDecoder().decode(HexCodec.decode('68 65 6c 6c 6f'))).toBe('hello');
  });
});

describe('HexCodec — tryDecode', () => {
  it('valid', () => {
    expect(HexCodec.tryDecode('68')).not.toBe(null);
  });

  it('odd length', () => {
    expect(HexCodec.tryDecode('abc')).toBe(null);
  });

  it('invalid char', () => {
    expect(HexCodec.tryDecode('zz')).toBe(null);
  });
});

describe('HexCodec — prefixed', () => {
  it('encodeWithPrefix', () => {
    expect(HexCodec.encodeWithPrefix('hi')).toBe('0x68 0x69');
  });

  it('decodePrefixed', () => {
    expect(Array.from(HexCodec.decodePrefixed('0x68 0x69'))).toEqual([0x68, 0x69]);
  });
});

describe('HexCodec — isValid', () => {
  it('valid', () => {
    expect(HexCodec.isValid('abcd')).toBe(true);
  });

  it('odd', () => {
    expect(HexCodec.isValid('abc')).toBe(false);
  });

  it('invalid char', () => {
    expect(HexCodec.isValid('zz')).toBe(false);
  });

  it('empty', () => {
    expect(HexCodec.isValid('')).toBe(false);
  });
});

describe('HexCodec — int', () => {
  it('encodeInt', () => {
    expect(HexCodec.encodeInt(255)).toBe('ff');
    expect(HexCodec.encodeInt(255, 2)).toBe('00ff');
  });

  it('decodeInt', () => {
    expect(HexCodec.decodeInt('ff')).toBe(255);
  });
});

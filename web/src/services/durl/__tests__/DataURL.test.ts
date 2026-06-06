/**
 * DataURL.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DataURL } from '../DataURL';

describe('DataURL — parse', () => {
  it('text', () => {
    const r = DataURL.parse('data:text/plain,hello');
    expect(r?.mediaType).toBe('text/plain');
    expect(r?.isBase64).toBe(false);
    expect(r?.data).toBe('hello');
  });

  it('base64', () => {
    const r = DataURL.parse('data:text/plain;base64,aGVsbG8=');
    expect(r?.isBase64).toBe(true);
    if (typeof r?.data !== 'string') {
      expect(new TextDecoder().decode(r.data)).toBe('hello');
    }
  });

  it('default charset', () => {
    const r = DataURL.parse('data:,hello');
    expect(r?.mediaType).toBe('text/plain;charset=US-ASCII');
  });

  it('invalid', () => {
    expect(DataURL.parse('not-a-data-url')).toBe(null);
    expect(DataURL.parse('data:no-comma')).toBe(null);
  });

  it('json', () => {
    const url = DataURL.fromString('{"a":1}', 'application/json');
    const r = DataURL.parse(url);
    expect(r?.data).toBe('{"a":1}');
  });
});

describe('DataURL — build', () => {
  it('fromString', () => {
    expect(DataURL.fromString('hi', 'text/plain')).toBe('data:text/plain,hi');
  });

  it('fromString encoded', () => {
    expect(DataURL.fromString('hello world', 'text/plain')).toBe('data:text/plain,hello%20world');
  });

  it('fromBase64', () => {
    expect(DataURL.fromBase64('aGVsbG8=', 'text/plain')).toBe('data:text/plain;base64,aGVsbG8=');
  });

  it('fromBytes', () => {
    const bytes = new Uint8Array([72, 73]); // "HI"
    const url = DataURL.fromBytes(bytes, 'text/plain');
    expect(url).toContain('data:text/plain;base64,');
  });
});

describe('DataURL — toText/toBytes', () => {
  it('toText', () => {
    expect(DataURL.toText('data:text/plain,hello')).toBe('hello');
  });

  it('toText from base64', () => {
    expect(DataURL.toText('data:text/plain;base64,aGVsbG8=')).toBe('hello');
  });

  it('toBytes', () => {
    const bytes = DataURL.toBytes('data:text/plain,hi');
    expect(new TextDecoder().decode(bytes!)).toBe('hi');
  });
});

describe('DataURL — isDataURL', () => {
  it('true', () => {
    expect(DataURL.isDataURL('data:text/plain,x')).toBe(true);
  });

  it('false', () => {
    expect(DataURL.isDataURL('https://x.com')).toBe(false);
  });
});

describe('DataURL — base64 helpers', () => {
  it('roundtrip', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const b64 = DataURL.encodeBase64(bytes);
    const decoded = DataURL.decodeBase64(b64);
    expect(Array.from(decoded)).toEqual([1, 2, 3, 4, 5]);
  });
});

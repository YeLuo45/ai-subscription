/**
 * BasicAuth.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BasicAuth } from '../BasicAuth';

describe('BasicAuth — round trip', () => {
  it('serializes', () => {
    const b = new BasicAuth('user', 'pass');
    expect(b.toString()).toBe('Basic ' + btoa('user:pass'));
  });

  it('parses', () => {
    const b = BasicAuth.parse('Basic ' + btoa('user:pass'));
    expect(b?.username).toBe('user');
    expect(b?.password).toBe('pass');
  });

  it('round trip', () => {
    const original = new BasicAuth('alice', 'secret123');
    const parsed = BasicAuth.parse(original.toString());
    expect(parsed?.username).toBe('alice');
    expect(parsed?.password).toBe('secret123');
  });
});

describe('BasicAuth — parse errors', () => {
  it('not basic', () => {
    expect(BasicAuth.parse('Bearer abc')).toBe(null);
  });

  it('invalid base64', () => {
    expect(BasicAuth.parse('Basic !!!notbase64!!!')).toBe(null);
  });

  it('no colon', () => {
    expect(BasicAuth.parse('Basic ' + btoa('nocolon'))).toBe(null);
  });
});

describe('BasicAuth — factories', () => {
  it('fromCredentials', () => {
    const b = BasicAuth.fromCredentials('a', 'b');
    expect(b.username).toBe('a');
  });

  it('fromObject', () => {
    const b = BasicAuth.fromObject({ username: 'a', password: 'b' });
    expect(b.password).toBe('b');
  });

  it('toObject', () => {
    const b = new BasicAuth('a', 'b');
    expect(b.toObject()).toEqual({ username: 'a', password: 'b' });
  });
});

describe('BasicAuth — equals', () => {
  it('same', () => {
    expect(new BasicAuth('a', 'b').equals(new BasicAuth('a', 'b'))).toBe(true);
  });

  it('diff', () => {
    expect(new BasicAuth('a', 'b').equals(new BasicAuth('a', 'c'))).toBe(false);
  });

  it('null', () => {
    expect(new BasicAuth('a', 'b').equals(null)).toBe(false);
  });
});

describe('BasicAuth — encode/decode', () => {
  it('encode', () => {
    expect(BasicAuth.encode('hello')).toBe(btoa('hello'));
  });

  it('decode', () => {
    expect(BasicAuth.decode(btoa('hello'))).toBe('hello');
  });

  it('unicode', () => {
    const s = '中文';
    expect(BasicAuth.decode(BasicAuth.encode(s))).toBe(s);
  });
});

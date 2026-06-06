/**
 * JWTSign.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JWTSign } from '../JWTSign';

describe('JWTSign — sign/verify', () => {
  it('sign and verify', () => {
    const token = JWTSign.sign({ sub: '123', name: 'foo' }, 'secret');
    const r = JWTSign.verify(token, 'secret');
    expect(r.valid).toBe(true);
    expect(r.payload?.sub).toBe('123');
    expect(r.payload?.name).toBe('foo');
  });

  it('wrong secret fails', () => {
    const token = JWTSign.sign({ sub: '123' }, 'secret');
    const r = JWTSign.verify(token, 'wrong');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Invalid signature');
  });

  it('expired', () => {
    const token = JWTSign.sign({ sub: '1', exp: 1000 }, 's');
    const r = JWTSign.verify(token, 's');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Token expired');
  });

  it('not expired', () => {
    const token = JWTSign.sign({ sub: '1', exp: Math.floor(Date.now() / 1000) + 1000 }, 's');
    const r = JWTSign.verify(token, 's');
    expect(r.valid).toBe(true);
  });
});

describe('JWTSign — decode', () => {
  it('decode', () => {
    const token = JWTSign.sign({ foo: 'bar' }, 's');
    const d = JWTSign.decode(token);
    expect(d?.header.alg).toBe('HS256');
    expect(d?.header.typ).toBe('JWT');
    expect(d?.payload.foo).toBe('bar');
  });

  it('decode invalid', () => {
    expect(JWTSign.decode('not-a-token')).toBe(null);
  });
});

describe('JWTSign — format', () => {
  it('has 3 parts', () => {
    const token = JWTSign.sign({ a: 1 }, 's');
    expect(token.split('.').length).toBe(3);
  });

  it('verify invalid format', () => {
    const r = JWTSign.verify('not-a-token', 's');
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Invalid token format');
  });
});

describe('JWTSign — alg mismatch', () => {
  it('rejects non-HS256', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.fake';
    const r = JWTSign.verify(token, 's');
    expect(r.valid).toBe(false);
  });
});

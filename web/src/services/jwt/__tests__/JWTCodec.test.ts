/**
 * JWTCodec.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JWTCodec } from '../JWTCodec';

describe('JWTCodec — sign', () => {
  it('signs a payload', () => {
    const token = JWTCodec.sign({ sub: '123' }, 'secret');
    expect(token.split('.').length).toBe(3);
  });

  it('includes iat', () => {
    const token = JWTCodec.sign({ sub: '123' }, 'secret');
    const d = JWTCodec.decode(token);
    expect(d?.payload.iat).toBeDefined();
  });

  it('includes exp when expiresIn', () => {
    const token = JWTCodec.sign({ sub: '123' }, 'secret', { expiresIn: 3600 });
    const d = JWTCodec.decode(token);
    expect(d?.payload.exp).toBeDefined();
  });
});

describe('JWTCodec — verify', () => {
  it('verifies valid token', () => {
    const token = JWTCodec.sign({ sub: '123', name: 'Alice' }, 'secret');
    const r = JWTCodec.verify(token, 'secret');
    expect(r?.sub).toBe('123');
    expect(r?.name).toBe('Alice');
  });

  it('rejects bad signature', () => {
    const token = JWTCodec.sign({ sub: '123' }, 'secret');
    expect(JWTCodec.verify(token, 'wrong-secret')).toBe(null);
  });

  it('rejects expired', () => {
    const token = JWTCodec.sign({ sub: '123' }, 'secret', { expiresIn: -1 });
    expect(JWTCodec.verify(token, 'secret')).toBe(null);
  });

  it('rejects malformed', () => {
    expect(JWTCodec.verify('not.a.token', 's')).toBe(null);
    expect(JWTCodec.verify('only.two', 's')).toBe(null);
  });
});

describe('JWTCodec — decode', () => {
  it('decode without verification', () => {
    const token = JWTCodec.sign({ sub: '123' }, 'secret');
    const d = JWTCodec.decode(token);
    expect(d?.header.alg).toBe('HS256');
    expect(d?.header.typ).toBe('JWT');
  });

  it('rejects malformed on decode', () => {
    expect(JWTCodec.decode('bad')).toBe(null);
  });
});

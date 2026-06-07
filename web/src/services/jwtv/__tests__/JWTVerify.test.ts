/**
 * JWTVerify.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JWTVerify } from '../JWTVerify';

describe('JWTVerify — sign/verify', () => {
  it('sign and verify', () => {
    const token = JWTVerify.sign({ sub: '123' }, 'secret');
    const r = JWTVerify.verify(token, 'secret');
    expect(r.valid).toBe(true);
    expect(r.payload?.sub).toBe('123');
  });

  it('wrong secret', () => {
    const token = JWTVerify.sign({ sub: '123' }, 'secret');
    const r = JWTVerify.verify(token, 'wrong');
    expect(r.valid).toBe(false);
  });
});

describe('JWTVerify — exp/nbf', () => {
  it('expired', () => {
    const token = JWTVerify.sign({ exp: 1000 }, 's');
    const r = JWTVerify.verify(token, 's');
    expect(r.reason).toBe('Token expired');
  });

  it('not yet valid (nbf)', () => {
    const future = Math.floor(Date.now() / 1000) + 1000;
    const token = JWTVerify.sign({ nbf: future }, 's');
    const r = JWTVerify.verify(token, 's');
    expect(r.reason).toBe('Token not yet valid');
  });

  it('max age', () => {
    const past = Math.floor(Date.now() / 1000) - 1000;
    const token = JWTVerify.sign({ iat: past }, 's');
    const r = JWTVerify.verify(token, 's', { maxAge: 100 });
    expect(r.reason).toBe('Token too old');
  });

  it('clock tolerance', () => {
    const future = Math.floor(Date.now() / 1000) + 30;
    const token = JWTVerify.sign({ nbf: future }, 's');
    const r = JWTVerify.verify(token, 's', { clockTolerance: 60 });
    expect(r.valid).toBe(true);
  });
});

describe('JWTVerify — iss/aud/sub/jti', () => {
  it('issuer match', () => {
    const token = JWTVerify.sign({ iss: 'me' }, 's');
    expect(JWTVerify.verify(token, 's', { issuer: 'me' }).valid).toBe(true);
    expect(JWTVerify.verify(token, 's', { issuer: 'other' }).valid).toBe(false);
  });

  it('audience match', () => {
    const token = JWTVerify.sign({ aud: 'you' }, 's');
    expect(JWTVerify.verify(token, 's', { audience: 'you' }).valid).toBe(true);
    expect(JWTVerify.verify(token, 's', { audience: 'other' }).valid).toBe(false);
  });

  it('audience array', () => {
    const token = JWTVerify.sign({ aud: ['a', 'b'] }, 's');
    expect(JWTVerify.verify(token, 's', { audience: 'b' }).valid).toBe(true);
  });

  it('subject', () => {
    const token = JWTVerify.sign({ sub: 'u1' }, 's');
    expect(JWTVerify.verify(token, 's', { subject: 'u1' }).valid).toBe(true);
    expect(JWTVerify.verify(token, 's', { subject: 'u2' }).valid).toBe(false);
  });

  it('jwtId', () => {
    const token = JWTVerify.sign({ jti: 'abc' }, 's');
    expect(JWTVerify.verify(token, 's', { jwtId: 'abc' }).valid).toBe(true);
  });
});

describe('JWTVerify — decode/isExpired', () => {
  it('decode', () => {
    const token = JWTVerify.sign({ foo: 'bar' }, 's');
    const d = JWTVerify.decode(token);
    expect(d?.payload.foo).toBe('bar');
  });

  it('isExpired', () => {
    const token = JWTVerify.sign({ exp: 1000 }, 's');
    expect(JWTVerify.isExpired(token)).toBe(true);
  });

  it('isExpired false', () => {
    const future = Math.floor(Date.now() / 1000) + 1000;
    const token = JWTVerify.sign({ exp: future }, 's');
    expect(JWTVerify.isExpired(token)).toBe(false);
  });
});

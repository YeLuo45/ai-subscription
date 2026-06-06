/**
 * BearerToken.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BearerToken } from '../BearerToken';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const p = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${header}.${p}.sig`;
}

describe('BearerToken — parse', () => {
  it('parses basic', () => {
    const t = new BearerToken(makeJwt({ sub: 'user1' }));
    expect(t.payload.sub).toBe('user1');
  });

  it('header', () => {
    const t = new BearerToken(makeJwt({ sub: 'a' }));
    expect(t.header.alg).toBe('HS256');
  });

  it('invalid format', () => {
    expect(() => new BearerToken('not.a.jwt.format')).toThrow();
    expect(() => new BearerToken('only.two')).toThrow();
  });

  it('invalid base64', () => {
    expect(() => new BearerToken('!!!.!!!.sig')).toThrow();
  });
});

describe('BearerToken — Authorization', () => {
  it('toString', () => {
    const t = new BearerToken(makeJwt({}));
    expect(t.toString()).toBe('Bearer ' + t.raw);
  });

  it('parse Authorization', () => {
    const t = new BearerToken(makeJwt({ sub: 'a' }));
    const parsed = BearerToken.parse('Bearer ' + t.raw);
    expect(parsed?.payload.sub).toBe('a');
  });

  it('parse not Bearer', () => {
    expect(BearerToken.parse('Basic xxx')).toBe(null);
  });
});

describe('BearerToken — expiration', () => {
  it('not expired', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const t = new BearerToken(makeJwt({ exp: future }));
    expect(t.isExpired()).toBe(false);
  });

  it('expired', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const t = new BearerToken(makeJwt({ exp: past }));
    expect(t.isExpired()).toBe(true);
  });

  it('no exp', () => {
    const t = new BearerToken(makeJwt({}));
    expect(t.isExpired()).toBe(false);
  });

  it('timeToExpiry', () => {
    const future = Math.floor(Date.now() / 1000) + 100;
    const t = new BearerToken(makeJwt({ exp: future }));
    expect(t.timeToExpiry()).toBeGreaterThan(0);
    expect(t.timeToExpiry()).toBeLessThanOrEqual(100_000);
  });
});

describe('BearerToken — isActive', () => {
  it('active', () => {
    const t = new BearerToken(makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    expect(t.isActive()).toBe(true);
  });

  it('not yet valid', () => {
    const t = new BearerToken(makeJwt({ nbf: Math.floor(Date.now() / 1000) + 3600 }));
    expect(t.isActive()).toBe(false);
  });

  it('expired', () => {
    const t = new BearerToken(makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 }));
    expect(t.isActive()).toBe(false);
  });
});

describe('BearerToken — claims', () => {
  it('issuer/subject/audience', () => {
    const t = new BearerToken(makeJwt({ iss: 'auth.example', sub: 'user1', aud: 'api' }));
    expect(t.issuer()).toBe('auth.example');
    expect(t.subject()).toBe('user1');
    expect(t.audience()).toBe('api');
  });

  it('custom claim', () => {
    const t = new BearerToken(makeJwt({ role: 'admin' }));
    expect(t.get<string>('role')).toBe('admin');
  });
});

describe('BearerToken — from', () => {
  it('from', () => {
    const t = BearerToken.from({ alg: 'HS256' }, { sub: 'a' }, 'sig');
    expect(t.payload.sub).toBe('a');
    expect(t.signature).toBe('sig');
  });
});

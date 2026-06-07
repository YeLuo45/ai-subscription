/**
 * JWTVerify — JWT with full claims validation
 *
 * Inspired by: jsonwebtoken
 *
 * On top of HS256, supports:
 *   iss (issuer)
 *   aud (audience)
 *   sub (subject)
 *   jti (JWT ID)
 *   nbf (not before)
 *   iat (issued at)
 *   exp (expiration)
 */

import { Hash } from '../hash/Hash';

function encodeBase64Url(bytes: Uint8Array | number[]): string {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  for (const b of arr) bin += String.fromCharCode(b);
  if (typeof btoa === 'function') return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return Buffer.from(arr).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeStringBase64Url(s: string): string {
  return encodeBase64Url(new TextEncoder().encode(s));
}

function decodeBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  if (typeof atob === 'function') {
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export interface VerifyOptions {
  issuer?: string;
  audience?: string;
  subject?: string;
  jwtId?: string;
  clockTolerance?: number;
  maxAge?: number;
}

export interface VerifyResult {
  valid: boolean;
  payload: Record<string, unknown> | null;
  header: Record<string, unknown> | null;
  reason?: string;
}

export class JWTVerify {
  /**
   * Sign a JWT.
   */
  static sign(payload: Record<string, unknown>, secret: string, alg: 'HS256' = 'HS256'): string {
    const header = { alg, typ: 'JWT' };
    const headerB64 = encodeStringBase64Url(JSON.stringify(header));
    const payloadB64 = encodeStringBase64Url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;
    const sigHex = Hash.hmacSha256(secret, signingInput);
    const sigB64 = encodeBase64Url(hexToBytes(sigHex));
    return `${signingInput}.${sigB64}`;
  }

  /**
   * Verify with full claims validation.
   */
  static verify(token: string, secret: string, options: VerifyOptions = {}): VerifyResult {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, payload: null, header: null, reason: 'Invalid token format' };
    const [headerB64, payloadB64, sigB64] = parts;
    let header: { alg?: string };
    try {
      header = JSON.parse(new TextDecoder().decode(decodeBase64Url(headerB64)));
    } catch {
      return { valid: false, payload: null, header: null, reason: 'Invalid header' };
    }
    if (header.alg !== 'HS256') {
      return { valid: false, payload: null, header, reason: `Unsupported alg ${header.alg}` };
    }
    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedB64 = encodeBase64Url(hexToBytes(Hash.hmacSha256(secret, signingInput)));
    if (expectedB64 !== sigB64) {
      return { valid: false, payload: null, header, reason: 'Invalid signature' };
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadB64)));
    } catch {
      return { valid: false, payload: null, header, reason: 'Invalid payload' };
    }
    const now = Date.now() / 1000;
    const tolerance = options.clockTolerance ?? 0;
    if (typeof payload.nbf === 'number' && payload.nbf > now + tolerance) {
      return { valid: false, payload, header, reason: 'Token not yet valid' };
    }
    if (typeof payload.exp === 'number' && payload.exp < now - tolerance) {
      return { valid: false, payload, header, reason: 'Token expired' };
    }
    if (typeof payload.iat === 'number' && options.maxAge !== undefined) {
      if (now - payload.iat > options.maxAge) {
        return { valid: false, payload, header, reason: 'Token too old' };
      }
    }
    if (options.issuer !== undefined && payload.iss !== options.issuer) {
      return { valid: false, payload, header, reason: `Invalid issuer` };
    }
    if (options.audience !== undefined) {
      const aud = payload.aud;
      const valid = Array.isArray(aud) ? aud.includes(options.audience) : aud === options.audience;
      if (!valid) return { valid: false, payload, header, reason: 'Invalid audience' };
    }
    if (options.subject !== undefined && payload.sub !== options.subject) {
      return { valid: false, payload, header, reason: 'Invalid subject' };
    }
    if (options.jwtId !== undefined && payload.jti !== options.jwtId) {
      return { valid: false, payload, header, reason: 'Invalid JWT ID' };
    }
    return { valid: true, payload, header };
  }

  /**
   * Decode without verification.
   */
  static decode(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return {
      header: JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))),
      payload: JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))),
    };
  }

  /**
   * Check if token is expired.
   */
  static isExpired(token: string): boolean {
    const d = JWTVerify.decode(token);
    if (!d) return true;
    const exp = d.payload.exp as number | undefined;
    if (typeof exp !== 'number') return false;
    return exp < Date.now() / 1000;
  }
}

/**
 * JWTSign — JWT sign with HMAC-SHA256
 *
 * Inspired by: jsonwebtoken
 *
 * Sign JWT with HS256 (HMAC-SHA256).
 */

import { Hash } from '../hash/Hash';

function encodeBase64Url(bytes: Uint8Array | number[]): string {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  for (const b of arr) bin += String.fromCharCode(b);
  if (typeof btoa === 'function') {
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
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

function hmacHex(key: string, msg: string): string {
  return Hash.hmacSha256(key, msg);
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export class JWTSign {
  /**
   * Sign a JWT with HMAC-SHA256.
   */
  static sign(payload: Record<string, unknown>, secret: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = encodeStringBase64Url(JSON.stringify(header));
    const payloadB64 = encodeStringBase64Url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;
    const sigHex = hmacHex(secret, signingInput);
    const sigB64 = encodeBase64Url(hexToBytes(sigHex));
    return `${signingInput}.${sigB64}`;
  }

  /**
   * Verify a JWT signature (HS256).
   */
  static verify(token: string, secret: string): { valid: boolean; payload: Record<string, unknown> | null; error?: string } {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, payload: null, error: 'Invalid token format' };
    const [headerB64, payloadB64, sigB64] = parts;
    let header: { alg?: string };
    try {
      header = JSON.parse(new TextDecoder().decode(decodeBase64Url(headerB64)));
    } catch {
      return { valid: false, payload: null, error: 'Invalid header' };
    }
    if (header.alg !== 'HS256') {
      return { valid: false, payload: null, error: `Unsupported alg ${header.alg}` };
    }
    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedB64 = encodeBase64Url(hexToBytes(hmacHex(secret, signingInput)));
    if (expectedB64 !== sigB64) {
      return { valid: false, payload: null, error: 'Invalid signature' };
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadB64)));
    } catch {
      return { valid: false, payload: null, error: 'Invalid payload' };
    }
    if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) {
      return { valid: false, payload, error: 'Token expired' };
    }
    return { valid: true, payload };
  }

  /**
   * Decode JWT without verification.
   */
  static decode(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    return { header, payload };
  }
}

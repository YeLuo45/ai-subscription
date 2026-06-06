/**
 * JWTCodec — JSON Web Token encode/decode
 *
 * Inspired by: RFC 7519 (JWT) / jsonwebtoken
 *
 * Format: header.payload.signature
 * - header/payload are base64url-encoded JSON
 * - signature is HMAC-SHA256 of header.payload using secret
 */

import { HMACUtil } from '../hmac/HMACUtil';

function base64UrlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}

export interface JWTHeader {
  alg: string;
  typ: string;
}

export interface JWTPayload {
  [key: string]: unknown;
  exp?: number;
  iat?: number;
  sub?: string;
  iss?: string;
}

export class JWTCodec {
  /**
   * Sign a payload with HMAC-SHA256.
   */
  static sign(payload: JWTPayload, secret: string, options: { expiresIn?: number; header?: Partial<JWTHeader> } = {}): string {
    const header: JWTHeader = {
      alg: 'HS256',
      typ: 'JWT',
      ...options.header,
    };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = { ...payload, iat: now };
    if (options.expiresIn) {
      fullPayload.exp = now + options.expiresIn;
    }
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const sig = HMACUtil.hmacSha256(secret, signingInput);
    const encodedSig = sig
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `${signingInput}.${encodedSig}`;
  }

  /**
   * Verify and decode a JWT.
   */
  static verify<T = JWTPayload>(token: string, secret: string): T | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSig] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSig = HMACUtil.hmacSha256(secret, signingInput)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    if (expectedSig !== encodedSig) return null;
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as T;
    if (typeof payload === 'object' && payload !== null) {
      const p = payload as { exp?: number };
      if (p.exp && p.exp < Math.floor(Date.now() / 1000)) return null;
    }
    return payload;
  }

  /**
   * Decode without verification.
   */
  static decode<T = JWTPayload>(token: string): { header: JWTHeader; payload: T } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const header = JSON.parse(base64UrlDecode(parts[0])) as JWTHeader;
      const payload = JSON.parse(base64UrlDecode(parts[1])) as T;
      return { header, payload };
    } catch {
      return null;
    }
  }
}

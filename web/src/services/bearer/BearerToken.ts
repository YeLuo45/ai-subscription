/**
 * BearerToken — JWT (JSON Web Token) parser
 *
 * Inspired by: jsonwebtoken / jwt-decode
 *
 * Format: header.payload.signature (base64url)
 */

export interface JWTHeader {
  alg: string;
  typ?: string;
  [k: string]: unknown;
}

export interface JWTPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  jti?: string;
  [k: string]: unknown;
}

export class BearerToken {
  readonly raw: string;
  readonly header: JWTHeader;
  readonly payload: JWTPayload;
  readonly signature: string;

  constructor(token: string) {
    this.raw = token;
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT: must have 3 parts');
    try {
      this.header = JSON.parse(b64urlDecode(parts[0]));
      this.payload = JSON.parse(b64urlDecode(parts[1]));
    } catch (e) {
      throw new Error('Invalid JWT: ' + (e as Error).message);
    }
    this.signature = parts[2];
  }

  /**
   * Build Authorization header value.
   */
  toString(): string {
    return `Bearer ${this.raw}`;
  }

  /**
   * Build from header/payload/signature.
   */
  static from(header: JWTHeader, payload: JWTPayload, signature: string = ''): BearerToken {
    const h = b64urlEncode(JSON.stringify(header));
    const p = b64urlEncode(JSON.stringify(payload));
    return new BearerToken(`${h}.${p}.${signature}`);
  }

  /**
   * Parse Authorization header.
   */
  static parse(header: string): BearerToken | null {
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;
    try {
      return new BearerToken(m[1].trim());
    } catch {
      return null;
    }
  }

  /**
   * Is expired?
   */
  isExpired(now: number = Date.now()): boolean {
    if (this.payload.exp === undefined) return false;
    return now >= this.payload.exp * 1000;
  }

  /**
   * Seconds until expiry.
   */
  timeToExpiry(now: number = Date.now()): number {
    if (this.payload.exp === undefined) return Infinity;
    return this.payload.exp * 1000 - now;
  }

  /**
   * Is active (nbf <= now < exp)?
   */
  isActive(now: number = Date.now()): boolean {
    const { exp, nbf } = this.payload;
    const nowSec = now / 1000;
    if (nbf !== undefined && nowSec < nbf) return false;
    if (exp !== undefined && nowSec >= exp) return false;
    return true;
  }

  /**
   * Get issuer.
   */
  issuer(): string | undefined { return this.payload.iss; }

  /**
   * Get subject.
   */
  subject(): string | undefined { return this.payload.sub; }

  /**
   * Get audience.
   */
  audience(): string | string[] | undefined { return this.payload.aud; }

  /**
   * Get claim value.
   */
  get<T = unknown>(claim: string): T | undefined {
    return this.payload[claim] as T;
  }
}

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  let str = s.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

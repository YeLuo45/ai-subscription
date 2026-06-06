/**
 * BasicAuth — HTTP Basic Authentication
 *
 * Inspired by: basic-auth npm
 *
 * Format: Authorization: Basic base64(username:password)
 */

export interface BasicCredentials {
  username: string;
  password: string;
}

export class BasicAuth {
  readonly username: string;
  readonly password: string;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  /**
   * Build Authorization header value.
   */
  toString(): string {
    const encoded = btoa(`${this.username}:${this.password}`);
    return `Basic ${encoded}`;
  }

  /**
   * Build from credentials.
   */
  static fromCredentials(username: string, password: string): BasicAuth {
    return new BasicAuth(username, password);
  }

  /**
   * Parse Authorization header.
   */
  static parse(header: string): BasicAuth | null {
    const m = header.match(/^Basic\s+(.+)$/i);
    if (!m) return null;
    let decoded: string;
    try {
      decoded = atob(m[1].trim());
    } catch {
      return null;
    }
    const colonIdx = decoded.indexOf(':');
    if (colonIdx < 0) return null;
    return new BasicAuth(decoded.slice(0, colonIdx), decoded.slice(colonIdx + 1));
  }

  /**
   * Build credentials from object.
   */
  static fromObject(creds: BasicCredentials): BasicAuth {
    return new BasicAuth(creds.username, creds.password);
  }

  /**
   * Get as object.
   */
  toObject(): BasicCredentials {
    return { username: this.username, password: this.password };
  }

  /**
   * URL-safe base64 encode (handles unicode via UTF-8).
   */
  static encode(value: string): string {
    if (typeof btoa === 'function') {
      const bytes = new TextEncoder().encode(value);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }
    return Buffer.from(value, 'utf-8').toString('base64');
  }

  /**
   * URL-safe base64 decode (handles unicode via UTF-8).
   */
  static decode(value: string): string {
    if (typeof atob === 'function') {
      const bin = atob(value);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(value, 'base64').toString('utf-8');
  }

  /**
   * Compare two credentials safely.
   */
  equals(other: BasicAuth | null): boolean {
    if (other === null) return false;
    return this.username === other.username && this.password === other.password;
  }
}

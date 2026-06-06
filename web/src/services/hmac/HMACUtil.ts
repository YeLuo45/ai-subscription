/**
 * HMACUtil — Hash-based Message Authentication Code
 *
 * Inspired by: RFC 2104
 *
 * HMAC(key, message) = H((K' XOR opad) || H((K' XOR ipad) || message))
 * K' is the key padded to block size.
 */

import { createHmac } from 'node:crypto';

export class HMACUtil {
  static hmac(algorithm: 'sha1' | 'sha256' | 'sha384' | 'sha512', key: string | Uint8Array, message: string | Uint8Array): string {
    const k = typeof key === 'string' ? Buffer.from(key) : Buffer.from(key);
    const m = typeof message === 'string' ? Buffer.from(message) : Buffer.from(message);
    return createHmac(algorithm, k).update(m).digest('hex');
  }

  static hmacBase64(algorithm: 'sha1' | 'sha256' | 'sha384' | 'sha512', key: string | Uint8Array, message: string | Uint8Array): string {
    const k = typeof key === 'string' ? Buffer.from(key) : Buffer.from(key);
    const m = typeof message === 'string' ? Buffer.from(message) : Buffer.from(message);
    return createHmac(algorithm, k).update(m).digest('base64');
  }

  static hmacSha256(key: string | Uint8Array, message: string | Uint8Array): string {
    return this.hmac('sha256', key, message);
  }

  static hmacSha1(key: string | Uint8Array, message: string | Uint8Array): string {
    return this.hmac('sha1', key, message);
  }

  static hmacSha512(key: string | Uint8Array, message: string | Uint8Array): string {
    return this.hmac('sha512', key, message);
  }

  /**
   * Constant-time comparison of two hex strings.
   */
  static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}

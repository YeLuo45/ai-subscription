/**
 * DataURL — data: URL parser and builder
 *
 * Inspired by: data-urls / data-uri
 *
 * Format: data:[<mediatype>][;base64],<data>
 */

export class DataURL {
  /**
   * Parse data URL into parts.
   */
  static parse(url: string): { mediaType: string; isBase64: boolean; data: Uint8Array | string } | null {
    if (!url.startsWith('data:')) return null;
    const comma = url.indexOf(',');
    if (comma < 0) return null;
    const meta = url.slice(5, comma);
    const data = url.slice(comma + 1);
    const parts = meta.split(';');
    const isBase64 = parts.includes('base64');
    const mediaType = parts[0] || 'text/plain;charset=US-ASCII';
    if (isBase64) {
      const bytes = DataURL.decodeBase64(data);
      return { mediaType, isBase64: true, data: bytes };
    }
    return { mediaType, isBase64: false, data: decodeURIComponent(data) };
  }

  /**
   * Build data URL from string.
   */
  static fromString(text: string, mediaType: string = 'text/plain'): string {
    return `data:${mediaType},${encodeURIComponent(text)}`;
  }

  /**
   * Build data URL from base64 string.
   */
  static fromBase64(b64: string, mediaType: string = 'application/octet-stream'): string {
    return `data:${mediaType};base64,${b64}`;
  }

  /**
   * Build data URL from Uint8Array.
   */
  static fromBytes(bytes: Uint8Array, mediaType: string = 'application/octet-stream'): string {
    return `data:${mediaType};base64,${DataURL.encodeBase64(bytes)}`;
  }

  /**
   * Get text content (decoded).
   */
  static toText(url: string): string | null {
    const parsed = DataURL.parse(url);
    if (!parsed) return null;
    if (typeof parsed.data === 'string') return parsed.data;
    return new TextDecoder().decode(parsed.data);
  }

  /**
   * Get bytes.
   */
  static toBytes(url: string): Uint8Array | null {
    const parsed = DataURL.parse(url);
    if (!parsed) return null;
    if (typeof parsed.data === 'string') {
      return new TextEncoder().encode(parsed.data);
    }
    return parsed.data;
  }

  /**
   * Decode base64.
   */
  static decodeBase64(s: string): Uint8Array {
    if (typeof atob === 'function') {
      const bin = atob(s);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    return new Uint8Array(Buffer.from(s, 'base64'));
  }

  /**
   * Encode base64.
   */
  static encodeBase64(bytes: Uint8Array): string {
    if (typeof btoa === 'function') {
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }
    return Buffer.from(bytes).toString('base64');
  }

  /**
   * Check if string is data URL.
   */
  static isDataURL(s: string): boolean {
    return s.startsWith('data:');
  }
}

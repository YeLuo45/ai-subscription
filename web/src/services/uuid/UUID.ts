/**
 * UUID — Universally Unique Identifier (v1, v4, v5)
 *
 * Inspired by: uuid package
 */

export class UUID {
  /**
   * Validate UUID.
   */
  static isValid(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  }

  /**
   * Generate UUID v4 (random).
   */
  static v4(): string {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    return UUID._format(bytes);
  }

  /**
   * Generate UUID v1 (timestamp + clock seq).
   */
  static v1(): string {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const now = Date.now();
    // 100-ns intervals since 1582-10-15
    const ticks = (now + 12219292800000) * 10000;
    const tl = (ticks & 0xffffffff) >>> 0;
    bytes[0] = (tl >>> 24) & 0xff;
    bytes[1] = (tl >>> 16) & 0xff;
    bytes[2] = (tl >>> 8) & 0xff;
    bytes[3] = tl & 0xff;
    const tm = (ticks / 0x100000000) & 0xfffffff;
    bytes[4] = (tm >>> 20) & 0xff;
    bytes[5] = (tm >>> 12) & 0xff;
    bytes[6] = (tm >>> 4) & 0xff;
    bytes[7] = ((tm & 0x0f) << 4) | (bytes[6] & 0x0f); // mixed
    bytes[7] = bytes[7];
    bytes[6] = ((tm >>> 4) & 0x0f) | 0x10; // version 1
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    return UUID._format(bytes);
  }

  /**
   * Generate UUID v5 (namespace + name SHA-1 based, simplified).
   */
  static v5(name: string, namespace: string = UUID.NAMESPACE_DNS): string {
    const hash = UUID._simpleHash(namespace + name);
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = hash.charCodeAt(i) & 0xff;
    bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return UUID._format(bytes);
  }

  static NAMESPACE_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  static NAMESPACE_URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
  static NAMESPACE_OID = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';
  static NAMESPACE_X500 = '6ba7b814-9dad-11d1-80b4-00c04fd430c8';

  static NIL = '00000000-0000-0000-0000-000000000000';

  /**
   * Get version.
   */
  static version(uuid: string): number {
    if (!UUID.isValid(uuid)) return 0;
    return parseInt(uuid[14], 16);
  }

  /**
   * Get variant.
   */
  static variant(uuid: string): string {
    if (!UUID.isValid(uuid)) return '';
    const v = parseInt(uuid[19], 16);
    if ((v & 0x8) === 0) return 'NCS';
    if ((v & 0xc) === 0x8) return 'RFC 4122';
    if ((v & 0xe) === 0xc) return 'Microsoft';
    return 'Future';
  }

  private static _format(bytes: Uint8Array): string {
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  private static _simpleHash(s: string): string {
    // Simplified hash for v5 demo (NOT real SHA-1, just deterministic)
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    let str = '';
    let n = h;
    for (let i = 0; i < 16; i++) {
      str += (n & 0xff).toString(16).padStart(2, '0');
      n = Math.imul(n, 31) + i;
    }
    return str;
  }
}

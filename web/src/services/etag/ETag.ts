/**
 * ETag — HTTP ETag parser and matcher
 *
 * Inspired by: etag npm
 *
 * Format: "value" (strong) or W/"value" (weak)
 */

export class ETag {
  readonly value: string;
  readonly weak: boolean;

  constructor(value: string, weak: boolean = false) {
    this.value = value;
    this.weak = weak;
  }

  /**
   * Parse ETag header value.
   */
  static parse(input: string): ETag | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    let weak = false;
    let s = trimmed;
    if (s.startsWith('W/')) {
      weak = true;
      s = s.slice(2);
    }
    if (!s.startsWith('"') || !s.endsWith('"')) return null;
    return new ETag(s.slice(1, -1), weak);
  }

  /**
   * Stringify back to header.
   */
  toString(): string {
    const quoted = `"${this.value}"`;
    return this.weak ? `W/${quoted}` : quoted;
  }

  /**
   * Match two ETags (weak comparison per RFC 7232).
   * Tags match if values are equal, regardless of weak flag.
   */
  matches(other: ETag | null): boolean {
    if (other === null) return false;
    return this.value === other.value;
  }

  /**
   * Compare against If-None-Match header (comma-separated ETags or *).
   */
  matchesIfNoneMatch(header: string): boolean {
    const trimmed = header.trim();
    if (trimmed === '*') return true;
    for (const part of trimmed.split(',')) {
      const tag = ETag.parse(part);
      if (tag && this.matches(tag)) return true;
    }
    return false;
  }

  /**
   * Generate ETag from content (hash).
   */
  static fromContent(content: string, weak: boolean = true): ETag {
    let h = 0;
    for (let i = 0; i < content.length; i++) {
      h = (h << 5) - h + content.charCodeAt(i);
      h |= 0;
    }
    return new ETag(Math.abs(h).toString(36), weak);
  }

  /**
   * Static: create strong.
   */
  static strong(value: string): ETag {
    return new ETag(value, false);
  }

  /**
   * Static: create weak.
   */
  static weak(value: string): ETag {
    return new ETag(value, true);
  }
}

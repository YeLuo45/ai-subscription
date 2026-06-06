/**
 * DateParse — parse multiple date string formats
 *
 * Inspired by: chrono-node
 *
 * Auto-detect common date formats.
 */

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export class DateParse {
  /**
   * Try to parse a date string.
   */
  static tryParse(input: string): Date | null {
    if (typeof input !== 'string') return null;
    const s = input.trim();
    if (s.length === 0) return null;
    // Try ISO 8601
    const iso = this.parseISO(s);
    if (iso) return iso;
    // Try RFC 2822
    const rfc = this.parseRFC(s);
    if (rfc) return rfc;
    // Try common formats
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    return null;
  }

  /**
   * Parse ISO 8601: 2024-01-15 or 2024-01-15T13:30:00Z
   */
  static parseISO(s: string): Date | null {
    const re = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
    const m = s.match(re);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const h = m[4] ? parseInt(m[4], 10) : 0;
    const mn = m[5] ? parseInt(m[5], 10) : 0;
    const s2 = m[6] ? parseInt(m[6], 10) : 0;
    const ms = m[7] ? parseInt(m[7], 10) : 0;
    if (mo < 0 || mo > 11) return null;
    if (d < 1 || d > 31) return null;
    if (m[8] && m[8] !== 'Z') {
      // Has timezone offset
      return new Date(Date.UTC(y, mo, d, h, mn, s2, ms));
    }
    return new Date(Date.UTC(y, mo, d, h, mn, s2, ms));
  }

  /**
   * Parse RFC 2822: Mon, 15 Jan 2024 13:30:00 GMT
   */
  static parseRFC(s: string): Date | null {
    const re = /^(?:[A-Za-z]{3},\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s*(GMT|UTC|Z|[+-]\d{4})?$/;
    const m = s.match(re);
    if (!m) return null;
    const d = parseInt(m[1], 10);
    const monthName = m[2].toLowerCase();
    const mo = MONTHS[monthName];
    if (mo === undefined) return null;
    const y = parseInt(m[3], 10);
    const h = parseInt(m[4], 10);
    const mn = parseInt(m[5], 10);
    const s2 = m[6] ? parseInt(m[6], 10) : 0;
    return new Date(Date.UTC(y, mo, d, h, mn, s2));
  }

  /**
   * Parse with default fallback.
   */
  static parseOr(input: string, fallback: Date): Date {
    return this.tryParse(input) ?? fallback;
  }

  /**
   * Check if string is valid date.
   */
  static isValid(input: string): boolean {
    return this.tryParse(input) !== null;
  }
}

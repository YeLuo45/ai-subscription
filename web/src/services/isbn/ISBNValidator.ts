/**
 * ISBNValidator — International Standard Book Number
 *
 * Inspired by: ISO 2108
 *
 * Supports ISBN-10 (mod 11) and ISBN-13 (mod 10).
 */

export class ISBNValidator {
  /**
   * Validate ISBN-10 or ISBN-13 (auto-detect).
   */
  static isValid(isbn: string): boolean {
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (cleaned.length === 10) return this.isValidISBN10(cleaned);
    if (cleaned.length === 13) return this.isValidISBN13(cleaned);
    return false;
  }

  /**
   * Validate ISBN-10 with X check digit support.
   */
  static isValidISBN10(isbn: string): boolean {
    const cleaned = isbn.replace(/[-\s]/g, '').toUpperCase();
    if (!/^\d{9}[\dX]$/.test(cleaned)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i], 10) * (10 - i);
    }
    const check = cleaned[9] === 'X' ? 10 : parseInt(cleaned[9], 10);
    sum += check;
    return sum % 11 === 0;
  }

  /**
   * Validate ISBN-13 with mod 10.
   */
  static isValidISBN13(isbn: string): boolean {
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (!/^\d{13}$/.test(cleaned)) return false;
    if (!/^(978|979)/.test(cleaned)) return false;
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const d = parseInt(cleaned[i], 10);
      sum += d * (i % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
  }

  /**
   * Convert ISBN-10 to ISBN-13.
   */
  static toISBN13(isbn: string): string | null {
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (cleaned.length !== 10) return null;
    if (!this.isValidISBN10(cleaned)) return null;
    const prefix = '978' + cleaned.slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(prefix[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return prefix + checkDigit;
  }

  /**
   * Format ISBN with hyphens.
   */
  static format(isbn: string): string {
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (cleaned.length === 13) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7, 12)}-${cleaned.slice(12)}`;
    }
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
    }
    return isbn;
  }

  /**
   * Extract ISBN parts.
   */
  static parts(isbn: string): { prefix: string; group: string; publisher: string; title: string; check: string } | null {
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (cleaned.length === 13) {
      return {
        prefix: cleaned.slice(0, 3),
        group: cleaned.slice(3, 4),
        publisher: cleaned.slice(4, 7),
        title: cleaned.slice(7, 12),
        check: cleaned.slice(12),
      };
    }
    if (cleaned.length === 10) {
      return {
        prefix: '',
        group: cleaned.slice(0, 1),
        publisher: cleaned.slice(1, 5),
        title: cleaned.slice(5, 9),
        check: cleaned.slice(9),
      };
    }
    return null;
  }
}

/**
 * ISBN — International Standard Book Number
 *
 * Inspired by: isbn-utils
 *
 * Supports ISBN-10 and ISBN-13.
 */

export class ISBN {
  /**
   * Validate ISBN.
   */
  static isValid(isbn: string): boolean {
    const cleaned = isbn.replace(/[\s-]/g, '');
    if (cleaned.length === 10) return ISBN._isValid10(cleaned);
    if (cleaned.length === 13) return ISBN._isValid13(cleaned);
    return false;
  }

  /**
   * Detect ISBN version.
   */
  static version(isbn: string): 10 | 13 | null {
    const cleaned = isbn.replace(/[\s-]/g, '');
    if (cleaned.length === 10) return 10;
    if (cleaned.length === 13) return 13;
    return null;
  }

  /**
   * Convert ISBN-10 to ISBN-13.
   */
  static to13(isbn: string): string {
    const c = isbn.replace(/[\s-]/g, '');
    if (c.length === 13) return c;
    if (c.length !== 10) throw new Error('Not ISBN-10');
    const base = '978' + c.slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return base + check;
  }

  /**
   * Convert ISBN-13 to ISBN-10.
   */
  static to10(isbn: string): string {
    const c = isbn.replace(/[\s-]/g, '');
    if (c.length === 10) return c;
    if (c.length !== 13) throw new Error('Not ISBN-13');
    if (!c.startsWith('978')) throw new Error('Not 978 prefix');
    const base = c.slice(3, 12);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(base[i], 10) * (10 - i);
    }
    const check = (11 - (sum % 11)) % 11;
    return base + (check === 10 ? 'X' : String(check));
  }

  /**
   * Format with hyphens.
   */
  static format(isbn: string): string {
    const c = isbn.replace(/[\s-]/g, '');
    if (c.length === 13) {
      return `${c.slice(0, 3)}-${c.slice(3, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}-${c.slice(12)}`;
    }
    if (c.length === 10) {
      return `${c.slice(0, 1)}-${c.slice(1, 5)}-${c.slice(5, 9)}-${c.slice(9)}`;
    }
    return isbn;
  }

  /**
   * Get EAN.UCC prefix.
   */
  static getPrefix(isbn: string): string {
    const c = isbn.replace(/[\s-]/g, '');
    if (c.length === 13) return c.slice(0, 3);
    return '';
  }

  private static _isValid10(isbn: string): boolean {
    if (!/^\d{9}[\dX]$/.test(isbn)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i], 10) * (10 - i);
    }
    const check = isbn[9] === 'X' ? 10 : parseInt(isbn[9], 10);
    return (sum + check) % 11 === 0;
  }

  private static _isValid13(isbn: string): boolean {
    if (!/^\d{13}$/.test(isbn)) return false;
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(isbn[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
  }
}

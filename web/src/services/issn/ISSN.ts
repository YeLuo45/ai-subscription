/**
 * ISSN — International Standard Serial Number
 *
 * 8-digit code: XXXX-XXXX with check digit.
 */

export class ISSN {
  /**
   * Validate ISSN.
   */
  static isValid(issn: string): boolean {
    const cleaned = issn.replace(/[\s-]/g, '').toUpperCase();
    if (cleaned.length !== 8) return false;
    if (!/^\d{7}[\dX]$/.test(cleaned)) return false;
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(cleaned[i], 10) * (8 - i);
    }
    const check = cleaned[7] === 'X' ? 10 : parseInt(cleaned[7], 10);
    return (sum + check) % 11 === 0;
  }

  /**
   * Format ISSN with hyphen.
   */
  static format(issn: string): string {
    const cleaned = issn.replace(/[\s-]/g, '').toUpperCase();
    if (cleaned.length !== 8) return issn;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }

  /**
   * Validate ISSN-8 (same as ISSN).
   */
  static isValidISSN8(issn: string): boolean {
    return ISSN.isValid(issn);
  }

  /**
   * Validate ISSN-13 (with 977 prefix).
   */
  static isValidISSN13(issn: string): boolean {
    const cleaned = issn.replace(/[\s-]/g, '');
    if (cleaned.length !== 13) return false;
    if (!cleaned.startsWith('977')) return false;
    const issn8 = cleaned.slice(3, 11);
    if (!ISSN.isValid(issn8)) return false;
    return true;
  }

  /**
   * Get check digit.
   */
  static getCheckDigit(issn: string): string {
    const cleaned = issn.replace(/[\s-]/g, '');
    if (cleaned.length !== 7) return '';
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(cleaned[i], 10) * (8 - i);
    }
    const check = (11 - (sum % 11)) % 11;
    return check === 10 ? 'X' : String(check);
  }
}

/**
 * Phone — phone number validation and formatting
 *
 * Inspired by: libphonenumber-js (simplified)
 */

export class Phone {
  /**
   * Strip all non-digit characters.
   */
  static digits(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Check if string is a valid phone number (10-15 digits).
   */
  static isValid(phone: string): boolean {
    const d = Phone.digits(phone);
    if (d.length < 7 || d.length > 15) return false;
    return /^[1-9]\d{6,14}$/.test(d);
  }

  /**
   * Format as US-style: (XXX) XXX-XXXX.
   */
  static formatUS(phone: string): string {
    const d = Phone.digits(phone);
    if (d.length === 10) {
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    }
    if (d.length === 11 && d[0] === '1') {
      return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
    }
    return phone;
  }

  /**
   * Format as E.164 international: +CCNNNN...
   */
  static formatE164(phone: string, countryCode: string = '1'): string {
    const d = Phone.digits(phone);
    if (d.startsWith(countryCode)) return `+${d}`;
    return `+${countryCode}${d}`;
  }

  /**
   * Extract country code from E.164.
   */
  static getCountryCode(phone: string): string {
    const d = Phone.digits(phone);
    if (d.length === 11 && d[0] === '1') return '1';
    if ((d.length === 12 || d.length === 13) && d.startsWith('44')) return '44';
    if ((d.length === 12 || d.length === 13) && d.startsWith('86')) return '86';
    return '';
  }

  /**
   * Mask phone for privacy: (XXX) XXX-1234 -> (XXX) XXX-XXXX
   */
  static mask(phone: string, visible: number = 4): string {
    const d = Phone.digits(phone);
    const masked = '*'.repeat(d.length - visible) + d.slice(-visible);
    if (d.length === 10) {
      return `(${masked.slice(0, 3)}) ${masked.slice(3, 6)}-${masked.slice(6)}`;
    }
    return masked;
  }

  /**
   * Extract area code (NPA, first 3 digits of US 10-digit).
   */
  static areaCode(phone: string): string {
    const d = Phone.digits(phone);
    if (d.length === 10) return d.slice(0, 3);
    if (d.length === 11 && d[0] === '1') return d.slice(1, 4);
    return '';
  }

  /**
   * Validate US area code.
   */
  static isValidUSAreaCode(code: string): boolean {
    if (!/^\d{3}$/.test(code)) return false;
    const n = parseInt(code, 10);
    if (n < 200 || n > 999) return false;
    if (code[0] === '9' && code[1] === '1') return false;
    return true;
  }
}

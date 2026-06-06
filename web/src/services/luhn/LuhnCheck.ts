/**
 * LuhnCheck — Luhn algorithm (mod 10) checksum validation
 *
 * Inspired by: ISO/IEC 7812 (credit cards), IMEI
 *
 * Used for credit card numbers, IMEI, Canadian SIN, etc.
 */

export class LuhnCheck {
  /**
   * Validate a number string with Luhn checksum.
   */
  static isValid(input: string): boolean {
    const digits = input.replace(/\D/g, '');
    if (digits.length < 2) return false;
    return this.compute(digits.slice(0, -1)) === parseInt(digits.slice(-1), 10);
  }

  /**
   * Compute the Luhn checksum for a partial number.
   * Returns digit 0-9 such that the full number passes Luhn.
   */
  static compute(digits: string | number): number {
    const arr = typeof digits === 'string'
      ? digits.replace(/\D/g, '').split('').map(Number)
      : Array.from(digits.toString()).map(Number);
    let sum = 0;
    let alt = true;
    for (let i = arr.length - 1; i >= 0; i--) {
      let d = arr[i];
      if (alt) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      alt = !alt;
    }
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Append check digit to a number.
   */
  static appendCheckDigit(digits: string | number): string {
    const c = this.compute(digits);
    return `${digits}${c}`;
  }

  /**
   * Detect card brand from prefix.
   */
  static detectBrand(input: string): string {
    const d = input.replace(/\D/g, '');
    if (/^4/.test(d)) return 'visa';
    if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'mastercard';
    if (/^3[47]/.test(d)) return 'amex';
    if (/^6(?:011|5)/.test(d)) return 'discover';
    if (/^35/.test(d)) return 'jcb';
    if (/^3(?:0[0-5]|[68])/.test(d)) return 'diners';
    if (/^62/.test(d)) return 'unionpay';
    return 'unknown';
  }
}

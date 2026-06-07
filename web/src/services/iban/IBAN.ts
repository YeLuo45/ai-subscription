/**
 * IBAN — International Bank Account Number
 *
 * Inspired by: iban / swift
 *
 * Validates IBAN checksum (mod 97-10).
 */

const IBAN_LENGTHS: Record<string, number> = {
  DE: 22, FR: 27, GB: 22, ES: 24, IT: 27, NL: 18, BE: 16, AT: 20, CH: 21,
  LU: 20, PT: 25, IE: 22, DK: 18, FI: 18, NO: 15, SE: 24, PL: 28, CZ: 24,
  HU: 28, GR: 27, TR: 26, RO: 24, CY: 28, BG: 22, EE: 20, LV: 21, LT: 20,
  SK: 24, SI: 19, MT: 31, HR: 21, LI: 21, MC: 27, SM: 27, VA: 22, IS: 26,
};

export class IBAN {
  /**
   * Validate IBAN checksum.
   */
  static isValid(iban: string): boolean {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    if (cleaned.length < 15) return false;
    const country = cleaned.slice(0, 2);
    if (!/^[A-Z]{2}$/.test(country)) return false;
    const expected = IBAN_LENGTHS[country];
    if (expected && cleaned.length !== expected) return false;
    // Move country code and check digits to end
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    // Convert letters to numbers
    let expanded = '';
    for (const c of rearranged) {
      if (c >= '0' && c <= '9') expanded += c;
      else if (c >= 'A' && c <= 'Z') expanded += String(c.charCodeAt(0) - 55);
      else return false;
    }
    // Compute mod 97
    let remainder = 0;
    for (const digit of expanded) {
      remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
    }
    return remainder === 1;
  }

  /**
   * Get country code.
   */
  static getCountry(iban: string): string {
    return iban.replace(/\s/g, '').toUpperCase().slice(0, 2);
  }

  /**
   * Get check digits.
   */
  static getCheckDigits(iban: string): string {
    return iban.replace(/\s/g, '').toUpperCase().slice(2, 4);
  }

  /**
   * Format with spaces every 4 chars.
   */
  static format(iban: string): string {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    return cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned;
  }

  /**
   * Mask IBAN: DE89**********5000
   */
  static mask(iban: string, visibleStart: number = 2, visibleEnd: number = 4): string {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    if (cleaned.length <= visibleStart + visibleEnd) return cleaned;
    const start = cleaned.slice(0, visibleStart);
    const end = cleaned.slice(-visibleEnd);
    const middle = '*'.repeat(cleaned.length - visibleStart - visibleEnd);
    return start + middle + end;
  }

  /**
   * List supported country codes.
   */
  static listCountries(): string[] {
    return Object.keys(IBAN_LENGTHS);
  }
}

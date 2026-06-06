/**
 * IBANValidator — International Bank Account Number validator
 *
 * Inspired by: ISO 13616
 *
 * Format: 2-letter country code + 2 check digits + up to 30 alphanumeric
 * Validation: mod-97 of rearranged number.
 */

const COUNTRY_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IR: 26, IS: 26, IT: 27, JO: 30, KM: 27,
  KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24,
  ME: 22, MG: 27, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28,
  PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, RU: 33, SA: 24, SC: 31, SD: 18, SE: 24,
  SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22,
  VG: 24, XK: 20,
};

export class IBANValidator {
  /**
   * Validate an IBAN.
   */
  static isValid(iban: string): boolean {
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 4) return false;
    const country = cleaned.slice(0, 2);
    const check = cleaned.slice(2, 4);
    const expectedLen = COUNTRY_LENGTHS[country];
    if (!expectedLen) return false;
    if (cleaned.length !== expectedLen) return false;
    if (!/^\d{2}$/.test(check)) return false;
    // Rearrange: move first 4 chars to end
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    // Convert letters to numbers: A=10, B=11, ..., Z=35
    let numStr = '';
    for (const ch of rearranged) {
      if (ch >= '0' && ch <= '9') {
        numStr += ch;
      } else if (ch >= 'A' && ch <= 'Z') {
        numStr += (ch.charCodeAt(0) - 55).toString();
      } else {
        return false;
      }
    }
    return this.mod97(numStr) === 1;
  }

  /**
   * Compute check digits for an IBAN.
   */
  static computeCheckDigits(country: string, account: string): string {
    const cc = country.toUpperCase();
    const cleaned = (account + cc + '00').toUpperCase();
    let numStr = '';
    for (const ch of cleaned) {
      if (ch >= '0' && ch <= '9') {
        numStr += ch;
      } else if (ch >= 'A' && ch <= 'Z') {
        numStr += (ch.charCodeAt(0) - 55).toString();
      }
    }
    const mod = this.mod97(numStr);
    const check = 98 - mod;
    return check.toString().padStart(2, '0');
  }

  /**
   * Format IBAN with spaces every 4 chars.
   */
  static format(iban: string): string {
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    return cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned;
  }

  /**
   * Get country code.
   */
  static getCountry(iban: string): string | null {
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 2) return null;
    return cleaned.slice(0, 2);
  }

  private static mod97(numStr: string): number {
    let remainder = '';
    for (let i = 0; i < numStr.length; i++) {
      remainder = (remainder + numStr[i]).replace(/^0+/, '') || '0';
      const num = BigInt(remainder) % 97n;
      remainder = num.toString();
    }
    return parseInt(remainder || '0', 10);
  }
}

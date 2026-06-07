/**
 * PhoneIntl — international phone validation (E.164)
 */

interface CountryCode {
  code: string;
  name: string;
  dial: string;       // international dial code
  nationalLength: number;  // expected national number length (without country code)
}

const COUNTRIES: CountryCode[] = [
  { code: 'US', name: 'United States', dial: '1', nationalLength: 10 },
  { code: 'CA', name: 'Canada', dial: '1', nationalLength: 10 },
  { code: 'GB', name: 'United Kingdom', dial: '44', nationalLength: 10 },
  { code: 'CN', name: 'China', dial: '86', nationalLength: 11 },
  { code: 'DE', name: 'Germany', dial: '49', nationalLength: 10 },
  { code: 'FR', name: 'France', dial: '33', nationalLength: 9 },
  { code: 'JP', name: 'Japan', dial: '81', nationalLength: 10 },
  { code: 'IN', name: 'India', dial: '91', nationalLength: 10 },
  { code: 'AU', name: 'Australia', dial: '61', nationalLength: 9 },
  { code: 'BR', name: 'Brazil', dial: '55', nationalLength: 11 },
  { code: 'RU', name: 'Russia', dial: '7', nationalLength: 10 },
  { code: 'KR', name: 'South Korea', dial: '82', nationalLength: 10 },
  { code: 'IT', name: 'Italy', dial: '39', nationalLength: 10 },
  { code: 'ES', name: 'Spain', dial: '34', nationalLength: 9 },
  { code: 'MX', name: 'Mexico', dial: '52', nationalLength: 10 },
];

export class PhoneIntl {
  /**
   * List supported countries.
   */
  static listCountries(): CountryCode[] {
    return [...COUNTRIES];
  }

  /**
   * Find country by dial code.
   */
  static findByDialCode(dial: string): CountryCode | null {
    return COUNTRIES.find((c) => c.dial === dial) ?? null;
  }

  /**
   * Find country by ISO code.
   */
  static findByISOCode(iso: string): CountryCode | null {
    return COUNTRIES.find((c) => c.code === iso) ?? null;
  }

  /**
   * Parse E.164 number.
   */
  static parseE164(phone: string): { country: CountryCode | null; national: string } {
    if (!phone.startsWith('+')) return { country: null, national: '' };
    const digits = phone.slice(1);
    for (const c of COUNTRIES.sort((a, b) => b.dial.length - a.dial.length)) {
      if (digits.startsWith(c.dial)) {
        return { country: c, national: digits.slice(c.dial.length) };
      }
    }
    return { country: null, national: digits };
  }

  /**
   * Format as E.164.
   */
  static toE164(national: string, countryCode: string): string {
    const country = PhoneIntl.findByISOCode(countryCode);
    if (!country) throw new Error(`Unknown country: ${countryCode}`);
    const digits = national.replace(/\D/g, '');
    return `+${country.dial}${digits}`;
  }

  /**
   * Validate international number.
   */
  static isValid(phone: string, countryCode: string): boolean {
    if (!phone.startsWith('+')) return false;
    const digits = phone.slice(1);
    const country = PhoneIntl.findByISOCode(countryCode);
    if (!country) return false;
    if (!digits.startsWith(country.dial)) return false;
    const national = digits.slice(country.dial.length);
    return national.length === country.nationalLength;
  }

  /**
   * Get country from phone.
   */
  static detectCountry(phone: string): CountryCode | null {
    if (!phone.startsWith('+')) return null;
    return PhoneIntl.parseE164(phone).country;
  }

  /**
   * Validate dial code.
   */
  static isValidDialCode(dial: string): boolean {
    return COUNTRIES.some((c) => c.dial === dial);
  }
}

/**
 * Country — ISO 3166-1 alpha-2 country codes
 */

interface CountryInfo {
  alpha2: string;
  alpha3: string;
  numeric: string;
  name: string;
  capital: string;
  region: string;
  currency: string;
  language: string;
}

const COUNTRIES: CountryInfo[] = [
  { alpha2: 'US', alpha3: 'USA', numeric: '840', name: 'United States', capital: 'Washington, D.C.', region: 'Americas', currency: 'USD', language: 'en' },
  { alpha2: 'CA', alpha3: 'CAN', numeric: '124', name: 'Canada', capital: 'Ottawa', region: 'Americas', currency: 'CAD', language: 'en' },
  { alpha2: 'GB', alpha3: 'GBR', numeric: '826', name: 'United Kingdom', capital: 'London', region: 'Europe', currency: 'GBP', language: 'en' },
  { alpha2: 'CN', alpha3: 'CHN', numeric: '156', name: 'China', capital: 'Beijing', region: 'Asia', currency: 'CNY', language: 'zh' },
  { alpha2: 'JP', alpha3: 'JPN', numeric: '392', name: 'Japan', capital: 'Tokyo', region: 'Asia', currency: 'JPY', language: 'ja' },
  { alpha2: 'DE', alpha3: 'DEU', numeric: '276', name: 'Germany', capital: 'Berlin', region: 'Europe', currency: 'EUR', language: 'de' },
  { alpha2: 'FR', alpha3: 'FRA', numeric: '250', name: 'France', capital: 'Paris', region: 'Europe', currency: 'EUR', language: 'fr' },
  { alpha2: 'IT', alpha3: 'ITA', numeric: '380', name: 'Italy', capital: 'Rome', region: 'Europe', currency: 'EUR', language: 'it' },
  { alpha2: 'ES', alpha3: 'ESP', numeric: '724', name: 'Spain', capital: 'Madrid', region: 'Europe', currency: 'EUR', language: 'es' },
  { alpha2: 'IN', alpha3: 'IND', numeric: '356', name: 'India', capital: 'New Delhi', region: 'Asia', currency: 'INR', language: 'hi' },
  { alpha2: 'BR', alpha3: 'BRA', numeric: '076', name: 'Brazil', capital: 'Brasília', region: 'Americas', currency: 'BRL', language: 'pt' },
  { alpha2: 'RU', alpha3: 'RUS', numeric: '643', name: 'Russia', capital: 'Moscow', region: 'Europe', currency: 'RUB', language: 'ru' },
  { alpha2: 'AU', alpha3: 'AUS', numeric: '036', name: 'Australia', capital: 'Canberra', region: 'Oceania', currency: 'AUD', language: 'en' },
  { alpha2: 'MX', alpha3: 'MEX', numeric: '484', name: 'Mexico', capital: 'Mexico City', region: 'Americas', currency: 'MXN', language: 'es' },
  { alpha2: 'KR', alpha3: 'KOR', numeric: '410', name: 'South Korea', capital: 'Seoul', region: 'Asia', currency: 'KRW', language: 'ko' },
  { alpha2: 'SG', alpha3: 'SGP', numeric: '702', name: 'Singapore', capital: 'Singapore', region: 'Asia', currency: 'SGD', language: 'en' },
  { alpha2: 'HK', alpha3: 'HKG', numeric: '344', name: 'Hong Kong', capital: 'Hong Kong', region: 'Asia', currency: 'HKD', language: 'zh' },
  { alpha2: 'TW', alpha3: 'TWN', numeric: '158', name: 'Taiwan', capital: 'Taipei', region: 'Asia', currency: 'TWD', language: 'zh' },
  { alpha2: 'NL', alpha3: 'NLD', numeric: '528', name: 'Netherlands', capital: 'Amsterdam', region: 'Europe', currency: 'EUR', language: 'nl' },
  { alpha2: 'SE', alpha3: 'SWE', numeric: '752', name: 'Sweden', capital: 'Stockholm', region: 'Europe', currency: 'SEK', language: 'sv' },
];

export class Country {
  /**
   * List all countries.
   */
  static list(): CountryInfo[] {
    return [...COUNTRIES];
  }

  /**
   * Find by alpha-2 code.
   */
  static findByAlpha2(code: string): CountryInfo | null {
    return COUNTRIES.find((c) => c.alpha2 === code.toUpperCase()) ?? null;
  }

  /**
   * Find by alpha-3 code.
   */
  static findByAlpha3(code: string): CountryInfo | null {
    return COUNTRIES.find((c) => c.alpha3 === code.toUpperCase()) ?? null;
  }

  /**
   * Find by numeric code.
   */
  static findByNumeric(code: string): CountryInfo | null {
    return COUNTRIES.find((c) => c.numeric === code) ?? null;
  }

  /**
   * Find by name (case insensitive).
   */
  static findByName(name: string): CountryInfo | null {
    const lower = name.toLowerCase();
    return COUNTRIES.find((c) => c.name.toLowerCase() === lower) ?? null;
  }

  /**
   * List by region.
   */
  static listByRegion(region: string): CountryInfo[] {
    return COUNTRIES.filter((c) => c.region === region);
  }

  /**
   * Get flag emoji.
   */
  static flag(alpha2: string): string {
    if (alpha2.length !== 2) return '';
    const codePoints = alpha2.toUpperCase().split('').map((c) => 0x1f1e6 + (c.charCodeAt(0) - 'A'.charCodeAt(0)));
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Check if valid alpha-2.
   */
  static isValid(code: string): boolean {
    return Country.findByAlpha2(code) !== null;
  }
}

/**
 * VIN — Vehicle Identification Number
 *
 * Inspired by: vin-validator
 *
 * 17-char VIN, last 5 chars contain check digit.
 */

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const VIN_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

// WMI (World Manufacturer Identifier) - first 3 chars
const WMI_COUNTRY: Record<string, string> = {
  '1': 'USA', '2': 'Canada', '3': 'Mexico',
  'J': 'Japan', 'K': 'South Korea', 'L': 'China',
  'S': 'UK', 'V': 'France', 'W': 'Germany', 'Z': 'Italy',
  'Y': 'Sweden', '6': 'Australia',
};

export class VIN {
  /**
   * Validate VIN.
   */
  static isValid(vin: string): boolean {
    const v = vin.toUpperCase();
    if (v.length !== 17) return false;
    if (/[IOQ]/.test(v)) return false;
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const c = v[i];
      if (!(c in VIN_VALUES)) return false;
      sum += VIN_VALUES[c] * VIN_WEIGHTS[i];
    }
    return sum % 11 === 10 ? v[8] === 'X' : v[8] === String(sum % 11);
  }

  /**
   * Get country from WMI.
   */
  static getCountry(vin: string): string {
    if (vin.length < 1) return '';
    return WMI_COUNTRY[vin[0].toUpperCase()] ?? '';
  }

  /**
   * Get manufacturer (WMI).
   */
  static getManufacturer(vin: string): string {
    return vin.slice(0, 3).toUpperCase();
  }

  /**
   * Get model year.
   */
  static getYear(vin: string): number | null {
    if (vin.length < 10) return null;
    const code = vin[9].toUpperCase();
    const years: Record<string, number> = {
      A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017, J: 2018, K: 2019,
      L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025, T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
      '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
    };
    return years[code] ?? null;
  }

  /**
   * Get plant code (char 11).
   */
  static getPlantCode(vin: string): string {
    if (vin.length < 11) return '';
    return vin[10].toUpperCase();
  }

  /**
   * Get serial number (chars 12-17).
   */
  static getSerial(vin: string): string {
    return vin.slice(11, 17).toUpperCase();
  }
}

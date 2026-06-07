/**
 * RomanNumeral — Roman numeral conversion
 */

const ROMAN_VALUES: Array<[string, number]> = [
  ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
  ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
  ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
];

export class RomanNumeral {
  /**
   * Convert integer to Roman numeral.
   */
  static toRoman(n: number): string {
    if (n < 1 || n > 3999) throw new Error('Out of range (1-3999)');
    let result = '';
    let rem = n;
    for (const [sym, val] of ROMAN_VALUES) {
      while (rem >= val) {
        result += sym;
        rem -= val;
      }
    }
    return result;
  }

  /**
   * Convert Roman numeral to integer.
   */
  static fromRoman(s: string): number {
    if (!/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(s)) {
      throw new Error('Invalid Roman numeral');
    }
    let result = 0;
    let i = 0;
    const upper = s.toUpperCase();
    while (i < upper.length) {
      const two = upper.substring(i, i + 2);
      const twoVal = ROMAN_VALUES.find(([sym]) => sym === two)?.[1];
      if (twoVal !== undefined) {
        result += twoVal;
        i += 2;
      } else {
        const one = upper[i];
        const oneVal = ROMAN_VALUES.find(([sym]) => sym === one)?.[1];
        if (oneVal !== undefined) {
          result += oneVal;
          i += 1;
        } else {
          throw new Error('Invalid Roman numeral');
        }
      }
    }
    return result;
  }

  /**
   * Validate Roman numeral string.
   */
  static isValid(s: string): boolean {
    try { RomanNumeral.fromRoman(s); return true; } catch { return false; }
  }

  /**
   * Get symbols used.
   */
  static getSymbols(s: string): Set<string> {
    return new Set(s.toUpperCase().split(''));
  }
}

/**
 * NumberBase — number base conversion
 */

export class NumberBase {
  /**
   * Convert number to string in given base.
   */
  static toBase(n: number, base: number): string {
    if (base < 2 || base > 36) throw new Error('Base out of range');
    if (n === 0) return '0';
    const neg = n < 0;
    let x = Math.abs(Math.floor(n));
    let result = '';
    while (x > 0) {
      const d = x % base;
      result = (d < 10 ? String(d) : String.fromCharCode(55 + d)) + result;
      x = Math.floor(x / base);
    }
    return neg ? '-' + result : result;
  }

  /**
   * Convert string in given base to number.
   */
  static fromBase(s: string, base: number): number {
    if (base < 2 || base > 36) throw new Error('Base out of range');
    return parseInt(s, base);
  }

  /**
   * Convert between bases.
   */
  static convert(s: string, fromBase: number, toBase: number): string {
    const n = NumberBase.fromBase(s, fromBase);
    return NumberBase.toBase(n, toBase);
  }

  /**
   * Get digits of n in given base.
   */
  static digits(n: number, base: number = 10): number[] {
    if (n === 0) return [0];
    const x = Math.abs(Math.floor(n));
    const r: number[] = [];
    let v = x;
    while (v > 0) {
      r.unshift(v % base);
      v = Math.floor(v / base);
    }
    return r;
  }

  /**
   * Pad to given width.
   */
  static pad(s: string, width: number, char: string = '0'): string {
    return s.length >= width ? s : char.repeat(width - s.length) + s;
  }

  /**
   * Format with prefix (0x, 0b, 0o).
   */
  static format(n: number, base: number, prefix: boolean = true): string {
    const s = NumberBase.toBase(n, base);
    if (!prefix) return s;
    if (base === 16) return '0x' + s.toUpperCase();
    if (base === 2) return '0b' + s;
    if (base === 8) return '0o' + s;
    return s;
  }

  /**
   * Parse string with optional prefix.
   */
  static parse(s: string, base: number = 10): number {
    let clean = s.trim();
    if (clean.startsWith('0x') || clean.startsWith('0X')) return parseInt(clean.slice(2), 16);
    if (clean.startsWith('0b') || clean.startsWith('0B')) return parseInt(clean.slice(2), 2);
    if (clean.startsWith('0o') || clean.startsWith('0O')) return parseInt(clean.slice(2), 8);
    return parseInt(clean, base);
  }
}

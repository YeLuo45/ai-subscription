/**
 * Fraction — rational number arithmetic
 */

export class Fraction {
  num: number;
  den: number;

  constructor(num: number, den: number = 1) {
    if (den === 0) throw new Error('Division by zero');
    if (den < 0) { num = -num; den = -den; }
    const g = Fraction._gcd(Math.abs(num), den);
    this.num = num / g;
    this.den = den / g;
  }

  static fromDecimal(d: number, precision: number = 1e10): Fraction {
    if (Number.isInteger(d)) return new Fraction(d);
    const sign = d < 0 ? -1 : 1;
    const abs = Math.abs(d);
    let n = abs;
    let den = 1;
    while (Math.abs(n - Math.round(n)) > 1 / precision) {
      n *= 10;
      den *= 10;
    }
    return new Fraction(sign * Math.round(n), den);
  }

  private static _gcd(a: number, b: number): number {
    while (b !== 0) { [a, b] = [b, a % b]; }
    return a;
  }

  add(other: Fraction): Fraction {
    return new Fraction(this.num * other.den + other.num * this.den, this.den * other.den);
  }

  subtract(other: Fraction): Fraction {
    return new Fraction(this.num * other.den - other.num * this.den, this.den * other.den);
  }

  multiply(other: Fraction): Fraction {
    return new Fraction(this.num * other.num, this.den * other.den);
  }

  divide(other: Fraction): Fraction {
    if (other.num === 0) throw new Error('Division by zero');
    return new Fraction(this.num * other.den, this.den * other.num);
  }

  negate(): Fraction { return new Fraction(-this.num, this.den); }
  inverse(): Fraction { return new Fraction(this.den, this.num); }

  toNumber(): number { return this.num / this.den; }

  equals(other: Fraction): boolean {
    return this.num === other.num && this.den === other.den;
  }

  isInteger(): boolean { return this.den === 1; }

  toString(): string {
    if (this.den === 1) return `${this.num}`;
    return `${this.num}/${this.den}`;
  }

  /**
   * Power (integer).
   */
  pow(n: number): Fraction {
    if (n >= 0) {
      return new Fraction(this.num ** n, this.den ** n);
    }
    return new Fraction(this.den ** (-n), this.num ** (-n));
  }
}

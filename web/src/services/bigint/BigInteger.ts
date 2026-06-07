/**
 * BigInteger — big integer arithmetic using BigInt
 */

export class BigInteger {
  private _value: bigint;

  constructor(value: number | string | bigint) {
    this._value = typeof value === 'bigint' ? value : BigInt(value);
  }

  static zero(): BigInteger { return new BigInteger(0); }
  static one(): BigInteger { return new BigInteger(1); }

  add(other: BigInteger): BigInteger { return new BigInteger(this._value + other._value); }
  subtract(other: BigInteger): BigInteger { return new BigInteger(this._value - other._value); }
  multiply(other: BigInteger): BigInteger { return new BigInteger(this._value * other._value); }
  divide(other: BigInteger): BigInteger {
    if (other._value === 0n) throw new Error('Division by zero');
    return new BigInteger(this._value / other._value);
  }
  mod(other: BigInteger): BigInteger { return new BigInteger(this._value % other._value); }
  negate(): BigInteger { return new BigInteger(-this._value); }
  abs(): BigInteger { return new BigInteger(this._value < 0n ? -this._value : this._value); }

  /**
   * Power (non-negative integer).
   */
  pow(n: number): BigInteger {
    if (n < 0) throw new Error('Negative exponent');
    return new BigInteger(this._value ** BigInt(n));
  }

  /**
   * Greatest common divisor.
   */
  static gcd(a: BigInteger, b: BigInteger): BigInteger {
    let x = a._value < 0n ? -a._value : a._value;
    let y = b._value < 0n ? -b._value : b._value;
    while (y !== 0n) { [x, y] = [y, x % y]; }
    return new BigInteger(x);
  }

  /**
   * Least common multiple.
   */
  static lcm(a: BigInteger, b: BigInteger): BigInteger {
    if (a._value === 0n || b._value === 0n) return BigInteger.zero();
    return new BigInteger((a._value * b._value) / BigInteger.gcd(a, b)._value);
  }

  /**
   * Factorial.
   */
  static factorial(n: number): BigInteger {
    if (n < 0) throw new Error('Negative factorial');
    let r = 1n;
    for (let i = 2; i <= n; i++) r *= BigInt(i);
    return new BigInteger(r);
  }

  /**
   * Check if prime (trial division).
   */
  isPrime(): boolean {
    if (this._value < 2n) return false;
    if (this._value === 2n || this._value === 3n) return true;
    if (this._value % 2n === 0n) return false;
    let i = 3n;
    while (i * i <= this._value) {
      if (this._value % i === 0n) return false;
      i += 2n;
    }
    return true;
  }

  /**
   * Check if power of 2.
   */
  isPowerOfTwo(): boolean {
    if (this._value < 1n) return false;
    return (this._value & (this._value - 1n)) === 0n;
  }

  /**
   * Number of bits.
   */
  bitLength(): number {
    return this._value.toString(2).length;
  }

  /**
   * Convert to number (may lose precision).
   */
  toNumber(): number { return Number(this._value); }

  toString(): string { return this._value.toString(); }

  toStringBase(base: number): string { return this._value.toString(base); }

  equals(other: BigInteger): boolean { return this._value === other._value; }
  isZero(): boolean { return this._value === 0n; }
  isNegative(): boolean { return this._value < 0n; }
  isPositive(): boolean { return this._value > 0n; }

  compare(other: BigInteger): number {
    if (this._value < other._value) return -1;
    if (this._value > other._value) return 1;
    return 0;
  }
}

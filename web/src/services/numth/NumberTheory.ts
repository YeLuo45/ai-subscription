/**
 * NumberTheory — number theory utilities
 */

export class NumberTheory {
  /**
   * GCD (Euclidean).
   */
  static gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) { [a, b] = [b, a % b]; }
    return a;
  }

  /**
   * LCM.
   */
  static lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / NumberTheory.gcd(a, b);
  }

  /**
   * GCD of array.
   */
  static gcdArray(arr: number[]): number {
    return arr.reduce((g, n) => NumberTheory.gcd(g, n), arr[0] ?? 0);
  }

  /**
   * LCM of array.
   */
  static lcmArray(arr: number[]): number {
    return arr.reduce((l, n) => NumberTheory.lcm(l, n), 1);
  }

  /**
   * Primality test.
   */
  static isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n < 4) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  /**
   * Prime factorization.
   */
  static factorize(n: number): Map<number, number> {
    const factors = new Map<number, number>();
    let x = n;
    while (x % 2 === 0) {
      factors.set(2, (factors.get(2) ?? 0) + 1);
      x /= 2;
    }
    for (let i = 3; i * i <= x; i += 2) {
      while (x % i === 0) {
        factors.set(i, (factors.get(i) ?? 0) + 1);
        x /= i;
      }
    }
    if (x > 1) factors.set(x, (factors.get(x) ?? 0) + 1);
    return factors;
  }

  /**
   * First n primes.
   */
  static primes(n: number): number[] {
    const result: number[] = [];
    let candidate = 2;
    while (result.length < n) {
      if (NumberTheory.isPrime(candidate)) result.push(candidate);
      candidate++;
    }
    return result;
  }

  /**
   * Sieve of Eratosthenes.
   */
  static sieve(limit: number): boolean[] {
    const isPrime = new Array(limit + 1).fill(true);
    isPrime[0] = isPrime[1] = false;
    for (let i = 2; i * i <= limit; i++) {
      if (isPrime[i]) {
        for (let j = i * i; j <= limit; j += i) isPrime[j] = false;
      }
    }
    return isPrime;
  }

  /**
   * Euler totient.
   */
  static totient(n: number): number {
    let result = n;
    let x = n;
    for (let p = 2; p * p <= x; p++) {
      if (x % p === 0) {
        while (x % p === 0) x /= p;
        result -= result / p;
      }
    }
    if (x > 1) result -= result / x;
    return result;
  }

  /**
   * Modular exponentiation.
   */
  static modPow(base: number, exp: number, mod: number): number {
    let result = 1;
    let b = base % mod;
    let e = exp;
    while (e > 0) {
      if (e % 2 === 1) result = (result * b) % mod;
      b = (b * b) % mod;
      e = Math.floor(e / 2);
    }
    return result;
  }

  /**
   * Divisors of n.
   */
  static divisors(n: number): number[] {
    const r: number[] = [];
    for (let i = 1; i * i <= n; i++) {
      if (n % i === 0) {
        r.push(i);
        if (i !== n / i) r.push(n / i);
      }
    }
    return r.sort((a, b) => a - b);
  }
}

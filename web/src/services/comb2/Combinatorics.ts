/**
 * Combinatorics — counting principles
 */

export class Combinatorics {
  /**
   * Factorial.
   */
  static factorial(n: number): number {
    if (n < 0) throw new Error('Negative factorial');
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  /**
   * Permutation count: P(n, k).
   */
  static perm(n: number, k: number): number {
    if (k > n || k < 0) return 0;
    let r = 1;
    for (let i = 0; i < k; i++) r *= n - i;
    return r;
  }

  /**
   * Combination count: C(n, k).
   */
  static comb(n: number, k: number): number {
    if (k > n || k < 0) return 0;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return Math.round(r);
  }

  /**
   * Multinomial coefficient: n! / (k1! * k2! * ...).
   */
  static multinomial(n: number, k: number[]): number {
    let num = Combinatorics.factorial(n);
    let den = 1;
    for (const ki of k) den *= Combinatorics.factorial(ki);
    return Math.round(num / den);
  }

  /**
   * Catalan number: C_n = C(2n, n) / (n+1).
   */
  static catalan(n: number): number {
    return Math.round(Combinatorics.comb(2 * n, n) / (n + 1));
  }

  /**
   * Stirling number of second kind S(n, k) (recursive).
   */
  static stirling2(n: number, k: number): number {
    if (k === 0) return n === 0 ? 1 : 0;
    if (k > n) return 0;
    if (k === n) return 1;
    return k * Combinatorics.stirling2(n - 1, k) + Combinatorics.stirling2(n - 1, k - 1);
  }

  /**
   * Bell number (sum of Stirling2).
   */
  static bell(n: number): number {
    let sum = 0;
    for (let k = 0; k <= n; k++) sum += Combinatorics.stirling2(n, k);
    return sum;
  }

  /**
   * Derangements D(n).
   */
  static derangement(n: number): number {
    if (n === 0) return 1;
    if (n === 1) return 0;
    let prev2 = 1;  // D(0)
    let prev1 = 0;  // D(1)
    for (let i = 2; i <= n; i++) {
      const cur = (i - 1) * (prev1 + prev2);
      prev2 = prev1;
      prev1 = cur;
    }
    return prev1;
  }

  /**
   * Partition count (number of ways to write n as sum of positive integers).
   * Recursive with memoization.
   */
  static partitions(n: number): number {
    const memo = new Map<string, number>();
    function p(n: number, k: number): number {
      if (n === 0) return 1;
      if (k === 0) return 0;
      const key = `${n},${k}`;
      if (memo.has(key)) return memo.get(key)!;
      let result = 0;
      if (n >= k) result += p(n - k, k);
      result += p(n, k - 1);
      memo.set(key, result);
      return result;
    }
    return p(n, n);
  }
}

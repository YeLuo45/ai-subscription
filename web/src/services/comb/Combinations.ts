/**
 * Combinations — combination generation
 */

export class Combinations {
  /**
   * All k-combinations of array.
   */
  static of<T>(arr: T[], k: number): T[][] {
    if (k > arr.length || k < 0) return [];
    if (k === 0) return [[]];
    const result: T[][] = [];
    for (let i = 0; i <= arr.length - k; i++) {
      const head = arr[i];
      const tail = arr.slice(i + 1);
      for (const c of Combinations.of(tail, k - 1)) {
        result.push([head, ...c]);
      }
    }
    return result;
  }

  /**
   * Number of combinations C(n, k) = n! / (k!(n-k)!).
   */
  static count(n: number, k: number): number {
    if (k > n || k < 0) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return Math.round(result);
  }

  /**
   * Power set (all subsets).
   */
  static powerSet<T>(arr: T[]): T[][] {
    const result: T[][] = [[]];
    for (const item of arr) {
      const len = result.length;
      for (let i = 0; i < len; i++) {
        result.push([...result[i], item]);
      }
    }
    return result;
  }

  /**
   * Multiset combinations (with repetition).
   */
  static withRepetition<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const head = arr[i];
      for (const c of Combinations.withRepetition(arr.slice(i), k - 1)) {
        result.push([head, ...c]);
      }
    }
    return result;
  }
}

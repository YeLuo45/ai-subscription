/**
 * Permutations — permutation generation
 */

export class Permutations {
  /**
   * All permutations of array.
   */
  static all<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr.slice()];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of Permutations.all(rest)) {
        result.push([arr[i], ...p]);
      }
    }
    return result;
  }

  /**
   * Permutations of length k.
   */
  static ofLength<T>(arr: T[], k: number): T[][] {
    if (k > arr.length) return [];
    if (k === 0) return [[]];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of Permutations.ofLength(rest, k - 1)) {
        result.push([arr[i], ...p]);
      }
    }
    return result;
  }

  /**
   * Number of permutations P(n, k) = n! / (n-k)!
   */
  static count(n: number, k: number = n): number {
    if (k > n || k < 0) return 0;
    let result = 1;
    for (let i = 0; i < k; i++) result *= n - i;
    return result;
  }

  /**
   * Next lexicographic permutation.
   * Mutates array. Returns false if no more.
   */
  static next<T>(arr: T[]): boolean {
    let i = arr.length - 2;
    while (i >= 0) {
      const a = arr[i] as any;
      const b = arr[i + 1] as any;
      if (a < b) break;
      i--;
    }
    if (i < 0) return false;
    let j = arr.length - 1;
    while ((arr[j] as any) <= (arr[i] as any)) j--;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    arr.splice(i + 1, arr.length - i - 1, ...arr.slice(i + 1).reverse());
    return true;
  }

  /**
   * Generate all permutations iteratively using next().
   */
  static iterate<T>(arr: T[]): T[][] {
    const sorted = [...arr].sort();
    const result: T[][] = [[...sorted]];
    while (Permutations.next(sorted)) {
      result.push([...sorted]);
    }
    return result;
  }
}

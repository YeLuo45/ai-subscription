/**
 * Search — search algorithms
 */

export class Search {
  /**
   * Linear search. Returns index or -1.
   */
  static linear<T>(arr: T[], target: T): number {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === target) return i;
    }
    return -1;
  }

  /**
   * Binary search (iterative, sorted array).
   */
  static binary<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): number {
    let lo = 0;
    let hi = arr.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = cmp(arr[mid], target);
      if (c === 0) return mid;
      if (c < 0) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  /**
   * Binary search (recursive).
   */
  static binaryRecursive<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): number {
    return Search._binRec(arr, target, 0, arr.length - 1, cmp);
  }
  private static _binRec<T>(arr: T[], target: T, lo: number, hi: number, cmp: (a: T, b: T) => number): number {
    if (lo > hi) return -1;
    const mid = (lo + hi) >> 1;
    const c = cmp(arr[mid], target);
    if (c === 0) return mid;
    if (c < 0) return Search._binRec(arr, target, mid + 1, hi, cmp);
    return Search._binRec(arr, target, lo, mid - 1, cmp);
  }

  /**
   * Lower bound: first index where arr[i] >= target.
   */
  static lowerBound<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cmp(arr[mid], target) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Upper bound: first index where arr[i] > target.
   */
  static upperBound<T>(arr: T[], target: T, cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cmp(arr[mid], target) <= 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Jump search.
   */
  static jump<T>(arr: T[], target: T, step: number = 5): number {
    const n = arr.length;
    let prev = 0;
    let curr = Math.min(step, n) - 1;
    while (curr < n && arr[curr] < (target as any)) {
      prev = curr;
      curr = Math.min(curr + step, n) - 1;
    }
    for (let i = prev; i <= curr; i++) {
      if (arr[i] === target) return i;
    }
    return -1;
  }

  /**
   * Interpolation search (for uniform distributed data).
   */
  static interpolation(arr: number[], target: number): number {
    let lo = 0;
    let hi = arr.length - 1;
    while (lo <= hi && target >= arr[lo] && target <= arr[hi]) {
      if (lo === hi) return arr[lo] === target ? lo : -1;
      const pos = lo + Math.floor(((target - arr[lo]) * (hi - lo)) / (arr[hi] - arr[lo]));
      if (arr[pos] === target) return pos;
      if (arr[pos] < target) lo = pos + 1;
      else hi = pos - 1;
    }
    return -1;
  }

  /**
   * Find all occurrences (sorted array).
   */
  static findAll<T>(arr: T[], target: T): number[] {
    const lo = Search.lowerBound(arr, target);
    const hi = Search.upperBound(arr, target);
    if (lo === hi) return [];
    return Array.from({ length: hi - lo }, (_, i) => lo + i);
  }
}

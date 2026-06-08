/**
 * Sorting — sorting algorithms
 */

export class Sorting {
  /**
   * Bubble sort.
   */
  static bubble<T>(arr: T[], cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): T[] {
    const a = [...arr];
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a.length - i - 1; j++) {
        if (cmp(a[j], a[j + 1]) > 0) [a[j], a[j + 1]] = [a[j + 1], a[j]];
      }
    }
    return a;
  }

  /**
   * Selection sort.
   */
  static selection<T>(arr: T[], cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): T[] {
    const a = [...arr];
    for (let i = 0; i < a.length; i++) {
      let minIdx = i;
      for (let j = i + 1; j < a.length; j++) {
        if (cmp(a[j], a[minIdx]) < 0) minIdx = j;
      }
      if (minIdx !== i) [a[i], a[minIdx]] = [a[minIdx], a[i]];
    }
    return a;
  }

  /**
   * Insertion sort.
   */
  static insertion<T>(arr: T[], cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): T[] {
    const a = [...arr];
    for (let i = 1; i < a.length; i++) {
      const cur = a[i];
      let j = i - 1;
      while (j >= 0 && cmp(a[j], cur) > 0) {
        a[j + 1] = a[j];
        j--;
      }
      a[j + 1] = cur;
    }
    return a;
  }

  /**
   * Merge sort.
   */
  static merge<T>(arr: T[], cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): T[] {
    if (arr.length <= 1) return [...arr];
    const mid = arr.length >> 1;
    const left = Sorting.merge(arr.slice(0, mid), cmp);
    const right = Sorting.merge(arr.slice(mid), cmp);
    return Sorting._merge(left, right, cmp);
  }
  private static _merge<T>(a: T[], b: T[], cmp: (a: T, b: T) => number): T[] {
    const r: T[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (cmp(a[i], b[j]) <= 0) r.push(a[i++]);
      else r.push(b[j++]);
    }
    while (i < a.length) r.push(a[i++]);
    while (j < b.length) r.push(b[j++]);
    return r;
  }

  /**
   * Quick sort.
   */
  static quick<T>(arr: T[], cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): T[] {
    const a = [...arr];
    Sorting._quick(a, 0, a.length - 1, cmp);
    return a;
  }
  private static _quick<T>(a: T[], lo: number, hi: number, cmp: (a: T, b: T) => number): void {
    if (lo >= hi) return;
    const pivot = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      if (cmp(a[j], pivot) <= 0) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    const p = i + 1;
    Sorting._quick(a, lo, p - 1, cmp);
    Sorting._quick(a, p + 1, hi, cmp);
  }

  /**
   * Heap sort.
   */
  static heap<T>(arr: T[], cmp: (a: T, b: T) => number = (a, b) => (a as any) - (b as any)): T[] {
    const a = [...arr];
    const n = a.length;
    for (let i = (n >> 1) - 1; i >= 0; i--) Sorting._heapify(a, n, i, cmp);
    for (let i = n - 1; i > 0; i--) {
      [a[0], a[i]] = [a[i], a[0]];
      Sorting._heapify(a, i, 0, cmp);
    }
    return a;
  }
  private static _heapify<T>(a: T[], n: number, i: number, cmp: (a: T, b: T) => number): void {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < n && cmp(a[l], a[largest]) > 0) largest = l;
    if (r < n && cmp(a[r], a[largest]) > 0) largest = r;
    if (largest !== i) {
      [a[i], a[largest]] = [a[largest], a[i]];
      Sorting._heapify(a, n, largest, cmp);
    }
  }
}

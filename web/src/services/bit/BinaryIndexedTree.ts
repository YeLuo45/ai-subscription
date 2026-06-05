/**
 * BinaryIndexedTree — Fenwick tree
 *
 * Inspired by: Peter Fenwick 1994 paper
 *
 * 1-indexed array with O(log n) prefix sum queries and point updates.
 * Common uses: range sum queries, inversion count, prefix max.
 *
 * Supports:
 *   - update(i, delta): add delta to index i
 *   - prefixSum(i): sum of a[1..i]
 *   - rangeSum(l, r): sum of a[l..r]
 *   - build from initial array
 */

export class BinaryIndexedTree {
  private tree: number[] = [];
  private n: number = 0;

  constructor(size: number = 0) {
    this.n = size;
    this.tree = new Array(size + 1).fill(0);
  }

  /** Build from initial array (1-indexed input). */
  static from(arr: number[]): BinaryIndexedTree {
    const bit = new BinaryIndexedTree(arr.length);
    for (let i = 0; i < arr.length; i++) {
      bit.tree[i + 1] = arr[i];
    }
    for (let i = 1; i < bit.tree.length; i++) {
      const parent = i + (i & -i);
      if (parent < bit.tree.length) bit.tree[parent] += bit.tree[i];
    }
    return bit;
  }

  size(): number { return this.n; }

  /** Add delta to index i (1-indexed). */
  update(i: number, delta: number): void {
    if (i < 1 || i > this.n) throw new Error(`out of range: ${i}`);
    while (i <= this.n) {
      this.tree[i] += delta;
      i += i & -i;
    }
  }

  /** Sum of a[1..i]. */
  prefixSum(i: number): number {
    if (i < 0) return 0;
    if (i > this.n) i = this.n;
    let sum = 0;
    while (i > 0) {
      sum += this.tree[i];
      i -= i & -i;
    }
    return sum;
  }

  /** Sum of a[l..r] inclusive (1-indexed). */
  rangeSum(l: number, r: number): number {
    if (l > r) return 0;
    return this.prefixSum(r) - this.prefixSum(l - 1);
  }

  /** Set a[i] = value (compute delta from current). */
  set(i: number, value: number): void {
    const current = this.rangeSum(i, i);
    this.update(i, value - current);
  }

  /** Lower bound: smallest i such that prefixSum(i) >= target. */
  lowerBound(target: number): number {
    if (target <= 0) return 1;
    let pos = 0;
    let sum = 0;
    for (let log = Math.floor(Math.log2(this.n)); log >= 0; log--) {
      const next = pos + (1 << log);
      if (next <= this.n && sum + this.tree[next] < target) {
        sum += this.tree[next];
        pos = next;
      }
    }
    return pos + 1;
  }
}

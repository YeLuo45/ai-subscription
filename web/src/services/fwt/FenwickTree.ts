/**
 * FenwickTree — binary indexed tree (BIT)
 */

export class FenwickTree {
  private _tree: number[];
  private _n: number;

  constructor(n: number) {
    this._n = n;
    this._tree = new Array(n + 1).fill(0);
  }

  /**
   * Add delta to position idx (1-indexed).
   */
  update(idx: number, delta: number): void {
    while (idx <= this._n) {
      this._tree[idx] += delta;
      idx += idx & -idx;
    }
  }

  /**
   * Prefix sum [1..idx].
   */
  query(idx: number): number {
    let s = 0;
    while (idx > 0) {
      s += this._tree[idx];
      idx -= idx & -idx;
    }
    return s;
  }

  /**
   * Range sum [l..r] (1-indexed inclusive).
   */
  rangeQuery(l: number, r: number): number {
    return this.query(r) - this.query(l - 1);
  }

  /**
   * Build from 1-indexed array.
   */
  static fromArray(arr: number[]): FenwickTree {
    const ft = new FenwickTree(arr.length);
    for (let i = 0; i < arr.length; i++) ft.update(i + 1, arr[i]);
    return ft;
  }

  size(): number { return this._n; }
}

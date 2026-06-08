/**
 * SegmentTree — range sum query + point update
 */

export class SegmentTree {
  private _n: number;
  private _tree: number[];
  private _op: 'sum' | 'max' | 'min';

  constructor(arr: number[], op: 'sum' | 'max' | 'min' = 'sum') {
    this._n = arr.length;
    this._op = op;
    this._tree = new Array(4 * this._n).fill(0);
    if (arr.length > 0) this._build(arr, 1, 0, this._n - 1);
  }

  private _build(arr: number[], node: number, l: number, r: number): void {
    if (l === r) {
      this._tree[node] = arr[l];
      return;
    }
    const mid = (l + r) >> 1;
    this._build(arr, 2 * node, l, mid);
    this._build(arr, 2 * node + 1, mid + 1, r);
    this._tree[node] = this._combine(this._tree[2 * node], this._tree[2 * node + 1]);
  }

  private _combine(a: number, b: number): number {
    if (this._op === 'sum') return a + b;
    if (this._op === 'max') return Math.max(a, b);
    return Math.min(a, b);
  }

  update(idx: number, value: number): void {
    this._update(1, 0, this._n - 1, idx, value);
  }
  private _update(node: number, l: number, r: number, idx: number, value: number): void {
    if (l === r) {
      this._tree[node] = value;
      return;
    }
    const mid = (l + r) >> 1;
    if (idx <= mid) this._update(2 * node, l, mid, idx, value);
    else this._update(2 * node + 1, mid + 1, r, idx, value);
    this._tree[node] = this._combine(this._tree[2 * node], this._tree[2 * node + 1]);
  }

  query(l: number, r: number): number {
    return this._query(1, 0, this._n - 1, l, r);
  }
  private _query(node: number, l: number, r: number, ql: number, qr: number): number {
    if (ql > r || qr < l) return this._identity();
    if (ql <= l && r <= qr) return this._tree[node];
    const mid = (l + r) >> 1;
    return this._combine(
      this._query(2 * node, l, mid, ql, qr),
      this._query(2 * node + 1, mid + 1, r, ql, qr),
    );
  }

  private _identity(): number {
    if (this._op === 'sum') return 0;
    if (this._op === 'max') return -Infinity;
    return Infinity;
  }

  size(): number { return this._n; }
}

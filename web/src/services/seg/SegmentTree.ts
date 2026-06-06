/**
 * SegmentTree — segment tree for range queries
 *
 * Inspired by: classic range query / range update data structure
 *
 * 1-indexed tree (conceptually). Each node stores an aggregate of a range.
 * Supports:
 *   - query(l, r): aggregate over [l, r]
 *   - update(i, value): point update
 *   - rangeUpdate(l, r, value): lazy range add/update
 *   - build from array
 *
 * O(log n) per op (with lazy propagation).
 */

type AggregateOp = (a: number, b: number) => number;
const SUM: AggregateOp = (a, b) => a + b;
const MAX: AggregateOp = (a, b) => Math.max(a, b);
const MIN: AggregateOp = (a, b) => Math.min(a, b);

export type SegmentOp = 'sum' | 'max' | 'min';

export class SegmentTree {
  private tree: number[] = [];
  private lazy: number[] = [];
  private data: number[] = [];
  private n: number = 0;
  private op: AggregateOp;

  constructor(arr: number[], mode: SegmentOp = 'sum') {
    this.data = [0, ...arr]; // 1-indexed
    this.n = arr.length;
    this.op = mode === 'sum' ? SUM : mode === 'max' ? MAX : MIN;
    this.tree = new Array(4 * this.n).fill(0);
    this.lazy = new Array(4 * this.n).fill(0);
    this.hasLazy = new Array(4 * this.n).fill(false);
    if (this.n > 0) this.build(1, 1, this.n);
  }

  private hasLazy: boolean[] = [];

  private build(node: number, l: number, r: number): void {
    if (l === r) {
      this.tree[node] = this.data[l];
      return;
    }
    const mid = (l + r) >> 1;
    this.build(node * 2, l, mid);
    this.build(node * 2 + 1, mid + 1, r);
    this.tree[node] = this.op(this.tree[node * 2], this.tree[node * 2 + 1]);
  }

  query(l: number, r: number): number {
    if (l > r) return this.op === SUM ? 0 : (this.op === MAX ? -Infinity : Infinity);
    return this.queryRange(1, 1, this.n, l, r);
  }

  private queryRange(node: number, l: number, r: number, ql: number, qr: number): number {
    this.pushDown(node, l, r);
    if (qr < l || r < ql) return this.op === SUM ? 0 : (this.op === MAX ? -Infinity : Infinity);
    if (ql <= l && r <= qr) return this.tree[node];
    const mid = (l + r) >> 1;
    return this.op(this.queryRange(node * 2, l, mid, ql, qr), this.queryRange(node * 2 + 1, mid + 1, r, ql, qr));
  }

  update(i: number, value: number): void {
    this.updatePoint(1, 1, this.n, i, value);
  }

  private updatePoint(node: number, l: number, r: number, i: number, value: number): void {
    this.pushDown(node, l, r);
    if (l === r) {
      this.tree[node] = value;
      this.data[i] = value;
      return;
    }
    const mid = (l + r) >> 1;
    if (i <= mid) this.updatePoint(node * 2, l, mid, i, value);
    else this.updatePoint(node * 2 + 1, mid + 1, r, i, value);
    this.tree[node] = this.op(this.tree[node * 2], this.tree[node * 2 + 1]);
  }

  rangeAdd(l: number, r: number, delta: number): void {
    this.rangeAddInternal(1, 1, this.n, l, r, delta);
  }

  private rangeAddInternal(node: number, l: number, r: number, ql: number, qr: number, delta: number): void {
    this.pushDown(node, l, r);
    if (qr < l || r < ql) return;
    if (ql <= l && r <= qr) {
      this.apply(node, l, r, delta);
      return;
    }
    const mid = (l + r) >> 1;
    this.rangeAddInternal(node * 2, l, mid, ql, qr, delta);
    this.rangeAddInternal(node * 2 + 1, mid + 1, r, ql, qr, delta);
    this.tree[node] = this.op(this.tree[node * 2], this.tree[node * 2 + 1]);
  }

  private apply(node: number, l: number, r: number, delta: number): void {
    if (this.op === SUM) {
      this.tree[node] += delta * (r - l + 1);
      this.lazy[node] += delta;
      this.hasLazy[node] = true;
    } else {
      this.tree[node] += delta;
    }
  }

  private pushDown(node: number, l: number, r: number): void {
    if (this.hasLazy[node] && this.op === SUM && l !== r) {
      const mid = (l + r) >> 1;
      this.apply(node * 2, l, mid, this.lazy[node]);
      this.apply(node * 2 + 1, mid + 1, r, this.lazy[node]);
      this.lazy[node] = 0;
      this.hasLazy[node] = false;
    }
  }
}

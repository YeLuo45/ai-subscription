/**
 * MinHeap — binary min-heap priority queue
 *
 * Inspired by: Java PriorityQueue / std::priority_queue
 *
 * Insert/extract-min in O(log n).
 * peek in O(1).
 *
 * Optional comparator for custom ordering.
 */

export type Comparator<T> = (a: T, b: T) => number;

export class MinHeap<T> {
  private data: T[] = [];
  private cmp: Comparator<T>;

  constructor(initial: T[] = [], comparator?: Comparator<T>) {
    this.cmp = comparator ?? ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (initial.length > 0) {
      this.data = [...initial];
      this.heapify();
    }
  }

  size(): number { return this.data.length; }
  isEmpty(): boolean { return this.data.length === 0; }
  peek(): T | undefined { return this.data[0]; }

  push(value: T): void {
    this.data.push(value);
    this.siftUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  /** Replace the top and re-heapify. */
  replace(value: T): T | undefined {
    if (this.data.length === 0) {
      this.push(value);
      return undefined;
    }
    const old = this.data[0];
    this.data[0] = value;
    this.siftDown(0);
    return old;
  }

  /** Heapify from array (Floyd's algorithm). */
  private heapify(): void {
    for (let i = Math.floor(this.data.length / 2) - 1; i >= 0; i--) {
      this.siftDown(i);
    }
  }

  private siftUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.cmp(this.data[idx], this.data[parent]) < 0) {
        this.swap(idx, parent);
        idx = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(idx: number): void {
    const n = this.data.length;
    while (true) {
      const left = idx * 2 + 1;
      const right = idx * 2 + 2;
      let smallest = idx;
      if (left < n && this.cmp(this.data[left], this.data[smallest]) < 0) smallest = left;
      if (right < n && this.cmp(this.data[right], this.data[smallest]) < 0) smallest = right;
      if (smallest === idx) break;
      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  private swap(i: number, j: number): void {
    [this.data[i], this.data[j]] = [this.data[j], this.data[i]];
  }

  toArray(): T[] { return [...this.data]; }
}

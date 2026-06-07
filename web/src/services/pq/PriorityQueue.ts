/**
 * PriorityQueue — min-heap based priority queue
 */

export class PriorityQueue<T> {
  private _heap: { value: T; priority: number }[] = [];
  private _comparator: (a: number, b: number) => number;

  constructor(comparator: 'min' | 'max' = 'min') {
    this._comparator = comparator === 'min'
      ? (a, b) => a - b
      : (a, b) => b - a;
  }

  size(): number { return this._heap.length; }
  isEmpty(): boolean { return this._heap.length === 0; }

  enqueue(value: T, priority: number): void {
    this._heap.push({ value, priority });
    this._siftUp(this._heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this._heap.length === 0) return undefined;
    const top = this._heap[0].value;
    const last = this._heap.pop()!;
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  peek(): T | undefined { return this._heap[0]?.value; }

  toArray(): T[] { return this._heap.map((e) => e.value); }

  private _siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._comparator(this._heap[i].priority, this._heap[parent].priority) < 0) {
        [this._heap[i], this._heap[parent]] = [this._heap[parent], this._heap[i]];
        i = parent;
      } else break;
    }
  }

  private _siftDown(i: number): void {
    const n = this._heap.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < n && this._comparator(this._heap[l].priority, this._heap[smallest].priority) < 0) smallest = l;
      if (r < n && this._comparator(this._heap[r].priority, this._heap[smallest].priority) < 0) smallest = r;
      if (smallest === i) break;
      [this._heap[i], this._heap[smallest]] = [this._heap[smallest], this._heap[i]];
      i = smallest;
    }
  }
}

/**
 * Queue — FIFO queue
 */

export class Queue<T> {
  private _items: T[] = [];

  enqueue(item: T): void { this._items.push(item); }
  dequeue(): T | undefined { return this._items.shift(); }
  peek(): T | undefined { return this._items[0]; }
  isEmpty(): boolean { return this._items.length === 0; }
  size(): number { return this._items.length; }
  clear(): void { this._items = []; }
  toArray(): T[] { return [...this._items]; }
  fromArray(arr: T[]): void { this._items = [...arr]; }
}

/**
 * Deque — double-ended queue
 */

export class Deque<T> {
  private _items: T[] = [];

  addFront(item: T): void { this._items.unshift(item); }
  addBack(item: T): void { this._items.push(item); }
  removeFront(): T | undefined { return this._items.shift(); }
  removeBack(): T | undefined { return this._items.pop(); }
  peekFront(): T | undefined { return this._items[0]; }
  peekBack(): T | undefined { return this._items[this._items.length - 1]; }
  isEmpty(): boolean { return this._items.length === 0; }
  size(): number { return this._items.length; }
  clear(): void { this._items = []; }
  toArray(): T[] { return [...this._items]; }
}

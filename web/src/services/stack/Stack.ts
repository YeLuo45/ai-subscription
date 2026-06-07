/**
 * Stack — LIFO stack
 */

export class Stack<T> {
  private _items: T[] = [];

  push(item: T): void { this._items.push(item); }
  pop(): T | undefined { return this._items.pop(); }
  peek(): T | undefined { return this._items[this._items.length - 1]; }
  isEmpty(): boolean { return this._items.length === 0; }
  size(): number { return this._items.length; }
  clear(): void { this._items = []; }
  toArray(): T[] { return [...this._items]; }
  fromArray(arr: T[]): void { this._items = [...arr]; }

  /**
   * Check if two stacks equal.
   */
  equals(other: Stack<T>): boolean {
    if (this.size() !== other.size()) return false;
    for (let i = 0; i < this._items.length; i++) {
      if (this._items[i] !== other._items[i]) return false;
    }
    return true;
  }
}

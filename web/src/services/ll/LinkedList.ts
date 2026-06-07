/**
 * LinkedList — doubly linked list
 */

class Node<T> {
  value: T;
  prev: Node<T> | null = null;
  next: Node<T> | null = null;
  constructor(value: T) { this.value = value; }
}

export class LinkedList<T> {
  private _head: Node<T> | null = null;
  private _tail: Node<T> | null = null;
  private _size = 0;

  size(): number { return this._size; }

  isEmpty(): boolean { return this._size === 0; }

  prepend(value: T): void {
    const n = new Node(value);
    if (this._head) {
      n.next = this._head;
      this._head.prev = n;
      this._head = n;
    } else {
      this._head = this._tail = n;
    }
    this._size++;
  }

  append(value: T): void {
    const n = new Node(value);
    if (this._tail) {
      n.prev = this._tail;
      this._tail.next = n;
      this._tail = n;
    } else {
      this._head = this._tail = n;
    }
    this._size++;
  }

  getFirst(): T | null { return this._head?.value ?? null; }
  getLast(): T | null { return this._tail?.value ?? null; }

  removeFirst(): T | null {
    if (!this._head) return null;
    const v = this._head.value;
    this._head = this._head.next;
    if (this._head) this._head.prev = null;
    else this._tail = null;
    this._size--;
    return v;
  }

  removeLast(): T | null {
    if (!this._tail) return null;
    const v = this._tail.value;
    this._tail = this._tail.prev;
    if (this._tail) this._tail.next = null;
    else this._head = null;
    this._size--;
    return v;
  }

  toArray(): T[] {
    const r: T[] = [];
    let cur = this._head;
    while (cur) { r.push(cur.value); cur = cur.next; }
    return r;
  }

  fromArray(arr: T[]): void {
    this._head = this._tail = null;
    this._size = 0;
    for (const v of arr) this.append(v);
  }

  reverse(): void {
    let cur = this._head;
    [this._head, this._tail] = [this._tail, this._head];
    while (cur) {
      [cur.next, cur.prev] = [cur.prev, cur.next];
      cur = cur.prev;
    }
  }

  clear(): void {
    this._head = this._tail = null;
    this._size = 0;
  }

  contains(value: T): boolean {
    let cur = this._head;
    while (cur) {
      if (cur.value === value) return true;
      cur = cur.next;
    }
    return false;
  }
}

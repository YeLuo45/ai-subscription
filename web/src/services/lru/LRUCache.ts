/**
 * LRUCache — least recently used cache
 */

class CacheNode<K, V> {
  key: K;
  value: V;
  prev: CacheNode<K, V> | null = null;
  next: CacheNode<K, V> | null = null;
  constructor(key: K, value: V) { this.key = key; this.value = value; }
}

export class LRUCache<K, V> {
  private _capacity: number;
  private _map = new Map<K, CacheNode<K, V>>();
  private _head: CacheNode<K, V> | null = null; // dummy
  private _tail: CacheNode<K, V> | null = null; // dummy
  private _size = 0;

  constructor(capacity: number = 10) {
    this._capacity = capacity;
    // Initialize dummy head/tail
    this._head = new CacheNode<K, V>(null as any, null as any);
    this._tail = new CacheNode<K, V>(null as any, null as any);
    this._head.next = this._tail;
    this._tail.prev = this._head;
  }

  size(): number { return this._size; }
  capacity(): number { return this._capacity; }

  get(key: K): V | undefined {
    const n = this._map.get(key);
    if (!n) return undefined;
    this._moveToFront(n);
    return n.value;
  }

  put(key: K, value: V): void {
    let n = this._map.get(key);
    if (n) {
      n.value = value;
      this._moveToFront(n);
    } else {
      n = new CacheNode(key, value);
      this._map.set(key, n);
      this._addToFront(n);
      this._size++;
      if (this._size > this._capacity) {
        const lru = this._tail!.prev!;
        this._remove(lru);
        this._map.delete(lru.key);
        this._size--;
      }
    }
  }

  has(key: K): boolean { return this._map.has(key); }

  keys(): K[] {
    const r: K[] = [];
    let cur = this._head!.next;
    while (cur !== this._tail) {
      r.push(cur!.key);
      cur = cur!.next;
    }
    return r;
  }

  private _addToFront(n: CacheNode<K, V>): void {
    n.next = this._head!.next;
    n.prev = this._head;
    this._head!.next!.prev = n;
    this._head!.next = n;
  }

  private _remove(n: CacheNode<K, V>): void {
    n.prev!.next = n.next;
    n.next!.prev = n.prev;
  }

  private _moveToFront(n: CacheNode<K, V>): void {
    this._remove(n);
    this._addToFront(n);
  }
}

/**
 * HashMap — hash table with separate chaining
 */

export class HashMap<K, V> {
  private _buckets: Array<Array<[K, V]>>;
  private _size = 0;
  private _capacity: number;
  private _loadFactor: number;

  constructor(initialCapacity: number = 16, loadFactor: number = 0.75) {
    this._capacity = initialCapacity;
    this._loadFactor = loadFactor;
    this._buckets = Array.from({ length: initialCapacity }, () => []);
  }

  private _hash(key: K): number {
    const s = String(key);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % this._capacity;
  }

  size(): number { return this._size; }
  isEmpty(): boolean { return this._size === 0; }

  set(key: K, value: V): void {
    if (this._size / this._capacity >= this._loadFactor) this._resize();
    const idx = this._hash(key);
    const bucket = this._buckets[idx];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === key) {
        bucket[i][1] = value;
        return;
      }
    }
    bucket.push([key, value]);
    this._size++;
  }

  get(key: K): V | undefined {
    const bucket = this._buckets[this._hash(key)];
    for (const [k, v] of bucket) {
      if (k === key) return v;
    }
    return undefined;
  }

  has(key: K): boolean { return this.get(key) !== undefined; }

  delete(key: K): boolean {
    const idx = this._hash(key);
    const bucket = this._buckets[idx];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === key) {
        bucket.splice(i, 1);
        this._size--;
        return true;
      }
    }
    return false;
  }

  keys(): K[] {
    const r: K[] = [];
    for (const b of this._buckets) for (const [k] of b) r.push(k);
    return r;
  }

  values(): V[] {
    const r: V[] = [];
    for (const b of this._buckets) for (const [, v] of b) r.push(v);
    return r;
  }

  entries(): Array<[K, V]> {
    const r: Array<[K, V]> = [];
    for (const b of this._buckets) for (const e of b) r.push(e);
    return r;
  }

  clear(): void {
    this._buckets = Array.from({ length: this._capacity }, () => []);
    this._size = 0;
  }

  private _resize(): void {
    const old = this._buckets;
    this._capacity *= 2;
    this._buckets = Array.from({ length: this._capacity }, () => []);
    this._size = 0;
    for (const b of old) {
      for (const [k, v] of b) this.set(k, v);
    }
  }
}

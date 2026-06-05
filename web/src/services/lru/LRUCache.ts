/**
 * LRUCache — Least Recently Used cache
 *
 * Map-based LRU with O(1) get/set via JS Map insertion-order semantics.
 * On access (get or set), the key moves to the end (most recently used).
 * When over capacity, the first key is evicted (least recently used).
 */

export class LRUCache<K, V> {
  private map: Map<K, V> = new Map();
  private capacity: number;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(capacity: number = 100) {
    if (capacity <= 0) throw new Error('capacity must be > 0');
    this.capacity = capacity;
  }

  /** Get value, marks as recently used. */
  get(key: K): V | undefined {
    if (!this.map.has(key)) {
      this.misses += 1;
      return undefined;
    }
    const value = this.map.get(key)!;
    // Re-insert to move to MRU end
    this.map.delete(key);
    this.map.set(key, value);
    this.hits += 1;
    return value;
  }

  /** Put value, marks as recently used. Evicts LRU if over capacity. */
  set(key: K, value: V): V {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      // Evict LRU (first key)
      const lruKey = this.map.keys().next().value;
      if (lruKey !== undefined) {
        this.map.delete(lruKey);
        this.evictions += 1;
      }
    }
    this.map.set(key, value);
    return value;
  }

  /** Check if key exists (without affecting order). */
  has(key: K): boolean {
    return this.map.has(key);
  }

  /** Delete a key. */
  delete(key: K): boolean {
    return this.map.delete(key);
  }

  /** Get current size. */
  size(): number {
    return this.map.size;
  }

  /** Get capacity. */
  getCapacity(): number {
    return this.capacity;
  }

  /** Resize capacity. Evicts from LRU if shrinking. */
  resize(newCapacity: number): void {
    if (newCapacity <= 0) throw new Error('capacity must be > 0');
    while (this.map.size > newCapacity) {
      const lruKey = this.map.keys().next().value;
      if (lruKey !== undefined) {
        this.map.delete(lruKey);
        this.evictions += 1;
      }
    }
    this.capacity = newCapacity;
  }

  /** Clear all entries. */
  clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /** Get all keys, LRU first. */
  keys(): K[] {
    return Array.from(this.map.keys());
  }

  /** Get all values, LRU first. */
  values(): V[] {
    return Array.from(this.map.values());
  }

  /** Most recently used key. */
  peekMRU(): K | undefined {
    let mru: K | undefined;
    for (const k of this.map.keys()) mru = k;
    return mru;
  }

  /** Least recently used key. */
  peekLRU(): K | undefined {
    return this.map.keys().next().value;
  }

  /** Get statistics. */
  stats(): { size: number; capacity: number; hits: number; misses: number; hitRate: number; evictions: number } {
    const total = this.hits + this.misses;
    return {
      size: this.map.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
    };
  }
}

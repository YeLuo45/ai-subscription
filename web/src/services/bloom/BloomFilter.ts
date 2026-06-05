/**
 * BloomFilter — probabilistic data structure
 *
 * Space-efficient set membership test:
 *   - add(item): definitely remember
 *   - mightContain(item): false = definitely not in set, true = probably in set
 *   - may yield false positives (configurable via size + hash count)
 *   - never yields false negatives
 *
 * Hash functions: 2 independent xxHash-style hashes with linear combinations
 * to derive k distinct hash positions (Kirsch-Mitzenmacher trick).
 */

export class BloomFilter {
  private bits: Uint8Array;
  private size: number;
  private hashCount: number;
  private itemCount: number;

  /**
   * @param expectedItems expected number of items
   * @param falsePositiveRate desired false positive rate (0-1, e.g., 0.01 = 1%)
   */
  constructor(expectedItems: number = 1000, falsePositiveRate: number = 0.01) {
    if (expectedItems <= 0) throw new Error('expectedItems must be > 0');
    if (falsePositiveRate <= 0 || falsePositiveRate >= 1) throw new Error('falsePositiveRate must be in (0, 1)');
    // Optimal size: -n * ln(p) / (ln 2)^2
    const size = Math.ceil(-expectedItems * Math.log(falsePositiveRate) / Math.pow(Math.log(2), 2));
    // Optimal hash count: (m/n) * ln 2
    const hashCount = Math.max(1, Math.round((size / expectedItems) * Math.log(2)));
    this.size = size;
    this.hashCount = hashCount;
    this.bits = new Uint8Array(Math.ceil(size / 8));
    this.itemCount = 0;
  }

  /**
   * Hash a string. Uses FNV-1a + DJB2 to produce two 32-bit hashes.
   * Returns [h1, h2].
   */
  private hash(item: string): [number, number] {
    let h1 = 2166136261;
    let h2 = 5381;
    for (let i = 0; i < item.length; i++) {
      const c = item.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 16777619);
      h2 = ((h2 << 5) + h2) + c;
      h2 = h2 | 0;
    }
    return [h1 >>> 0, h2 >>> 0];
  }

  /**
   * Get the k-th hash position from two base hashes.
   * h_i = h1 + i * h2
   */
  private getHash(i: number, h1: number, h2: number): number {
    return Math.abs((h1 + i * h2) % this.size);
  }

  private setBit(pos: number): void {
    const byteIdx = Math.floor(pos / 8);
    const bitIdx = pos % 8;
    this.bits[byteIdx] |= (1 << bitIdx);
  }

  private getBit(pos: number): boolean {
    const byteIdx = Math.floor(pos / 8);
    const bitIdx = pos % 8;
    return (this.bits[byteIdx] & (1 << bitIdx)) !== 0;
  }

  /**
   * Add an item to the filter.
   */
  add(item: string): void {
    const [h1, h2] = this.hash(item);
    for (let i = 0; i < this.hashCount; i++) {
      this.setBit(this.getHash(i, h1, h2));
    }
    this.itemCount += 1;
  }

  /**
   * Test if item might be in the filter.
   * Returns false if definitely not in set.
   * Returns true if probably in set (might be false positive).
   */
  mightContain(item: string): boolean {
    const [h1, h2] = this.hash(item);
    for (let i = 0; i < this.hashCount; i++) {
      if (!this.getBit(this.getHash(i, h1, h2))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Add many items.
   */
  addAll(items: string[]): void {
    for (const item of items) this.add(item);
  }

  /**
   * Check many items.
   */
  containsAll(items: string[]): boolean[] {
    return items.map((item) => this.mightContain(item));
  }

  /**
   * Estimated false positive rate based on current fill.
   * p = (1 - e^(-kn/m))^k
   */
  estimatedFalsePositiveRate(): number {
    const k = this.hashCount;
    const n = this.itemCount;
    const m = this.size;
    return Math.pow(1 - Math.exp((-k * n) / m), k);
  }

  /**
   * Get statistics.
   */
  stats(): { size: number; hashCount: number; itemCount: number; bitsSet: number; fillRatio: number; estimatedFPR: number } {
    let bitsSet = 0;
    for (const byte of this.bits) {
      let n = byte;
      while (n > 0) {
        bitsSet += n & 1;
        n >>= 1;
      }
    }
    return {
      size: this.size,
      hashCount: this.hashCount,
      itemCount: this.itemCount,
      bitsSet,
      fillRatio: bitsSet / this.size,
      estimatedFPR: this.estimatedFalsePositiveRate(),
    };
  }

  /**
   * Serialize the bit array as a base64 string.
   */
  serialize(): string {
    // Convert to binary string
    let bin = '';
    for (const byte of this.bits) {
      bin += byte.toString(2).padStart(8, '0');
    }
    // Use btoa (browser) or Buffer (node)
    if (typeof btoa !== 'undefined') return btoa(bin);
    return Buffer.from(bin, 'binary').toString('base64');
  }

  /**
   * Create a BloomFilter from a serialized string.
   */
  static fromSerialized(serialized: string, size: number, hashCount: number, itemCount: number): BloomFilter {
    const f = new BloomFilter();
    f.size = size;
    f.hashCount = hashCount;
    f.itemCount = itemCount;
    const bin = typeof atob !== 'undefined' ? atob(serialized) : Buffer.from(serialized, 'base64').toString('binary');
    f.bits = new Uint8Array(Math.ceil(size / 8));
    for (let i = 0; i < bin.length && i * 8 < size; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        const bit = bin[i * 8 + j] === '1' ? 1 : 0;
        byte = (byte << 1) | bit;
      }
      f.bits[i] = byte;
    }
    return f;
  }
}

/**
 * BloomFilter — probabilistic set membership
 */

export class BloomFilter {
  private _bits: boolean[];
  private _hashCount: number;
  private _size: number;

  constructor(size: number = 1000, hashCount: number = 3) {
    this._size = size;
    this._hashCount = hashCount;
    this._bits = new Array(size).fill(false);
  }

  private _hash(s: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % this._size;
  }

  add(item: string): void {
    for (let i = 0; i < this._hashCount; i++) {
      this._bits[this._hash(item, i * 31)] = true;
    }
  }

  mightContain(item: string): boolean {
    for (let i = 0; i < this._hashCount; i++) {
      if (!this._bits[this._hash(item, i * 31)]) return false;
    }
    return true;
  }

  bitCount(): number {
    return this._bits.filter((b) => b).length;
  }

  fillRatio(): number {
    return this.bitCount() / this._size;
  }

  clear(): void {
    this._bits.fill(false);
  }
}

/**
 * RandomSeed — seeded pseudo-random number generator
 *
 * Inspired by: seedrandom / mulberry32 / sfc32
 */

export class RandomSeed {
  private _state: number;
  private _algorithm: 'mulberry32' | 'sfc32';

  constructor(seed: number | string = Date.now(), algorithm: 'mulberry32' | 'sfc32' = 'mulberry32') {
    this._algorithm = algorithm;
    if (typeof seed === 'string') {
      this._state = RandomSeed._hashString(seed);
    } else {
      this._state = seed >>> 0;
    }
  }

  /**
   * Generate next number 0-1.
   */
  next(): number {
    if (this._algorithm === 'mulberry32') {
      this._state |= 0;
      this._state = (this._state + 0x6d2b79f5) | 0;
      let t = Math.imul(this._state ^ (this._state >>> 15), 1 | this._state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    } else {
      // sfc32
      let a = (this._state ^ 0xdeadbeef) >>> 0;
      let b = (this._state ^ 0xfeedface) >>> 0;
      let c = (this._state ^ 0xc0ffee) >>> 0;
      let d = (this._state ^ 0x12345678) >>> 0;
      a = (a + 0x9e3779b9) >>> 0;
      b = Math.imul(b ^ (b >>> 9), 1) >>> 0;
      c = (c + b) >>> 0;
      d = (d + 1) >>> 0;
      a = (a ^ b) >>> 0;
      b = (b + c) >>> 0;
      c = (c ^ d) >>> 0;
      c = (c << 11 | c >>> 21) >>> 0;
      this._state = a ^ b ^ c;
      return this._state / 4294967296;
    }
  }

  /**
   * Integer between 0 and max (inclusive).
   */
  int(max: number): number {
    return Math.floor(this.next() * (max + 1));
  }

  /**
   * Integer between min and max (inclusive).
   */
  range(min: number, max: number): number {
    return min + this.int(max - min);
  }

  /**
   * Pick a random element.
   */
  pick<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    return arr[this.int(arr.length - 1)];
  }

  /**
   * Shuffle array in place.
   */
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Random boolean.
   */
  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Random float between min and max.
   */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Get current state.
   */
  state(): number {
    return this._state;
  }

  private static _hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(31, h) + s.charCodeAt(i);
    }
    return h >>> 0;
  }
}

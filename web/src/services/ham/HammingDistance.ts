/**
 * HammingDistance — Hamming distance
 *
 * Inspired by: hamming-distance
 *
 * Number of positions at which bits differ.
 * For equal-length strings.
 */

export class HammingDistance {
  /**
   * Hamming distance between two equal-length strings.
   */
  static compute(a: string, b: string): number {
    if (a.length !== b.length) {
      throw new Error(`Hamming requires equal length: ${a.length} vs ${b.length}`);
    }
    let d = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) d++;
    }
    return d;
  }

  /**
   * Try compute (returns null on length mismatch).
   */
  static tryCompute(a: string, b: string): number | null {
    if (a.length !== b.length) return null;
    return HammingDistance.compute(a, b);
  }

  /**
   * Bitwise Hamming distance.
   */
  static bits(a: number, b: number): number {
    let v = a ^ b;
    let count = 0;
    while (v !== 0) {
      v &= v - 1;
      count++;
    }
    return count;
  }

  /**
   * Bytes Hamming distance.
   */
  static bytes(a: Uint8Array | number[], b: Uint8Array | number[]): number {
    if (a.length !== b.length) throw new Error('Length mismatch');
    const arr1 = a instanceof Uint8Array ? a : Uint8Array.from(a);
    const arr2 = b instanceof Uint8Array ? b : Uint8Array.from(b);
    let d = 0;
    for (let i = 0; i < arr1.length; i++) {
      d += HammingDistance.bits(arr1[i], arr2[i]);
    }
    return d;
  }

  /**
   * Similarity (0..1, 1 = identical).
   */
  static similarity(a: string, b: string): number {
    if (a.length === 0 && b.length === 0) return 1;
    if (a.length !== b.length) return 0;
    return 1 - HammingDistance.compute(a, b) / a.length;
  }

  /**
   * Normalized Hamming (divided by length).
   */
  static normalized(a: string, b: string): number {
    if (a.length === 0 && b.length === 0) return 0;
    return HammingDistance.compute(a, b) / a.length;
  }
}

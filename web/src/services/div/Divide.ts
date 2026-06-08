/**
 * Divide — divide and conquer
 */

export class Divide {
  /**
   * Maximum subarray (D&C).
   */
  static maxSubarray(nums: number[]): number {
    if (nums.length === 0) return 0;
    return Divide._maxSubRec(nums, 0, nums.length - 1);
  }
  private static _maxSubRec(nums: number[], l: number, r: number): number {
    if (l === r) return nums[l];
    const mid = (l + r) >> 1;
    const left = Divide._maxSubRec(nums, l, mid);
    const right = Divide._maxSubRec(nums, mid + 1, r);
    let leftSum = -Infinity;
    let sum = 0;
    for (let i = mid; i >= l; i--) {
      sum += nums[i];
      if (sum > leftSum) leftSum = sum;
    }
    let rightSum = -Infinity;
    sum = 0;
    for (let i = mid + 1; i <= r; i++) {
      sum += nums[i];
      if (sum > rightSum) rightSum = sum;
    }
    return Math.max(left, right, leftSum + rightSum);
  }

  /**
   * Closest pair of points (brute force for simplicity).
   */
  static closestPair(points: { x: number; y: number }[]): number {
    if (points.length < 2) return Infinity;
    let min = Infinity;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < min) min = d;
      }
    }
    return min;
  }

  /**
   * Power function (fast exponentiation).
   */
  static power(base: number, exp: number): number {
    if (exp === 0) return 1;
    if (exp < 0) return 1 / Divide.power(base, -exp);
    let result = 1;
    let b = base;
    let e = exp;
    while (e > 0) {
      if (e % 2 === 1) result *= b;
      b *= b;
      e = Math.floor(e / 2);
    }
    return result;
  }

  /**
   * Strassen-like: matrix multiplication (standard, but via divide).
   */
  static matMul(a: number[][], b: number[][]): number[][] {
    const n = a.length;
    const m = b[0].length;
    const k = b.length;
    const c: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        for (let p = 0; p < k; p++) c[i][j] += a[i][p] * b[p][j];
      }
    }
    return c;
  }

  /**
   * Skyline problem: compute skyline of buildings.
   */
  static skyline(buildings: [number, number, number][]): [number, number][] {
    if (buildings.length === 0) return [];
    const events: { x: number; h: number; type: 1 | -1 }[] = [];
    for (const [l, r, h] of buildings) {
      events.push({ x: l, h, type: 1 });
      events.push({ x: r, h, type: -1 });
    }
    events.sort((a, b) => a.x - b.x || a.type - b.type);
    const result: [number, number][] = [];
    const heights: number[] = [0];
    for (const e of events) {
      if (e.type === 1) heights.push(e.h);
      else heights.splice(heights.indexOf(e.h), 1);
      heights.sort((a, b) => b - a);
      const cur = heights[0];
      const last = result[result.length - 1];
      if (!last || last[1] !== cur) result.push([e.x, cur]);
    }
    return result;
  }
}

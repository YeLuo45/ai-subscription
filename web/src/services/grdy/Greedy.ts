/**
 * Greedy — greedy algorithms
 */

export class Greedy {
  /**
   * Activity selection (max non-overlapping).
   */
  static activitySelection(starts: number[], ends: number[]): number[] {
    const n = starts.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => ends[a] - ends[b]);
    const result: number[] = [];
    let lastEnd = -Infinity;
    for (const i of indices) {
      if (starts[i] >= lastEnd) {
        result.push(i);
        lastEnd = ends[i];
      }
    }
    return result;
  }

  /**
   * Coin change (US greedy).
   */
  static coinChangeGreedy(amount: number, coins: number[] = [25, 10, 5, 1]): number[] {
    const result: number[] = [];
    let remaining = amount;
    for (const c of coins.sort((a, b) => b - a)) {
      while (remaining >= c) {
        result.push(c);
        remaining -= c;
      }
    }
    return result;
  }

  /**
   * Jump game (greedy).
   */
  static canJump(nums: number[]): boolean {
    let maxReach = 0;
    for (let i = 0; i < nums.length; i++) {
      if (i > maxReach) return false;
      maxReach = Math.max(maxReach, i + nums[i]);
    }
    return true;
  }

  /**
   * Minimum platforms (train scheduling).
   */
  static minPlatforms(arrivals: number[], departures: number[]): number {
    const events: { time: number; type: number }[] = [];
    for (const a of arrivals) events.push({ time: a, type: 1 });
    for (const d of departures) events.push({ time: d, type: -1 });
    events.sort((a, b) => a.time - b.time || a.type - b.type);
    let cur = 0;
    let max = 0;
    for (const e of events) {
      cur += e.type;
      max = Math.max(max, cur);
    }
    return max;
  }

  /**
   * Fractional knapsack.
   */
  static fractionalKnapsack(weights: number[], values: number[], capacity: number): number {
    const n = weights.length;
    const items = Array.from({ length: n }, (_, i) => ({
      i,
      ratio: values[i] / weights[i],
    }));
    items.sort((a, b) => b.ratio - a.ratio);
    let total = 0;
    let remaining = capacity;
    for (const item of items) {
      if (remaining <= 0) break;
      if (weights[item.i] <= remaining) {
        total += values[item.i];
        remaining -= weights[item.i];
      } else {
        total += values[item.i] * (remaining / weights[item.i]);
        remaining = 0;
      }
    }
    return total;
  }

  /**
   * Assign cookies to children (greedy).
   */
  static findContentChildren(greed: number[], cookies: number[]): number {
    greed.sort((a, b) => a - b);
    cookies.sort((a, b) => a - b);
    let i = 0;
    let j = 0;
    while (i < greed.length && j < cookies.length) {
      if (cookies[j] >= greed[i]) {
        i++;
        j++;
      } else {
        j++;
      }
    }
    return i;
  }
}

/**
 * DP — dynamic programming classics
 */

export class DP {
  /**
   * Fibonacci.
   */
  static fib(n: number): number {
    if (n < 0) return 0;
    if (n < 2) return n;
    let a = 0;
    let b = 1;
    for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
    return b;
  }

  /**
   * Longest Common Subsequence length.
   */
  static lcs(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[m][n];
  }

  /**
   * Levenshtein edit distance.
   */
  static editDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  /**
   * 0/1 Knapsack.
   */
  static knapsack(weights: number[], values: number[], capacity: number): number {
    const n = weights.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= capacity; w++) {
        dp[i][w] = dp[i - 1][w];
        if (weights[i - 1] <= w) {
          dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
        }
      }
    }
    return dp[n][capacity];
  }

  /**
   * Coin change: minimum coins.
   */
  static coinChange(coins: number[], amount: number): number {
    const dp: number[] = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++) {
      for (const c of coins) {
        if (c <= i && dp[i - c] + 1 < dp[i]) dp[i] = dp[i - c] + 1;
      }
    }
    return dp[amount] === Infinity ? -1 : dp[amount];
  }

  /**
   * Coin change: number of ways.
   */
  static coinChangeWays(coins: number[], amount: number): number {
    const dp: number[] = new Array(amount + 1).fill(0);
    dp[0] = 1;
    for (const c of coins) {
      for (let i = c; i <= amount; i++) dp[i] += dp[i - c];
    }
    return dp[amount];
  }

  /**
   * Longest Increasing Subsequence.
   */
  static lis(nums: number[]): number {
    const tails: number[] = [];
    for (const n of nums) {
      let lo = 0;
      let hi = tails.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (tails[mid] < n) lo = mid + 1;
        else hi = mid;
      }
      tails[lo] = n;
    }
    return tails.length;
  }

  /**
   * Maximum subarray sum (Kadane).
   */
  static maxSubarray(nums: number[]): number {
    if (nums.length === 0) return 0;
    let cur = nums[0];
    let max = nums[0];
    for (let i = 1; i < nums.length; i++) {
      cur = Math.max(nums[i], cur + nums[i]);
      max = Math.max(max, cur);
    }
    return max;
  }

  /**
   * Distinct ways to climb stairs.
   */
  static climbStairs(n: number): number {
    if (n <= 2) return n;
    let a = 1;
    let b = 2;
    for (let i = 3; i <= n; i++) [a, b] = [b, a + b];
    return b;
  }
}

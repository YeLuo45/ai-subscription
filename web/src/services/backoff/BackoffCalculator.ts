/**
 * BackoffCalculator — compute retry delay for attempt number
 *
 * Inspired by: AWS SDK retry strategies
 *
 * Multiple strategies:
 *   - constant
 *   - linear
 *   - exponential
 *   - polynomial
 *   - decorrelated jitter
 *   - full jitter
 *   - equal jitter
 */

export class BackoffCalculator {
  /**
   * Constant delay: same delay every time.
   */
  static constant(delay: number): (attempt: number) => number {
    return () => delay;
  }

  /**
   * Linear: delay = base * attempt.
   */
  static linear(base: number, cap: number = Infinity): (attempt: number) => number {
    return (a) => Math.min(base * a, cap);
  }

  /**
   * Exponential: delay = base * 2^attempt.
   */
  static exponential(base: number, cap: number = 30_000): (attempt: number) => number {
    return (a) => Math.min(base * 2 ** (a - 1), cap);
  }

  /**
   * Polynomial: delay = base * attempt^power.
   */
  static polynomial(base: number, power: number, cap: number = Infinity): (attempt: number) => number {
    return (a) => Math.min(base * Math.pow(a, power), cap);
  }

  /**
   * Full jitter: random in [0, exp].
   */
  static fullJitter(base: number, cap: number = 30_000): (attempt: number) => number {
    return (a) => {
      const exp = Math.min(base * 2 ** (a - 1), cap);
      return Math.floor(Math.random() * exp);
    };
  }

  /**
   * Equal jitter: half deterministic + half random.
   */
  static equalJitter(base: number, cap: number = 30_000): (attempt: number) => number {
    return (a) => {
      const exp = Math.min(base * 2 ** (a - 1), cap);
      const half = exp / 2;
      return Math.floor(half + Math.random() * half);
    };
  }

  /**
   * Decorrelated jitter (AWS).
   * next = min(cap, random(base, prev * 3))
   */
  static decorrelatedJitter(base: number, cap: number = 30_000): (attempt: number, prev?: number) => number {
    return (_a, prev) => {
      const sleep = prev !== undefined ? prev * 3 : base;
      return Math.min(cap, Math.floor(base + Math.random() * (sleep - base)));
    };
  }

  /**
   * Fibonacci: delay = fib(n) * base.
   */
  static fibonacci(base: number, cap: number = Infinity): (attempt: number) => number {
    return (a) => {
      let prev = 1;
      let cur = 1;
      for (let i = 2; i < a; i++) {
        const next = prev + cur;
        prev = cur;
        cur = next;
      }
      return Math.min(cur * base, cap);
    };
  }
}

/**
 * RetryStrategy — retry async functions with policy
 *
 * Inspired by: p-retry / async-retry
 *
 * Retry failed async operations with configurable:
 *   - maxAttempts
 *   - backoff strategy (fixed, linear, exponential)
 *   - retry predicate (which errors to retry)
 *   - timeout
 */

export type Backoff = (attempt: number) => number;

export const backoff = {
  fixed: (delay: number): Backoff => () => delay,
  linear: (step: number, max: number = Infinity): Backoff => (a) => Math.min(a * step, max),
  exponential: (base: number = 100, cap: number = 30_000): Backoff => (a) => Math.min(base * 2 ** (a - 1), cap),
};

export interface RetryOptions {
  maxAttempts?: number;
  backoff?: Backoff;
  shouldRetry?: (err: unknown) => boolean;
  timeoutMs?: number;
  onRetry?: (err: unknown, attempt: number) => void;
}

export class RetryStrategy {
  /**
   * Execute fn with retry policy.
   */
  static async run<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
    const maxAttempts = opts.maxAttempts ?? 3;
    const delay = opts.backoff ?? backoff.exponential();
    const shouldRetry = opts.shouldRetry ?? (() => true);
    const timeoutMs = opts.timeoutMs;

    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (timeoutMs) {
          return await this.withTimeout(fn, timeoutMs);
        }
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt === maxAttempts || !shouldRetry(err)) {
          throw err;
        }
        opts.onRetry?.(err, attempt);
        await new Promise((r) => setTimeout(r, delay(attempt)));
      }
    }
    throw lastErr;
  }

  private static withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Retry timeout')), ms);
      fn().then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }
}

/**
 * RetryPolicy — exponential backoff with jitter
 *
 * Inspired by: claude-code resilience + AWS retry patterns
 *
 * Computes delay for next retry attempt using:
 *   - exponential: delay = base * 2^attempt
 *   - linear: delay = base * attempt
 *   - constant: delay = base
 *   - fibonacci: delay = base * fib(attempt)
 *
 * With optional:
 *   - full jitter: random between 0 and computed
 *   - equal jitter: half computed + half random
 *   - decorrelated jitter: independent random based on previous delay
 *
 * Also provides executeWithRetry that wraps a function.
 */

export type BackoffStrategy = 'exponential' | 'linear' | 'constant' | 'fibonacci';
export type JitterStrategy = 'none' | 'full' | 'equal' | 'decorrelated';

export interface RetryPolicyConfig {
  backoff: BackoffStrategy;
  jitter: JitterStrategy;
  baseMs: number;
  maxMs: number;
  maxAttempts: number;
  /** Multiplier for exponential/fibonacci (default 2 for exp) */
  multiplier?: number;
  /** Optional predicate to determine if error is retryable */
  isRetryable?: (error: unknown, attempt: number) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  output?: T;
  error?: string;
  attempts: number;
  totalDurationMs: number;
  delays: number[];
}

const FIB_CACHE: number[] = [0, 1];
function fib(n: number): number {
  while (FIB_CACHE.length <= n) {
    FIB_CACHE.push(FIB_CACHE[FIB_CACHE.length - 1] + FIB_CACHE[FIB_CACHE.length - 2]);
  }
  return FIB_CACHE[n];
}

export class RetryPolicy {
  private config: RetryPolicyConfig;
  private previousDelay: number = 0;

  constructor(config: Partial<RetryPolicyConfig> = {}) {
    this.config = {
      backoff: 'exponential',
      jitter: 'none',
      baseMs: 100,
      maxMs: 30_000,
      maxAttempts: 3,
      ...config,
    };
  }

  /**
   * Compute the delay (in ms) before the next attempt.
   * attempt is 1-based: attempt=1 is the first retry.
   */
  nextDelay(attempt: number): number {
    const baseDelay = this.computeBaseDelay(attempt);
    const capped = Math.min(this.config.maxMs, baseDelay);
    const jittered = this.applyJitter(capped, attempt);
    return Math.max(0, jittered);
  }

  private computeBaseDelay(attempt: number): number {
    const base = this.config.baseMs;
    const mult = this.config.multiplier ?? 2;
    switch (this.config.backoff) {
      case 'exponential':
        return base * Math.pow(mult, attempt - 1);
      case 'linear':
        return base * attempt;
      case 'constant':
        return base;
      case 'fibonacci':
        return base * fib(attempt);
    }
  }

  private applyJitter(delay: number, attempt: number): number {
    switch (this.config.jitter) {
      case 'none':
        return delay;
      case 'full':
        return Math.random() * delay;
      case 'equal':
        return delay / 2 + Math.random() * (delay / 2);
      case 'decorrelated': {
        // Decorrelated jitter: next = min(cap, random_between(base, prev*3))
        const base = this.config.baseMs;
        const upper = Math.max(base, this.previousDelay * 3);
        const next = base + Math.random() * (upper - base);
        this.previousDelay = next;
        return next;
      }
    }
  }

  /**
   * Execute a function with retry policy.
   * Retries on failure up to maxAttempts times.
   * Respects isRetryable predicate to skip non-retryable errors.
   */
  async execute<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    const start = Date.now();
    const delays: number[] = [];
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      if (attempt > 1) {
        const delay = this.nextDelay(attempt - 1);
        delays.push(delay);
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }
      try {
        const output = await fn();
        return {
          success: true,
          output,
          attempts: attempt,
          totalDurationMs: Date.now() - start,
          delays,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (this.config.isRetryable && !this.config.isRetryable(err, attempt)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDurationMs: Date.now() - start,
            delays,
          };
        }
      }
    }
    return {
      success: false,
      error: lastError,
      attempts: this.config.maxAttempts,
      totalDurationMs: Date.now() - start,
      delays,
    };
  }

  /** Get current config. */
  getConfig(): RetryPolicyConfig {
    return { ...this.config };
  }

  /** Update config at runtime. */
  setConfig(updates: Partial<RetryPolicyConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /** Reset internal state (decorrelated jitter uses this). */
  reset(): void {
    this.previousDelay = 0;
  }
}

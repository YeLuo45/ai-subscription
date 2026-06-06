/**
 * RateLimiter — token bucket rate limiter
 *
 * Inspired by: leaky bucket / token bucket algorithm
 *
 * Refill N tokens per interval. Each request consumes 1 token.
 * If no tokens, request is rejected.
 */

export interface RateLimiterOptions {
  capacity: number;
  refillTokens: number;
  refillIntervalMs: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private opts: RateLimiterOptions;

  constructor(opts: RateLimiterOptions) {
    this.opts = opts;
    this.tokens = opts.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume N tokens. Returns true if granted.
   */
  tryAcquire(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  /**
   * Wait for tokens (async).
   */
  async acquire(tokens: number = 1): Promise<void> {
    while (!this.tryAcquire(tokens)) {
      const wait = this.timeUntilRefill();
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  /**
   * Run fn when tokens are available.
   */
  async run<T>(fn: () => Promise<T>, tokens: number = 1): Promise<T> {
    await this.acquire(tokens);
    return fn();
  }

  /**
   * Get current token count.
   */
  available(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refills = Math.floor(elapsed / this.opts.refillIntervalMs);
    if (refills > 0) {
      this.tokens = Math.min(this.opts.capacity, this.tokens + refills * this.opts.refillTokens);
      this.lastRefill += refills * this.opts.refillIntervalMs;
    }
  }

  private timeUntilRefill(): number {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    return Math.max(0, this.opts.refillIntervalMs - elapsed);
  }
}

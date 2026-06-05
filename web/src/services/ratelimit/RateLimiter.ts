/**
 * RateLimiter — sliding window + token bucket
 *
 * Inspired by: claude-code resilience patterns
 *
 * Two rate limiting algorithms:
 *   - sliding-window: counts requests in a moving time window
 *   - token-bucket: refills tokens at a steady rate
 *
 * Each limiter has:
 *   - key: identifier (e.g., user ID, IP)
 *   - limit: max requests per window
 *   - windowMs: window size in ms
 *   - refillRate: tokens per second (token bucket only)
 *   - burst: max bucket capacity (token bucket only)
 *
 * Returns AllowResult with allowed/reason/retryAfterMs/remaining.
 */

export type Algorithm = 'sliding-window' | 'token-bucket';

export interface AllowResult {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
  remaining: number;
  /** Current count in the window (sliding) or current tokens (bucket) */
  currentState: number;
}

export interface LimiterConfig {
  key: string;
  algorithm: Algorithm;
  /** Max requests per windowMs (sliding) OR max tokens (bucket) */
  limit: number;
  /** Window duration in ms (sliding) */
  windowMs: number;
  /** Tokens per second refill rate (bucket) */
  refillRate?: number;
  /** Max bucket capacity (bucket). Defaults to limit. */
  burst?: number;
}

interface SlidingWindowState {
  key: string;
  algorithm: 'sliding-window';
  timestamps: number[];
  limit: number;
  windowMs: number;
}

interface TokenBucketState {
  key: string;
  algorithm: 'token-bucket';
  tokens: number;
  lastRefill: number;
  refillRate: number;
  burst: number;
}

type LimiterState = SlidingWindowState | TokenBucketState;

export class RateLimiter {
  private limiters: Map<string, LimiterState> = new Map();
  private globalLimit: number;
  private defaultAlgorithm: Algorithm;

  constructor(options: { globalLimit?: number; defaultAlgorithm?: Algorithm } = {}) {
    this.globalLimit = options.globalLimit ?? 10000;
    this.defaultAlgorithm = options.defaultAlgorithm ?? 'sliding-window';
  }

  /** Register a limiter config. */
  register(config: LimiterConfig): void {
    if (this.limiters.size >= this.globalLimit) {
      throw new Error(`global limit of ${this.globalLimit} limiters reached`);
    }
    if (config.limit <= 0) {
      throw new Error('limit must be > 0');
    }
    if (config.algorithm === 'sliding-window' && config.windowMs <= 0) {
      throw new Error('windowMs must be > 0 for sliding-window');
    }
    if (config.algorithm === 'token-bucket' && (config.refillRate ?? 0) <= 0) {
      throw new Error('refillRate must be > 0 for token-bucket');
    }
    if (config.algorithm === 'sliding-window') {
      this.limiters.set(config.key, {
        key: config.key,
        algorithm: 'sliding-window',
        timestamps: [],
        limit: config.limit,
        windowMs: config.windowMs,
      });
    } else {
      this.limiters.set(config.key, {
        key: config.key,
        algorithm: 'token-bucket',
        tokens: config.burst ?? config.limit,
        lastRefill: Date.now(),
        refillRate: config.refillRate!,
        burst: config.burst ?? config.limit,
      });
    }
  }

  /** Unregister a limiter. */
  unregister(key: string): boolean {
    return this.limiters.delete(key);
  }

  /** Check and record an attempt. */
  allow(key: string, count: number = 1): AllowResult {
    const limiter = this.limiters.get(key);
    if (!limiter) {
      // No limiter registered — allow by default
      return { allowed: true, remaining: Infinity, currentState: 0 };
    }
    if (limiter.algorithm === 'sliding-window') {
      return this.allowSliding(limiter, count);
    } else {
      return this.allowBucket(limiter, count);
    }
  }

  private allowSliding(limiter: SlidingWindowState, count: number): AllowResult {
    const now = Date.now();
    // Drop expired timestamps
    limiter.timestamps = limiter.timestamps.filter((t) => now - t < limiter.windowMs);
    const currentCount = limiter.timestamps.length;
    if (currentCount + count > limiter.limit) {
      const oldest = limiter.timestamps[0];
      const retryAfterMs = oldest ? limiter.windowMs - (now - oldest) : 0;
      return {
        allowed: false,
        reason: 'limit exceeded',
        retryAfterMs: Math.max(0, retryAfterMs),
        remaining: 0,
        currentState: currentCount,
      };
    }
    // Record
    for (let i = 0; i < count; i++) limiter.timestamps.push(now);
    return {
      allowed: true,
      remaining: limiter.limit - limiter.timestamps.length,
      currentState: limiter.timestamps.length,
    };
  }

  private allowBucket(limiter: TokenBucketState, count: number): AllowResult {
    const now = Date.now();
    // Refill
    const elapsed = (now - limiter.lastRefill) / 1000;
    limiter.tokens = Math.min(limiter.burst, limiter.tokens + elapsed * limiter.refillRate);
    limiter.lastRefill = now;
    if (limiter.tokens < count) {
      const deficit = count - limiter.tokens;
      const retryAfterMs = Math.ceil((deficit / limiter.refillRate) * 1000);
      return {
        allowed: false,
        reason: 'insufficient tokens',
        retryAfterMs,
        remaining: Math.floor(limiter.tokens),
        currentState: limiter.tokens,
      };
    }
    limiter.tokens -= count;
    return {
      allowed: true,
      remaining: Math.floor(limiter.tokens),
      currentState: limiter.tokens,
    };
  }

  /** Peek at current state without recording. */
  peek(key: string): { algorithm: Algorithm; state: number; limit: number; windowMs?: number } | undefined {
    const limiter = this.limiters.get(key);
    if (!limiter) return undefined;
    if (limiter.algorithm === 'sliding-window') {
      const now = Date.now();
      const active = limiter.timestamps.filter((t) => now - t < limiter.windowMs).length;
      return { algorithm: 'sliding-window', state: active, limit: limiter.limit, windowMs: limiter.windowMs };
    }
    // For bucket, refill first
    const elapsed = (Date.now() - limiter.lastRefill) / 1000;
    const tokens = Math.min(limiter.burst, limiter.tokens + elapsed * limiter.refillRate);
    return { algorithm: 'token-bucket', state: tokens, limit: limiter.burst };
  }

  /** Reset a limiter to empty/full state. */
  reset(key: string): boolean {
    const limiter = this.limiters.get(key);
    if (!limiter) return false;
    if (limiter.algorithm === 'sliding-window') {
      limiter.timestamps = [];
    } else {
      limiter.tokens = limiter.burst;
      limiter.lastRefill = Date.now();
    }
    return true;
  }

  /** List all limiter keys. */
  listKeys(): string[] {
    return Array.from(this.limiters.keys());
  }

  /** Number of registered limiters. */
  size(): number {
    return this.limiters.size;
  }

  /**
   * Wait until a request is allowed. Returns the time waited in ms.
   * If timeoutMs is provided and the wait exceeds it, returns -1.
   */
  async waitFor(key: string, count: number = 1, timeoutMs: number = 30000): Promise<number> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = this.allow(key, count);
      if (result.allowed) return Date.now() - start;
      const wait = result.retryAfterMs ?? 100;
      await new Promise((r) => setTimeout(r, Math.min(wait, 100)));
    }
    return -1;
  }
}

/**
 * CircuitBreaker — circuit breaker pattern
 *
 * Inspired by: Hystrix / resilience4j
 *
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 * - CLOSED: calls pass through; failures counted
 * - OPEN: calls fail fast (throw CircuitOpenError)
 * - HALF_OPEN: limited calls to test recovery
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitOpenError extends Error {
  readonly resetAt: number;
  constructor(resetAt: number) {
    super('Circuit breaker is open');
    this.name = 'CircuitOpenError';
    this.resetAt = resetAt;
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenLimit?: number;
  onStateChange?: (state: CircuitState) => void;
}

export class CircuitBreaker<TArgs extends unknown[] = unknown[], TResult = unknown> {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: number = 0;
  private halfOpenCount: number = 0;
  private opts: Required<Omit<CircuitBreakerOptions, 'onStateChange'>> & { onStateChange?: CircuitBreakerOptions['onStateChange'] };

  constructor(private fn: (...args: TArgs) => Promise<TResult>, options: CircuitBreakerOptions = {}) {
    this.opts = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeoutMs: options.resetTimeoutMs ?? 60_000,
      halfOpenLimit: options.halfOpenLimit ?? 1,
      onStateChange: options.onStateChange,
    };
  }

  /**
   * Execute the wrapped function.
   */
  async execute(...args: TArgs): Promise<TResult> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure >= this.opts.resetTimeoutMs) {
        this.setState('half-open');
        this.halfOpenCount = 0;
      } else {
        throw new CircuitOpenError(this.lastFailure + this.opts.resetTimeoutMs);
      }
    }
    if (this.state === 'half-open' && this.halfOpenCount >= this.opts.halfOpenLimit) {
      throw new CircuitOpenError(this.lastFailure + this.opts.resetTimeoutMs);
    }
    if (this.state === 'half-open') {
      this.halfOpenCount += 1;
    }
    try {
      const r = await this.fn(...args);
      this.onSuccess();
      return r;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.successes += 1;
    if (this.state === 'half-open') {
      this.setState('closed');
    }
  }

  private onFailure(): void {
    this.failures += 1;
    this.lastFailure = Date.now();
    if (this.state === 'half-open' || this.failures >= this.opts.failureThreshold) {
      this.setState('open');
    }
  }

  private setState(s: CircuitState): void {
    if (this.state === s) return;
    this.state = s;
    if (s === 'closed') {
      this.failures = 0;
      this.halfOpenCount = 0;
    }
    this.opts.onStateChange?.(s);
  }

  /**
   * Get current state.
   */
  get currentState(): CircuitState {
    return this.state;
  }

  /**
   * Get current failure count.
   */
  get failureCount(): number {
    return this.failures;
  }

  /**
   * Reset to closed state.
   */
  reset(): void {
    this.setState('closed');
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCount = 0;
  }
}

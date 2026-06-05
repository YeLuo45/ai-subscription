/**
 * CircuitBreaker — circuit breaker pattern
 *
 * Inspired by: claude-code resilience + thunderbolt circuit breaker
 *
 * Three states:
 *   - closed: requests pass through; failures counted
 *   - open: requests fail-fast; cooldown timer
 *   - half-open: limited requests probe; success -> closed, failure -> open
 *
 * Config:
 *   - failureThreshold: consecutive failures to open circuit
 *   - cooldownMs: time before transitioning to half-open
 *   - successThreshold: consecutive successes in half-open to close
 *   - halfOpenMax: max concurrent probes in half-open
 *   - onStateChange: callback for state transitions
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Number of consecutive failures to open the circuit */
  failureThreshold: number;
  /** Cooldown time before half-open (ms) */
  cooldownMs: number;
  /** Number of consecutive successes in half-open to close */
  successThreshold: number;
  /** Max concurrent probes in half-open */
  halfOpenMax: number;
  /** Optional name for debugging */
  name?: string;
  /** State change callback */
  onStateChange?: (newState: CircuitState, oldState: CircuitState) => void;
}

export interface CircuitExecuteResult<T> {
  success: boolean;
  output?: T;
  error?: string;
  state: CircuitState;
  durationMs: number;
  /** True if request was rejected due to open circuit */
  rejected: boolean;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private halfOpenInFlight: number = 0;
  private openedAt: number = 0;
  private config: CircuitBreakerConfig;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private totalRejections: number = 0;
  private stateHistory: Array<{ state: CircuitState; timestamp: number }> = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      cooldownMs: 30_000,
      successThreshold: 2,
      halfOpenMax: 1,
      ...config,
    };
    this.stateHistory.push({ state: 'closed', timestamp: Date.now() });
  }

  /** Get current state. */
  getState(): CircuitState {
    this.maybeTransitionFromOpen();
    return this.state;
  }

  /** Get current statistics. */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    totalRequests: number;
    totalSuccesses: number;
    totalFailures: number;
    totalRejections: number;
  } {
    this.maybeTransitionFromOpen();
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      totalRejections: this.totalRejections,
    };
  }

  /**
   * Force a state transition (for testing/recovery).
   */
  forceState(newState: CircuitState): void {
    if (newState === this.state) return;
    const old = this.state;
    this.state = newState;
    this.stateHistory.push({ state: newState, timestamp: Date.now() });
    if (newState === 'closed') {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === 'open') {
      this.openedAt = Date.now();
      this.failureCount = 0;
    } else if (newState === 'half-open') {
      this.successCount = 0;
    }
    this.config.onStateChange?.(newState, old);
  }

  /** Reset all stats. */
  reset(): void {
    this.forceState('closed');
    this.totalRequests = 0;
    this.totalSuccesses = 0;
    this.totalFailures = 0;
    this.totalRejections = 0;
  }

  /**
   * Execute a function within the circuit breaker.
   * If circuit is open, fail-fast without calling the function.
   * If half-open, only allow up to halfOpenMax concurrent calls.
   */
  async execute<T>(fn: () => Promise<T>): Promise<CircuitExecuteResult<T>> {
    this.maybeTransitionFromOpen();
    this.totalRequests += 1;

    // Check if we can execute
    if (this.state === 'open') {
      this.totalRejections += 1;
      return {
        success: false,
        error: 'circuit open',
        state: this.state,
        durationMs: 0,
        rejected: true,
      };
    }
    if (this.state === 'half-open' && this.halfOpenInFlight >= this.config.halfOpenMax) {
      this.totalRejections += 1;
      return {
        success: false,
        error: 'half-open capacity exceeded',
        state: this.state,
        durationMs: 0,
        rejected: true,
      };
    }

    if (this.state === 'half-open') {
      this.halfOpenInFlight += 1;
    }

    const start = Date.now();
    try {
      const output = await fn();
      this.onSuccess();
      return {
        success: true,
        output,
        state: this.getState(),
        durationMs: Date.now() - start,
        rejected: false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.onFailure();
      return {
        success: false,
        error: msg,
        state: this.getState(),
        durationMs: Date.now() - start,
        rejected: false,
      };
    } finally {
      if (this.state === 'half-open') {
        this.halfOpenInFlight -= 1;
      }
    }
  }

  private onSuccess(): void {
    this.totalSuccesses += 1;
    if (this.state === 'half-open') {
      this.successCount += 1;
      if (this.successCount >= this.config.successThreshold) {
        this.forceState('closed');
      }
    } else if (this.state === 'closed') {
      this.failureCount = 0; // Reset on success
    }
  }

  private onFailure(): void {
    this.totalFailures += 1;
    if (this.state === 'half-open') {
      this.forceState('open');
    } else if (this.state === 'closed') {
      this.failureCount += 1;
      if (this.failureCount >= this.config.failureThreshold) {
        this.forceState('open');
      }
    }
  }

  private maybeTransitionFromOpen(): void {
    if (this.state === 'open' && Date.now() - this.openedAt >= this.config.cooldownMs) {
      this.forceState('half-open');
    }
  }

  /** Get state change history. */
  getStateHistory(): Array<{ state: CircuitState; timestamp: number }> {
    return [...this.stateHistory];
  }

  /** Update config at runtime. */
  setConfig(updates: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /** Get current config. */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }
}

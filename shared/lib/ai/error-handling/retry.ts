/**
 * Retry Utilities
 * Exponential backoff, jitter, and circuit breaker implementation
 */

import {
  AISubscriptionError,
  LLMError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  CircuitBreakerError,
} from './errors';

// Re-export errors for convenience
export {
  AISubscriptionError,
  LLMError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  CircuitBreakerError,
} from './errors';

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Add random jitter to delays */
  jitter: boolean;
  /** Maximum jitter factor (0-1) */
  jitterFactor?: number;
  /** List of retryable error codes */
  retryableCodes?: Set<number>;
  /** List of retryable error messages patterns */
  retryableMessages?: RegExp[];
  /** Callback on retry attempt */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface RetryState {
  attempt: number;
  totalRetries: number;
  delayMs: number;
  error: Error;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  jitterFactor: 0.1,
  retryableCodes: new Set([408, 429, 500, 502, 503, 504]),
  retryableMessages: [
    /rate.limit/i,
    /timeout/i,
    /temporary unavailable/i,
    /service unavailable/i,
    /server error/i,
    /bad gateway/i,
    /too many requests/i,
  ],
};

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown, options?: Partial<RetryOptions>): boolean {
  if (!error) return false;

  const err = error as Error;
  
  // Custom errors with retryable flag
  if (error instanceof AISubscriptionError) {
    return error.retryable;
  }

  // HTTP status codes
  if ('status' in error) {
    const status = (error as { status: number }).status;
    if (options?.retryableCodes?.has(status)) return true;
  }
  if ('statusCode' in error) {
    const status = (error as { statusCode: number }).statusCode;
    if (options?.retryableCodes?.has(status)) return true;
  }

  // Error message patterns
  if (options?.retryableMessages) {
    for (const pattern of options.retryableMessages) {
      if (pattern.test(err.message)) return true;
    }
  }

  // Default retryable errors
  const retryablePatterns = [
    /rate.limit/i,
    /timeout/i,
    /temporary unavailable/i,
    /service unavailable/i,
    /server error/i,
    /bad gateway/i,
    /too many requests/i,
    /network/i,
    /econnreset/i,
    /econnrefused/i,
    /socket hang up/i,
  ];

  for (const pattern of retryablePatterns) {
    if (pattern.test(err.message)) return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  options: Partial<RetryOptions> = {}
): number {
  const {
    initialDelayMs = DEFAULT_RETRY_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_RETRY_OPTIONS.maxDelayMs,
    backoffMultiplier = DEFAULT_RETRY_OPTIONS.backoffMultiplier,
    jitter = DEFAULT_RETRY_OPTIONS.jitter,
    jitterFactor = DEFAULT_RETRY_OPTIONS.jitterFactor,
  } = options;

  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter if enabled
  if (jitter && jitterFactor) {
    const jitterRange = cappedDelay * jitterFactor;
    const randomJitter = Math.random() * 2 * jitterRange - jitterRange;
    return Math.round(Math.max(0, cappedDelay + randomJitter));
  }

  return Math.round(cappedDelay);
}

/**
 * Sleep utility
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    });
  });
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    // Check abort signal
    if (opts.signal?.aborted) {
      throw new Error('Aborted');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < opts.maxRetries && isRetryableError(error, opts)) {
        attempt++;
        const delay = calculateBackoffDelay(attempt, opts);

        // Call onRetry callback
        opts.onRetry?.(attempt, lastError, delay);

        console.warn(`[Retry] Attempt ${attempt}/${opts.maxRetries} after ${delay}ms: ${lastError.message}`);

        await sleep(delay, opts.signal);
      } else {
        // Don't retry - throw the error
        throw lastError;
      }
    }
  }

  throw lastError!;
}

/**
 * Execute a function with retry logic, returning detailed state
 */
export async function withRetryState<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<{ result: T; state: RetryState }> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    if (opts.signal?.aborted) {
      throw new Error('Aborted');
    }

    try {
      const result = await fn();
      return { result, state: { attempt, totalRetries: attempt, delayMs: 0, error: lastError! } };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries && isRetryableError(error, opts)) {
        attempt++;
        const delay = calculateBackoffDelay(attempt, opts);
        opts.onRetry?.(attempt, lastError, delay);
        await sleep(delay, opts.signal);
      } else {
        throw lastError;
      }
    }
  }

  throw lastError!;
}

// ============================================================
// Circuit Breaker
// ============================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery */
  resetTimeoutMs: number;
  /** Number of successful calls in half-open to close */
  successThreshold: number;
  /** Monitor interval in ms */
  monitorIntervalMs?: number;
  /** Callback on state change */
  onStateChange?: (state: CircuitState) => void;
}

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  successThreshold: 2,
  monitorIntervalMs: 1000,
};

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = 0;
  private readonly options: CircuitBreakerOptions;
  private readonly name: string;

  constructor(name: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.name = name;
    this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.checkStateTransition();
    return this.state;
  }

  /**
   * Check if the circuit allows requests
   */
  isAllowing(): boolean {
    this.checkStateTransition();
    return this.state !== 'OPEN';
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failureCount++;

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open opens the circuit
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      if (this.failureCount >= this.options.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isAllowing()) {
      const waitTime = Math.max(0, this.nextAttempt - Date.now());
      throw new CircuitBreakerError(
        `Circuit breaker is OPEN. Wait ${waitTime}ms before retry.`,
        this.state,
        this.failureCount
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Check and handle state transitions
   */
  private checkStateTransition(): void {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.transitionTo('HALF_OPEN');
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;

    console.log(`[CircuitBreaker:${this.name}] ${previousState} -> ${newState}`);

    switch (newState) {
      case 'CLOSED':
        this.failureCount = 0;
        this.successCount = 0;
        break;
      case 'OPEN':
        this.nextAttempt = Date.now() + this.options.resetTimeoutMs;
        this.successCount = 0;
        break;
      case 'HALF_OPEN':
        this.successCount = 0;
        break;
    }

    this.options.onStateChange?.(newState);
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED');
  }

  /**
   * Get circuit breaker stats
   */
  getStats(): { state: CircuitState; failureCount: number; successCount: number; nextAttempt: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
    };
  }
}

/**
 * Global circuit breaker registry
 */
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

/**
 * Get or create a circuit breaker
 */
export function getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name)!;
}

/**
 * Clear all circuit breakers
 */
export function clearAllCircuitBreakers(): void {
  circuitBreakers.clear();
}

/**
 * Error Handling Module Index
 * Exports all error handling and retry utilities
 */

// Error classes
export {
  AISubscriptionError,
  LLMError,
  RateLimitError,
  ServerError,
  AuthError,
  TokenLimitError,
  ModelNotFoundError,
  ProviderNotAvailableError,
  PipelineError,
  ValidationError,
  NetworkError,
  TimeoutError,
  CircuitBreakerError,
} from './errors';

// Retry utilities
export {
  // Types
  type RetryOptions,
  type RetryState,
  type CircuitBreakerOptions,
  type CircuitState,
  // Defaults
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_CIRCUIT_BREAKER_OPTIONS,
  // Functions
  isRetryableError,
  calculateBackoffDelay,
  sleep,
  withRetry,
  withRetryState,
  // Circuit Breaker
  CircuitBreaker,
  getCircuitBreaker,
  clearAllCircuitBreakers,
} from './retry';

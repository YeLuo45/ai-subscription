/**
 * Error Handling Module
 * Custom error classes for AI subscription services
 */

/**
 * Base error class for AI subscription errors
 */
export class AISubscriptionError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    retryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AISubscriptionError';
    this.code = code;
    this.retryable = retryable;
    this.context = context;
    this.timestamp = Date.now();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * LLM provider errors
 */
export class LLMError extends AISubscriptionError {
  public readonly providerId?: string;
  public readonly modelId?: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    providerId?: string,
    modelId?: string,
    statusCode?: number,
    retryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message, 'LLM_ERROR', retryable, context);
    this.name = 'LLMError';
    this.providerId = providerId;
    this.modelId = modelId;
    this.statusCode = statusCode;
  }
}

/**
 * Rate limiting error (429)
 */
export class RateLimitError extends LLMError {
  public readonly retryAfterMs?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    providerId?: string,
    modelId?: string,
    retryAfterMs?: number
  ) {
    super(message, providerId, modelId, 429, true);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Server error (500, 502, 503, 504)
 */
export class ServerError extends LLMError {
  public readonly originalStatusCode?: number;

  constructor(
    message: string,
    providerId?: string,
    modelId?: string,
    statusCode: number = 500
  ) {
    super(message, providerId, modelId, statusCode, true);
    this.name = 'ServerError';
    this.originalStatusCode = statusCode;
  }
}

/**
 * Authentication error (401, 403)
 */
export class AuthError extends LLMError {
  constructor(
    message: string = 'Authentication failed',
    providerId?: string,
    modelId?: string
  ) {
    super(message, providerId, modelId, 401, false);
    this.name = 'AuthError';
  }
}

/**
 * Token limit exceeded error
 */
export class TokenLimitError extends LLMError {
  public readonly inputTokens?: number;
  public readonly maxTokens?: number;

  constructor(
    message: string,
    providerId?: string,
    modelId?: string,
    inputTokens?: number,
    maxTokens?: number
  ) {
    super(message, providerId, modelId, 400, false);
    this.name = 'TokenLimitError';
    this.inputTokens = inputTokens;
    this.maxTokens = maxTokens;
  }
}

/**
 * Model not found error
 */
export class ModelNotFoundError extends AISubscriptionError {
  public readonly modelId: string;

  constructor(modelId: string, context?: Record<string, unknown>) {
    super(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND', false, context);
    this.name = 'ModelNotFoundError';
    this.modelId = modelId;
  }
}

/**
 * Provider not available error
 */
export class ProviderNotAvailableError extends AISubscriptionError {
  public readonly providerId: string;

  constructor(providerId: string, context?: Record<string, unknown>) {
    super(`Provider not available: ${providerId}`, 'PROVIDER_NOT_AVAILABLE', true, context);
    this.name = 'ProviderNotAvailableError';
    this.providerId = providerId;
  }
}

/**
 * Pipeline error
 */
export class PipelineError extends AISubscriptionError {
  public readonly agent?: string;
  public readonly stage?: string;

  constructor(
    message: string,
    agent?: string,
    stage?: string,
    retryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message, 'PIPELINE_ERROR', retryable, context);
    this.name = 'PipelineError';
    this.agent = agent;
    this.stage = stage;
  }
}

/**
 * Validation error
 */
export class ValidationError extends AISubscriptionError {
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', false, context);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Network error
 */
export class NetworkError extends AISubscriptionError {
  constructor(
    message: string = 'Network error',
    retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', retryable, context);
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AISubscriptionError {
  public readonly timeoutMs: number;

  constructor(
    message: string = 'Operation timed out',
    timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'TIMEOUT_ERROR', true, context);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends AISubscriptionError {
  public readonly circuitState: 'OPEN' | 'HALF_OPEN' | 'CLOSED';
  public readonly failureCount: number;

  constructor(
    message: string = 'Circuit breaker is open',
    circuitState: 'OPEN' | 'HALF_OPEN' | 'CLOSED' = 'OPEN',
    failureCount: number = 0
  ) {
    super(message, 'CIRCUIT_BREAKER_ERROR', false, { circuitState, failureCount });
    this.name = 'CircuitBreakerError';
    this.circuitState = circuitState;
    this.failureCount = failureCount;
  }
}

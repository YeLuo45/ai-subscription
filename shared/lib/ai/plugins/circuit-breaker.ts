/**
 * Built-in Circuit Breaker Plugin
 * Prevents cascade failures by opening circuit on repeated errors
 */

import type { RouterPlugin, RouteContext, RouteResult } from './types';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;  // Number of failures before opening circuit
  timeoutMs: number;        // Time to wait before attempting half-open state
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast, no requests allowed
  HALF_OPEN = 'half-open', // Testing if service recovered
}

/**
 * Create circuit breaker plugin
 */
export function createCircuitBreakerPlugin(
  config: CircuitBreakerConfig = { failureThreshold: 5, timeoutMs: 30000 }
): RouterPlugin {
  let state: CircuitState = CircuitState.CLOSED;
  let failureCount = 0;
  let lastFailureTime = 0;
  let halfOpenSuccessCount = 0;
  let halfOpenAttemptCount = 0;

  const reset = () => {
    state = CircuitState.CLOSED;
    failureCount = 0;
    halfOpenSuccessCount = 0;
    halfOpenAttemptCount = 0;
  };

  const canExecute = (): boolean => {
    const now = Date.now();

    switch (state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (now - lastFailureTime >= config.timeoutMs) {
          console.log('[Plugin:CircuitBreaker] Transitioning to HALF_OPEN');
          state = CircuitState.HALF_OPEN;
          halfOpenAttemptCount = 0;
          halfOpenSuccessCount = 0;
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow limited requests in half-open state
        return halfOpenAttemptCount < 3;

      default:
        return true;
    }
  };

  return {
    id: 'built-in-circuit-breaker',
    name: 'Built-in Circuit Breaker',
    version: '1.0.0',
    description: 'Prevents cascade failures by opening circuit on repeated errors',

    async onBeforeRoute(context: RouteContext): Promise<void> {
      if (!canExecute()) {
        console.warn(`[Plugin:CircuitBreaker] Circuit OPEN, rejecting request for ${context.request.taskType}`);
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }

      if (state === CircuitState.HALF_OPEN) {
        halfOpenAttemptCount++;
        console.log(`[Plugin:CircuitBreaker] HALF_OPEN attempt ${halfOpenAttemptCount}/3`);
      }
    },

    async onAfterRoute(result: RouteResult): Promise<void> {
      if (state === CircuitState.HALF_OPEN) {
        halfOpenSuccessCount++;
        console.log(`[Plugin:CircuitBreaker] HALF_OPEN success ${halfOpenSuccessCount}`);

        // Require 2 successes to close the circuit
        if (halfOpenSuccessCount >= 2) {
          console.log('[Plugin:CircuitBreaker] Transitioning to CLOSED after successful recovery');
          reset();
        }
      } else if (state === CircuitState.CLOSED) {
        failureCount = 0; // Reset failure count on success
      }
    },

    async onError(error: Error): Promise<void> {
      failureCount++;
      lastFailureTime = Date.now();

      console.warn(`[Plugin:CircuitBreaker] Failure ${failureCount}/${config.failureThreshold}: ${error.message}`);

      if (state === CircuitState.HALF_OPEN) {
        console.warn('[Plugin:CircuitBreaker] HALF_OPEN request failed, reopening circuit');
        state = CircuitState.OPEN;
      } else if (failureCount >= config.failureThreshold) {
        console.error(`[Plugin:CircuitBreaker] Opening circuit after ${failureCount} failures`);
        state = CircuitState.OPEN;
      }
    },

    configSchema: {
      type: 'object',
      properties: {
        failureThreshold: { type: 'number', default: 5 },
        timeoutMs: { type: 'number', default: 30000 },
      },
    },
  };
}

/**
 * Pre-configured circuit breaker plugin instance
 */
export const circuitBreakerPlugin = createCircuitBreakerPlugin();

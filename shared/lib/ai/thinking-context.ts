/**
 * Thinking Context - Request-scoped context for LLM tracing
 * Browser-compatible implementation using globalThis
 */

export interface ThinkingContext {
  source: string;
  traceId?: string;
  startTime?: number;
}

// Global storage for thinking context (browser-compatible)
const CONTEXT_STACK: ThinkingContext[] = [];

// ============================================================
// Context Management
// ============================================================

/**
 * Get current thinking context
 */
export function getThinkingContext(): ThinkingContext | undefined {
  return CONTEXT_STACK[CONTEXT_STACK.length - 1];
}

/**
 * Run a callback within a thinking context
 */
export function runWithThinkingContext<T>(
  context: ThinkingContext,
  fn: () => T
): T {
  CONTEXT_STACK.push(context);
  try {
    return fn();
  } finally {
    CONTEXT_STACK.pop();
  }
}

/**
 * Create a child context with timing
 */
export function createThinkingContext(source: string, traceId?: string): ThinkingContext {
  return {
    source,
    traceId,
    startTime: Date.now(),
  };
}

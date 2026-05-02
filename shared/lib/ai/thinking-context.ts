/**
 * Thinking Context - AsyncLocalStorage for request tracing
 * Exposes context via globalThis for Vite browser compatibility
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface ThinkingContext {
  source: string;
  traceId?: string;
  startTime?: number;
}

// AsyncLocalStorage instance for request-scoped context
const thinkingStorage = new AsyncLocalStorage<ThinkingContext>();

// ============================================================
// Context Management
// ============================================================

/**
 * Get current thinking context
 */
export function getThinkingContext(): ThinkingContext | undefined {
  return thinkingStorage.getStore();
}

/**
 * Run a callback within a thinking context
 */
export function runWithThinkingContext<T>(
  context: ThinkingContext,
  fn: () => T
): T {
  return thinkingStorage.run(context, fn);
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

// ============================================================
// globalThis exposure for cross-module access
// ============================================================

// Declare globalThis augmentation
declare global {
  interface GlobalThis {
    __THINKING_STORAGE__?: typeof thinkingStorage;
    __THINKING_CONTEXT__?: ThinkingContext;
  }
}

// Expose storage on globalThis for Vite/browser builds (avoids async_hooks direct import issues)
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__THINKING_STORAGE__ = thinkingStorage;
  (globalThis as any).__THINKING_CONTEXT__ = undefined;
}

/**
 * Get global thinking storage (for use in environments where AsyncLocalStorage
 * can't be directly imported)
 */
export function getGlobalThinkingStorage(): AsyncLocalStorage<ThinkingContext> | undefined {
  return (globalThis as any).__THINKING_STORAGE__;
}

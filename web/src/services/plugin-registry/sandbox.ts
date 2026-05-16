// Plugin sandbox - isolates plugin execution to prevent errors from affecting main app

import type { FetcherDefinition, FetcherConfig, FetcherResult } from './types';

/**
 * Sandbox error that captures plugin errors without affecting main app
 */
export class SandboxError extends Error {
  constructor(
    message: string,
    public readonly pluginId: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}

/**
 * Sandboxed fetcher that wraps a plugin's fetch function with error isolation
 */
export class SandboxedFetcher {
  private pluginId: string;
  private fetcher: FetcherDefinition;

  constructor(pluginId: string, fetcher: FetcherDefinition) {
    this.pluginId = pluginId;
    this.fetcher = fetcher;
  }

  async fetch(config: FetcherConfig): Promise<FetcherResult> {
    try {
      // Wrap the fetch call in a timeout to prevent hanging
      const timeoutPromise = new Promise<FetcherResult>((_, reject) => {
        setTimeout(() => {
          reject(new SandboxError(
            `Plugin ${this.pluginId} timed out after ${config.timeout || 30000}ms`,
            this.pluginId
          ));
        }, config.timeout || 30000);
      });

      const resultPromise = this.fetcher.fetch(config);
      const result = await Promise.race([resultPromise, timeoutPromise]);
      return result;
    } catch (err) {
      // Re-throw SandboxError as-is
      if (err instanceof SandboxError) {
        throw err;
      }
      // Wrap other errors in SandboxError
      throw new SandboxError(
        `Plugin ${this.pluginId} failed: ${err instanceof Error ? err.message : String(err)}`,
        this.pluginId,
        err
      );
    }
  }

  validateConfig?(config: FetcherConfig) {
    if (this.fetcher.validateConfig) {
      try {
        return this.fetcher.validateConfig(config);
      } catch {
        return { valid: false, errors: ['Config validation threw an error'] };
      }
    }
    return { valid: true };
  }
}

/**
 * Create a sandbox context for a plugin
 * Provides safe wrappers around console and other APIs
 */
export function createSandboxContext(pluginId: string): {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
} {
  const prefix = `[Plugin:${pluginId}]`;
  
  return {
    log: (...args: unknown[]) => {
      console.log(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(prefix, ...args);
    },
  };
}

/**
 * Wrap a plugin's code in an isolation proxy
 * This prevents plugins from accessing or modifying global state
 */
export function createIsolationProxy<T extends object>(target: T, pluginId: string): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (prop === 'window' || prop === 'document' || prop === 'localStorage' || prop === 'sessionStorage') {
        console.warn(`[Plugin:${pluginId}] Access to ${String(prop)} is restricted in sandbox`);
        return undefined;
      }
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(obj);
      }
      return value;
    },
    set(obj, prop, value) {
      console.warn(`[Plugin:${pluginId}] Setting ${String(prop)} is not allowed in sandbox`);
      return false;
    },
    has(_obj, prop) {
      if (String(prop) === 'window' || String(prop) === 'document') {
        return false;
      }
      return Reflect.has(_obj, prop);
    }
  });
}

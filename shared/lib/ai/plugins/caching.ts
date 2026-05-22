/**
 * Built-in Caching Plugin
 * Simple in-memory cache for route results based on content hash
 */

import type { RouterPlugin, RouteContext, RouteResult } from './types';

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttlMs: number;
  maxSize: number;
}

/**
 * Cache entry with expiration
 */
interface CacheEntry {
  value: RouteResult;
  expiresAt: number;
}

/**
 * Simple content hash for cache key generation
 */
function contentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Create caching plugin with configuration
 */
export function createCachingPlugin(config: CacheConfig = { ttlMs: 60000, maxSize: 100 }): RouterPlugin {
  const cache = new Map<string, CacheEntry>();
  let currentSize = 0;

  // Periodic cleanup of expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cache.delete(key);
        currentSize--;
      }
    }
  }, config.ttlMs);

  return {
    id: 'built-in-caching',
    name: 'Built-in Caching',
    version: '1.0.0',
    description: 'Caches route results based on content hash',

    async onBeforeRoute(context: RouteContext): Promise<void> {
      const cacheKey = contentHash(context.request.content);
      const entry = cache.get(cacheKey);

      if (entry && entry.expiresAt > Date.now()) {
        console.log(`[Plugin:Caching] Cache hit for key: ${cacheKey}`);
        // Note: We can't short-circuit here because we need to return a response
        // The caching logic is applied in onAfterRoute
      }
    },

    async onAfterRoute(result: RouteResult): Promise<void> {
      // Simple caching: store result with TTL
      const cacheKey = contentHash(result.response.text.substring(0, 100)); // Hash of response

      // Evict oldest if at capacity
      if (currentSize >= config.maxSize && !cache.has(cacheKey)) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) {
          cache.delete(oldestKey);
          currentSize--;
        }
      }

      cache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + config.ttlMs,
      });
      currentSize++;

      console.log(`[Plugin:Caching] Cached result, size: ${currentSize}/${config.maxSize}`);
    },

    configSchema: {
      type: 'object',
      properties: {
        ttlMs: { type: 'number', default: 60000 },
        maxSize: { type: 'number', default: 100 },
      },
    },
  };
}

/**
 * Pre-configured caching plugin instance
 */
export const cachingPlugin = createCachingPlugin();

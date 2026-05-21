/**
 * Provider Health Checker
 * Monitors API availability and latency for each provider
 */

import type { ProviderHealth } from './types';
import { AI_SUBSCRIPTION_PROVIDERS } from '../providers-ai-subscription';

interface HealthCacheEntry extends ProviderHealth {
  lastCheck: number;
}

export class ProviderHealthChecker {
  private healthCache: Map<string, HealthCacheEntry> = new Map();
  private checkIntervalMs: number = 60000; // 1 minute cache
  private timeoutMs: number = 5000; // 5 second timeout for health checks

  constructor(options?: { checkIntervalMs?: number; timeoutMs?: number }) {
    if (options?.checkIntervalMs) this.checkIntervalMs = options.checkIntervalMs;
    if (options?.timeoutMs) this.timeoutMs = options.timeoutMs;
  }

  /**
   * Check provider health with caching
   */
  async checkProvider(providerId: string): Promise<ProviderHealth> {
    const cached = this.healthCache.get(providerId);
    if (cached && Date.now() - cached.lastCheck < this.checkIntervalMs) {
      return {
        providerId: cached.providerId,
        available: cached.available,
        latencyMs: cached.latencyMs,
        error: cached.error,
        lastCheck: cached.lastCheck,
      };
    }

    const health = await this.performHealthCheck(providerId);
    this.healthCache.set(providerId, { ...health, lastCheck: Date.now() });
    return health;
  }

  /**
   * Check all providers and return their health status
   */
  async checkAllProviders(): Promise<Map<string, ProviderHealth>> {
    const results = new Map<string, ProviderHealth>();

    await Promise.all(
      Object.keys(AI_SUBSCRIPTION_PROVIDERS).map(async (providerId) => {
        const health = await this.checkProvider(providerId);
        results.set(providerId, health);
      })
    );

    return results;
  }

  /**
   * Get only available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    const allHealth = await this.checkAllProviders();
    return Array.from(allHealth.entries())
      .filter(([, health]) => health.available)
      .map(([providerId]) => providerId);
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache.clear();
  }

  /**
   * Perform actual health check by sending a lightweight request
   */
  private async performHealthCheck(providerId: string): Promise<ProviderHealth> {
    const provider = AI_SUBSCRIPTION_PROVIDERS[providerId];
    if (!provider) {
      return {
        providerId,
        available: false,
        latencyMs: 0,
        error: 'Unknown provider',
        lastCheck: Date.now(),
      };
    }

    // Local provider is always "available" (no network needed)
    if (providerId === 'local') {
      return {
        providerId,
        available: true,
        latencyMs: 0,
        lastCheck: Date.now(),
      };
    }

    const startTime = Date.now();

    try {
      // Attempt a lightweight health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      // For API providers, we try a simple request to check availability
      // This is a simplified check - in production you might want to
      // call a specific health endpoint
      const baseUrl = provider.defaultBaseUrl;
      if (!baseUrl) {
        return {
          providerId,
          available: false,
          latencyMs: 0,
          error: 'No base URL configured',
          lastCheck: Date.now(),
        };
      }

      // Try a models list request as health check
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: provider.requiresApiKey ? { 'Authorization': 'Bearer dummy' } : {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 401) {
        // 401 means the server is up but needs auth (which is fine for our purposes)
        return {
          providerId,
          available: true,
          latencyMs: Date.now() - startTime,
          lastCheck: Date.now(),
        };
      }

      return {
        providerId,
        available: false,
        latencyMs: Date.now() - startTime,
        error: `HTTP ${response.status}`,
        lastCheck: Date.now(),
      };
    } catch (error) {
      return {
        providerId,
        available: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: Date.now(),
      };
    }
  }
}

// Singleton instance for global use
let globalHealthChecker: ProviderHealthChecker | null = null;

export function getHealthChecker(): ProviderHealthChecker {
  if (!globalHealthChecker) {
    globalHealthChecker = new ProviderHealthChecker();
  }
  return globalHealthChecker;
}

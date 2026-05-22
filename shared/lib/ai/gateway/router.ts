/**
 * Router Gateway Implementation
 * API Gateway with rate limiting and plugin support
 */

import { routeAndCall, routeAndPrompt, getRoutingExplanation, type RouteAndCallOptions } from '../llm-router';
import { pluginRegistry, type RouteContext, type RouteResult } from '../plugins';
import type { RouteRequest, RouteResponse, RateLimit, RateLimitEntry, RouterGateway } from './types';
import type { RoutingStrategy } from '../routing-strategy/types';
import type { TenantStrategy } from '../multi-tenant/types';
import type { RealtimeMetrics, DashboardData } from '../monitoring/types';
import { getDashboardData } from '../monitoring/dashboard';
import { metricsCollector } from '../monitoring/metrics';

/**
 * Default rate limits per plan type
 */
const DEFAULT_RATE_LIMITS: Record<string, RateLimit> = {
  free: { requestsPerMinute: 10, burstLimit: 5 },
  pro: { requestsPerMinute: 60, burstLimit: 20 },
  enterprise: { requestsPerMinute: 300, burstLimit: 100 },
};

/**
 * Rate limit store (in-memory, per tenant)
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Get rate limit for a tenant (simplified - in production would check plan)
 */
function getTenantRateLimit(tenantId: string): RateLimit {
  // In production, this would check the tenant's plan from storage
  // For now, default to free tier limits
  return DEFAULT_RATE_LIMITS.free;
}

/**
 * Check and update rate limit for a tenant
 */
function checkRateLimit(tenantId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const rateLimit = getTenantRateLimit(tenantId);
  const now = Date.now();
  const windowMs = 60000; // 1 minute window

  let entry = rateLimitStore.get(tenantId);

  // Reset window if expired
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitStore.set(tenantId, entry);
  }

  // Check burst limit first (within current window)
  const burstAllowed = entry.count < rateLimit.burstLimit;
  const regularAllowed = entry.count < rateLimit.requestsPerMinute;

  if (!burstAllowed && !regularAllowed) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: windowMs - (now - entry.windowStart),
    };
  }

  // Increment counter
  entry.count++;

  return {
    allowed: true,
    remaining: Math.max(0, rateLimit.requestsPerMinute - entry.count),
    resetIn: windowMs - (now - entry.windowStart),
  };
}

/**
 * Router Gateway implementation
 */
export class RouterGatewayImpl implements RouterGateway {
  /**
   * Route a request through the gateway
   */
  async route(request: RouteRequest): Promise<RouteResponse> {
    const startTime = Date.now();

    // Check rate limit
    const rateLimitCheck = checkRateLimit(request.tenantId);
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateLimitCheck.resetIn / 1000)}s`);
    }

    // Create route context for plugins
    const context: RouteContext = {
      request,
      timestamp: startTime,
    };

    // Execute onBeforeRoute hooks
    await pluginRegistry.executeBeforeRoute(context);

    try {
      // Prepare messages for routeAndCall
      const messages = [{ role: 'user' as const, content: request.content }];

      // Call the router
      const result = await routeAndCall({
        taskType: request.taskType,
        messages,
        ...request.options,
      });

      const durationMs = Date.now() - startTime;

      // Build response
      const response: RouteResponse = {
        text: result.text,
        modelId: result.modelId,
        providerId: result.providerId,
        usage: result.usage,
        routingExplanation: getRoutingExplanation() || undefined,
      };

      // Execute onAfterRoute hooks
      const routeResult: RouteResult = {
        response,
        durationMs,
      };
      await pluginRegistry.executeAfterRoute(routeResult);

      // Update metrics
      metricsCollector.recordRequest(request.taskType, result.modelId, durationMs, true);

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Execute error hooks
      await pluginRegistry.executeOnError(err);

      // Update metrics
      metricsCollector.recordRequest(request.taskType, 'unknown', Date.now() - startTime, false);

      throw err;
    }
  }

  /**
   * Get strategies for a tenant
   */
  async getStrategies(tenantId: string): Promise<RoutingStrategy[]> {
    // Dynamic import to avoid circular dependencies
    const { getTenantStrategies } = await import('../multi-tenant/storage');
    const strategies = await getTenantStrategies(tenantId);
    return strategies.map(ts => ts.strategy);
  }

  /**
   * Save a tenant strategy
   */
  async saveStrategy(strategy: TenantStrategy): Promise<void> {
    const { saveTenantStrategy } = await import('../multi-tenant/storage');
    await saveTenantStrategy(strategy);
  }

  /**
   * Get real-time metrics for a tenant
   */
  async getMetrics(tenantId: string): Promise<RealtimeMetrics> {
    // Return current metrics snapshot
    return metricsCollector.getSnapshot();
  }

  /**
   * Get dashboard data for a tenant
   */
  async getDashboard(tenantId: string, periodMs: number): Promise<DashboardData> {
    return getDashboardData(tenantId, periodMs);
  }
}

/**
 * Default gateway instance
 */
export const routerGateway = new RouterGatewayImpl();

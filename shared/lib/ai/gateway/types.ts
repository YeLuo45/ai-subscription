/**
 * Gateway Types
 * API Gateway type definitions for routing, rate limiting, and monitoring
 */

import type { TaskType } from '../providers-ai-subscription';
import type { RouteAndCallOptions } from '../llm-router';
import type { RoutingStrategy } from '../routing-strategy/types';
import type { TenantStrategy } from '../multi-tenant/types';
import type { RealtimeMetrics, DashboardData } from '../monitoring/types';
import type { RoutingExplanation } from '../routing-history/types';

/**
 * Route request entering the gateway
 */
export interface RouteRequest {
  taskType: TaskType;
  content: string;
  tenantId: string;
  userId?: string;
  options?: Partial<RouteAndCallOptions>;
}

/**
 * Route response from the gateway
 */
export interface RouteResponse {
  text: string;
  modelId: string;
  providerId: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  routingExplanation?: RoutingExplanation;
}

/**
 * Rate limit configuration for a tenant
 */
export interface RateLimit {
  requestsPerMinute: number;
  burstLimit: number;
}

/**
 * Rate limit tracking entry
 */
export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * API Gateway interface
 */
export interface RouterGateway {
  route(request: RouteRequest): Promise<RouteResponse>;
  getStrategies(tenantId: string): Promise<RoutingStrategy[]>;
  saveStrategy(strategy: TenantStrategy): Promise<void>;
  getMetrics(tenantId: string): Promise<RealtimeMetrics>;
  getDashboard(tenantId: string, periodMs: number): Promise<DashboardData>;
}

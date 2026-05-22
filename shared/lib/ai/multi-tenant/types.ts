/**
 * Multi-Tenant Types
 * Type definitions for multi-tenant strategy management and team sharing
 */

import type { RoutingStrategy } from '../routing-strategy/types';

/**
 * Tenant strategy - a routing strategy owned by a specific tenant
 */
export interface TenantStrategy {
  id: string;
  tenantId: string;
  name: string;
  strategy: RoutingStrategy;
  isDefault: boolean;
  createdBy: string;
  sharedWith: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Team roles for multi-tenant access control
 */
export enum TeamRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

/**
 * Team member record linking users to tenants with specific roles
 */
export interface TeamMember {
  userId: string;
  tenantId: string;
  role: TeamRole;
}

/**
 * Audit log entry for strategy actions
 */
export interface StrategyAuditLog {
  id: string;
  strategyId: string;
  tenantId: string;
  action: 'create' | 'update' | 'delete' | 'share' | 'use';
  performedBy: string;
  timestamp: number;
  details: Record<string, unknown>;
}

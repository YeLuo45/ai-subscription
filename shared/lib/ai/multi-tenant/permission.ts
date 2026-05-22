/**
 * Multi-Tenant Permission System
 * Role-based access control for team members
 */

import { TeamRole } from './types';

/**
 * Actions that can be performed on strategies
 */
export type StrategyAction = 'create' | 'update' | 'delete' | 'share' | 'use';

/**
 * Permission matrix: which roles can perform which actions
 */
const PERMISSION_MATRIX: Record<TeamRole, StrategyAction[]> = {
  [TeamRole.ADMIN]: ['create', 'update', 'delete', 'share', 'use'],
  [TeamRole.EDITOR]: ['create', 'update', 'share', 'use'],
  [TeamRole.VIEWER]: ['use'],
};

/**
 * Check if a role has permission to perform an action
 * @param role - The team role to check
 * @param action - The action to perform
 * @returns true if the role has permission, false otherwise
 */
export function checkPermission(role: TeamRole, action: StrategyAction): boolean {
  const allowedActions = PERMISSION_MATRIX[role];
  return allowedActions?.includes(action) ?? false;
}

/**
 * Get all actions allowed for a specific role
 * @param role - The team role
 * @returns Array of allowed actions
 */
export function getAllowedActions(role: TeamRole): StrategyAction[] {
  return PERMISSION_MATRIX[role] || [];
}

/**
 * Check if a role can manage team members (admin only)
 * @param role - The team role to check
 * @returns true if the role can manage team members
 */
export function canManageTeam(role: TeamRole): boolean {
  return role === TeamRole.ADMIN;
}

/**
 * Check if a role can delete strategies (admin only)
 * @param role - The team role to check
 * @returns true if the role can delete strategies
 */
export function canDeleteStrategies(role: TeamRole): boolean {
  return role === TeamRole.ADMIN;
}

/**
 * Multi-Tenant Module
 * Multi-tenant strategy management, team sharing, and audit logging
 */

// Types
export * from './types';

// Storage operations
export {
  saveTenantStrategy,
  createTenantStrategy,
  getTenantStrategies,
  getTenantStrategy,
  getSharedStrategies,
  deleteTenantStrategy,
  updateTenantStrategy,
} from './storage';

// Permission checking
export {
  checkPermission,
  getAllowedActions,
  canManageTeam,
  canDeleteStrategies,
  type StrategyAction,
} from './permission';

// Audit logging
export {
  logStrategyAction,
  createAuditLog,
  getAuditLogs,
  getStrategyAuditLogs,
  clearOldAuditLogs,
} from './audit';

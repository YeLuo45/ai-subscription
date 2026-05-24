/**
 * Audit Plugin - Logs all sync events for debugging and compliance
 */

import type { PluginRegistration, PluginAPI, HookContext } from '../types';
import { HookEvent } from '../types';

export const auditPlugin: PluginRegistration = {
  manifest: {
    id: 'builtin/audit',
    name: 'Audit Log',
    version: '1.0.0',
    description: 'Logs all sync events for debugging and compliance tracking',
    author: 'ai-subscription',
    hooks: [
      HookEvent.SYNC_BEFORE,
      HookEvent.SYNC_AFTER,
      HookEvent.CONFLICT_DETECTED,
      HookEvent.ADAPTER_CONNECT,
      HookEvent.ADAPTER_DISCONNECT,
    ],
    enabled: true,
    builtin: true,
  },
  factory: (api: PluginAPI) => {
    // Audit log storage
    const auditLog: AuditEntry[] = [];
    const MAX_AUDIT_ENTRIES = 1000;

    interface AuditEntry {
      timestamp: number;
      event: HookEvent;
      context: Partial<HookContext>;
      pluginId: string;
    }

    // Create handler for each event type
    const syncBeforeHandler = (context: HookContext) => {
      const entry: AuditEntry = {
        timestamp: context.timestamp,
        event: HookEvent.SYNC_BEFORE,
        context,
        pluginId: 'builtin/audit',
      };
      addAuditEntry(entry);
    };

    const syncAfterHandler = (context: HookContext) => {
      const entry: AuditEntry = {
        timestamp: context.timestamp,
        event: HookEvent.SYNC_AFTER,
        context,
        pluginId: 'builtin/audit',
      };
      addAuditEntry(entry);
    };

    const conflictDetectedHandler = (context: HookContext) => {
      const entry: AuditEntry = {
        timestamp: context.timestamp,
        event: HookEvent.CONFLICT_DETECTED,
        context,
        pluginId: 'builtin/audit',
      };
      addAuditEntry(entry);
    };

    const adapterConnectHandler = (context: HookContext) => {
      const entry: AuditEntry = {
        timestamp: context.timestamp,
        event: HookEvent.ADAPTER_CONNECT,
        context,
        pluginId: 'builtin/audit',
      };
      addAuditEntry(entry);
    };

    const adapterDisconnectHandler = (context: HookContext) => {
      const entry: AuditEntry = {
        timestamp: context.timestamp,
        event: HookEvent.ADAPTER_DISCONNECT,
        context,
        pluginId: 'builtin/audit',
      };
      addAuditEntry(entry);
    };

    // Add entry to audit log with size limit
    function addAuditEntry(entry: AuditEntry): void {
      auditLog.push(entry);
      if (auditLog.length > MAX_AUDIT_ENTRIES) {
        auditLog.shift(); // Remove oldest entry
      }
    }

    // Register all hooks
    api.registerHook(HookEvent.SYNC_BEFORE, syncBeforeHandler);
    api.registerHook(HookEvent.SYNC_AFTER, syncAfterHandler);
    api.registerHook(HookEvent.CONFLICT_DETECTED, conflictDetectedHandler);
    api.registerHook(HookEvent.ADAPTER_CONNECT, adapterConnectHandler);
    api.registerHook(HookEvent.ADAPTER_DISCONNECT, adapterDisconnectHandler);
  },
};

/**
 * Get all audit entries
 */
export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

// Shared audit log storage (need to be accessed from outside)
const auditLog: AuditEntry[] = [];

interface AuditEntry {
  timestamp: number;
  event: HookEvent;
  context: Partial<HookContext>;
  pluginId: string;
}

// Re-export for testing
export type { AuditEntry };
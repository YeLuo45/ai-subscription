/**
 * Plugin System - Index
 * Unified exports for plugin types, registry, and builtin plugins
 */

import type { PluginManifest } from './types';
import { HookEvent } from './types';
import type {
  PluginHook,
  HookContext,
  HookHandler,
  PluginAPI,
  PluginFactory,
  PluginRegistration,
} from './types';
import { PluginRegistry } from './registry';
import { getPluginRegistry, createPluginRegistry } from './registry';
import { builtinPlugins, compressionPlugin, auditPlugin } from './builtin';

// Types
export {
  HookEvent,
  type PluginManifest,
  type PluginHook,
  type HookContext,
  type HookHandler,
  type PluginAPI,
  type PluginFactory,
  type PluginRegistration,
};

// Registry
export {
  PluginRegistry,
  getPluginRegistry,
  createPluginRegistry,
};

// Builtin Plugins
export {
  compressionPlugin,
  auditPlugin,
  builtinPlugins,
};

/**
 * Initialize all builtin plugins with the registry
 */
export function initializeBuiltinPlugins(): void {
  const registry = getPluginRegistry();
  
  for (const plugin of builtinPlugins) {
    registry.register(plugin);
  }
}

/**
 * Get all builtin plugin manifests
 */
export function getBuiltinPluginManifests(): PluginManifest[] {
  return builtinPlugins.map(p => p.manifest);
}
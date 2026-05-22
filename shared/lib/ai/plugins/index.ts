/**
 * Plugins Index
 * Central export for all built-in plugins
 */

// Types
export * from './types';

// Plugin registry
export { PluginRegistry, pluginRegistry } from './plugin-registry';

// Built-in plugins
export { loggingPlugin } from './logging';
export { cachingPlugin, createCachingPlugin, type CacheConfig } from './caching';
export { circuitBreakerPlugin, createCircuitBreakerPlugin, type CircuitBreakerConfig } from './circuit-breaker';

/**
 * Preset plugins array for easy registration
 */
export const PRESET_PLUGINS = [
  loggingPlugin,
  cachingPlugin,
  circuitBreakerPlugin,
];

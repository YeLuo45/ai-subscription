/**
 * Plugin Registry
 * Central registry for managing and executing router plugins
 */

import type { RouterPlugin, RouteContext, RouteResult } from './types';

/**
 * Plugin registry for managing router plugins
 */
export class PluginRegistry {
  private plugins: Map<string, RouterPlugin> = new Map();

  /**
   * Register a plugin
   */
  register(plugin: RouterPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin ${plugin.id} already registered, replacing`);
    }
    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginRegistry] Registered plugin: ${plugin.id} v${plugin.version}`);
  }

  /**
   * Unregister a plugin by ID
   */
  unregister(pluginId: string): void {
    if (this.plugins.delete(pluginId)) {
      console.log(`[PluginRegistry] Unregistered plugin: ${pluginId}`);
    }
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): RouterPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * List all registered plugins
   */
  listPlugins(): RouterPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Execute onBeforeRoute hooks for all plugins
   */
  async executeBeforeRoute(context: RouteContext): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onBeforeRoute) {
        try {
          await plugin.onBeforeRoute(context);
        } catch (error) {
          console.error(`[PluginRegistry] ${plugin.id} onBeforeRoute error:`, error);
        }
      }
    }
  }

  /**
   * Execute onAfterRoute hooks for all plugins
   */
  async executeAfterRoute(result: RouteResult): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onAfterRoute) {
        try {
          await plugin.onAfterRoute(result);
        } catch (error) {
          console.error(`[PluginRegistry] ${plugin.id} onAfterRoute error:`, error);
        }
      }
    }
  }

  /**
   * Execute onError hooks for all plugins
   */
  async executeOnError(error: Error): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onError) {
        try {
          await plugin.onError(error);
        } catch (err) {
          console.error(`[PluginRegistry] ${plugin.id} onError error:`, err);
        }
      }
    }
  }
}

/**
 * Global plugin registry instance
 */
export const pluginRegistry = new PluginRegistry();

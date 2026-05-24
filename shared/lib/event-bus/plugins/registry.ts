/**
 * PluginRegistry - Singleton registry for managing plugins
 * Handles registration, enable/disable, and hook emission
 */

import type {
  PluginManifest,
  PluginHook,
  HookEvent,
  HookContext,
  HookHandler,
  PluginAPI,
  PluginFactory,
  PluginRegistration,
} from './types';
import { HookEvent as Events } from './types';

/** Storage key for persisted plugin states */
const PLUGIN_STORAGE_KEY = 'ai_subscription_plugins';
/** LocalStorage interface for plugin persistence */
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * PluginRegistry singleton
 * Manages all plugin registrations, enables/disables, and hook emissions
 */
export class PluginRegistry {
  private static instance: PluginRegistry | null = null;

  private plugins: Map<string, PluginHook> = new Map();
  private handlers: Map<HookEvent, Set<HookHandler>> = new Map();
  private pluginFactories: Map<string, PluginFactory> = new Map();
  private storageAdapter: StorageAdapter | null = null;

  private constructor(storageAdapter?: StorageAdapter) {
    this.storageAdapter = storageAdapter || null;
    this.initializeBuiltinPlugins();
  }

  /**
   * Get the PluginRegistry singleton instance
   */
  static getInstance(storageAdapter?: StorageAdapter): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry(storageAdapter);
    }
    return PluginRegistry.instance;
  }

  /**
   * Reset the singleton (for testing)
   */
  static resetInstance(): void {
    if (PluginRegistry.instance) {
      PluginRegistry.instance.handlers.clear();
      PluginRegistry.instance.plugins.clear();
      PluginRegistry.instance.pluginFactories.clear();
    }
    PluginRegistry.instance = null;
  }

  /**
   * Initialize built-in plugins
   */
  private initializeBuiltinPlugins(): void {
    // Builtin plugins are registered via imports
    // This method can be extended when builtin plugins are implemented
  }

  /**
   * Create PluginAPI instance for a plugin
   */
  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      registerHook: (event: HookEvent, handler: HookHandler) => {
        this.addHandler(event, handler);
      },
      unregisterHook: (event: HookEvent, handler: HookHandler) => {
        this.removeHandler(event, handler);
      },
      emit: (event: HookEvent, context?: Partial<HookContext>) => {
        return this.emitHook(event, context);
      },
      getConfig: (): Record<string, unknown> => {
        return this.getPluginConfig(pluginId);
      },
      setConfig: (key: string, value: unknown) => {
        this.setPluginConfig(pluginId, key, value);
      },
    };
  }

  /**
   * Register a plugin with the registry
   */
  register(registration: PluginRegistration): void {
    const { manifest, factory } = registration;
    
    if (this.plugins.has(manifest.id)) {
      console.warn(`[PluginRegistry] Plugin ${manifest.id} is already registered`);
      return;
    }

    const pluginHook: PluginHook = {
      manifest,
      enabled: manifest.enabled ?? true,
      instance: undefined,
    };

    this.plugins.set(manifest.id, pluginHook);
    this.pluginFactories.set(manifest.id, factory);

    // Initialize plugin with its factory
    if (pluginHook.enabled) {
      this.initializePlugin(manifest.id, factory);
    }

    this.persistPluginStates();
  }

  /**
   * Initialize a plugin by calling its factory
   */
  private initializePlugin(pluginId: string, factory: PluginFactory): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      const api = this.createPluginAPI(pluginId);
      const result = factory(api);
      
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error(`[PluginRegistry] Plugin ${pluginId} initialization failed:`, error);
        });
      }
    } catch (error) {
      console.error(`[PluginRegistry] Plugin ${pluginId} factory error:`, error);
    }
  }

  /**
   * Enable a plugin by ID
   */
  enable(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`[PluginRegistry] Plugin ${pluginId} not found`);
      return false;
    }

    if (plugin.enabled) {
      return true; // Already enabled
    }

    plugin.enabled = true;
    
    // Initialize plugin if not already
    const factory = this.pluginFactories.get(pluginId);
    if (factory) {
      this.initializePlugin(pluginId, factory);
    }

    this.persistPluginStates();
    return true;
  }

  /**
   * Disable a plugin by ID
   */
  disable(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`[PluginRegistry] Plugin ${pluginId} not found`);
      return false;
    }

    if (!plugin.enabled) {
      return true; // Already disabled
    }

    plugin.enabled = false;
    this.persistPluginStates();
    return true;
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled ?? false;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginHook[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginHook | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Add a handler for a specific hook event
   */
  private addHandler(event: HookEvent, handler: HookHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Remove a handler from a specific hook event
   */
  private removeHandler(event: HookEvent, handler: HookHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit a hook event to all registered handlers
   */
  async emit(event: HookEvent, context?: Partial<HookContext>): Promise<void> {
    const fullContext: HookContext = {
      event,
      timestamp: Date.now(),
      ...context,
    };

    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const promises: Promise<void>[] = [];
    
    handlers.forEach((handler) => {
      try {
        const result = handler(fullContext);
        if (result instanceof Promise) {
          promises.push(result.catch((error) => {
            console.error(`[PluginRegistry] Hook handler error for ${event}:`, error);
          }));
        }
      } catch (error) {
        console.error(`[PluginRegistry] Hook handler error for ${event}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Emit hook synchronously (for testing)
   */
  emitSync(event: HookEvent, context?: Partial<HookContext>): void {
    const fullContext: HookContext = {
      event,
      timestamp: Date.now(),
      ...context,
    };

    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    handlers.forEach((handler) => {
      try {
        handler(fullContext);
      } catch (error) {
        console.error(`[PluginRegistry] Hook handler error for ${event}:`, error);
      }
    });
  }

  /**
   * Internal emit for hook system
   */
  private async emitHook(event: HookEvent, context?: Partial<HookContext>): Promise<void> {
    await this.emit(event, context);
  }

  /**
   * Get plugin configuration
   */
  private getPluginConfig(pluginId: string): Record<string, unknown> {
    try {
      if (this.storageAdapter) {
        const stored = this.storageAdapter.getItem(`${PLUGIN_STORAGE_KEY}_${pluginId}_config`);
        return stored ? JSON.parse(stored) : {};
      }
      const stored = localStorage.getItem(`${PLUGIN_STORAGE_KEY}_${pluginId}_config`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Set plugin configuration
   */
  private setPluginConfig(pluginId: string, key: string, value: unknown): void {
    try {
      const config = this.getPluginConfig(pluginId);
      config[key] = value;
      const configStr = JSON.stringify(config);
      
      if (this.storageAdapter) {
        this.storageAdapter.setItem(`${PLUGIN_STORAGE_KEY}_${pluginId}_config`, configStr);
      } else {
        localStorage.setItem(`${PLUGIN_STORAGE_KEY}_${pluginId}_config`, configStr);
      }
    } catch (error) {
      console.error(`[PluginRegistry] Failed to save config for plugin ${pluginId}:`, error);
    }
  }

  /**
   * Persist plugin enabled states to storage
   */
  private persistPluginStates(): void {
    try {
      const states: Record<string, boolean> = {};
      this.plugins.forEach((plugin, id) => {
        states[id] = plugin.enabled;
      });

      const statesStr = JSON.stringify(states);
      
      if (this.storageAdapter) {
        this.storageAdapter.setItem(PLUGIN_STORAGE_KEY, statesStr);
      } else {
        localStorage.setItem(PLUGIN_STORAGE_KEY, statesStr);
      }
    } catch (error) {
      console.error('[PluginRegistry] Failed to persist plugin states:', error);
    }
  }

  /**
   * Load persisted plugin states from storage
   */
  loadPersistedStates(): void {
    try {
      const statesStr = this.storageAdapter 
        ? this.storageAdapter.getItem(PLUGIN_STORAGE_KEY)
        : localStorage.getItem(PLUGIN_STORAGE_KEY);
      
      if (!statesStr) return;

      const states: Record<string, boolean> = JSON.parse(statesStr);
      
      Object.entries(states).forEach(([pluginId, enabled]) => {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
          plugin.enabled = enabled;
          if (enabled) {
            const factory = this.pluginFactories.get(pluginId);
            if (factory) {
              this.initializePlugin(pluginId, factory);
            }
          }
        }
      });
    } catch (error) {
      console.error('[PluginRegistry] Failed to load persisted plugin states:', error);
    }
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    // Disable first
    plugin.enabled = false;

    // Remove all handlers for this plugin's hooks
    plugin.manifest.hooks.forEach((hookEvent) => {
      // Handlers are shared, so we don't remove them here
      // They will be cleaned up when handlers are invoked
    });

    this.plugins.delete(pluginId);
    this.pluginFactories.delete(pluginId);
    this.persistPluginStates();
    return true;
  }
}

/**
 * Get the PluginRegistry singleton
 */
export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}

/**
 * Create a new PluginRegistry instance (for testing)
 */
export function createPluginRegistry(storageAdapter?: StorageAdapter): PluginRegistry {
  return PluginRegistry.getInstance(storageAdapter);
}
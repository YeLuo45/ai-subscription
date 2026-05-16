// PluginRegistry - manages plugin lifecycle (install/uninstall/enable/disable)
// with in-memory cache + IndexedDB persistence

import type { 
  PluginDefinition, 
  PluginManifest, 
  FetcherDefinition, 
  FetcherConfig, 
  FetcherResult,
  RegistryState,
  BUILT_IN_PLUGINS
} from './types';
import { BUILT_IN_PLUGINS as BuiltInIds } from './types';
import * as storage from './storage';
import { verifyEd25519Signature } from './verifier';
import { SandboxedFetcher, SandboxError } from './sandbox';
import { fetchFeedWithMetadata } from '../feedParser';

// RSS/Atom built-in fetcher plugin
const RSS_ATOM_FETCHER: FetcherDefinition = {
  id: BuiltInIds.RSS_ATOM,
  name: 'RSS/Atom Fetcher',
  description: 'Fetches articles from RSS and Atom feeds',
  icon: 'RssOutlined',
  fetch: async (config: FetcherConfig): Promise<FetcherResult> => {
    if (!config.url) {
      throw new Error('URL is required for RSS/Atom fetcher');
    }
    const result = await fetchFeedWithMetadata(config.url);
    return {
      articles: result.articles,
      metadata: {
        feedType: result.feedType,
        favicon: result.favicon,
        siteName: result.siteName,
        suggestedInterval: result.suggestedInterval,
      },
    };
  },
  validateConfig: (config: FetcherConfig) => {
    if (!config.url) {
      return { valid: false, errors: ['URL is required'] };
    }
    try {
      new URL(config.url);
      return { valid: true };
    } catch {
      return { valid: false, errors: ['Invalid URL format'] };
    }
  },
};

// Event types for plugin state changes
export type PluginEventType = 
  | 'plugin:installed'
  | 'plugin:uninstalled'
  | 'plugin:enabled'
  | 'plugin:disabled'
  | 'plugin:error';

export interface PluginEvent {
  type: PluginEventType;
  pluginId: string;
  timestamp: string;
  error?: string;
}

type EventListener = (event: PluginEvent) => void;

/**
 * PluginRegistry - Singleton managing plugin lifecycle
 * 
 * Features:
 * - In-memory cache for fast access
 * - IndexedDB persistence for offline survival
 * - Ed25519 signature verification for plugin integrity
 * - Sandboxed execution to prevent plugin errors from affecting main app
 */
class PluginRegistry {
  private static instance: PluginRegistry | null = null;
  
  // In-memory state
  private plugins: Map<string, PluginDefinition> = new Map();
  private fetchers: Map<string, SandboxedFetcher> = new Map();
  private eventListeners: Set<EventListener> = new Set();
  private initialized = false;

  // Built-in plugins
  private builtInFetchers: Map<string, FetcherDefinition> = new Map([
    [BuiltInIds.RSS_ATOM, RSS_ATOM_FETCHER],
  ]);

  private constructor() {}

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Initialize the registry from IndexedDB
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load persisted plugins
      const state = await storage.loadRegistryState();
      
      for (const plugin of state.plugins) {
        this.plugins.set(plugin.manifest.id, plugin);
        if (plugin.status === 'enabled' || plugin.status === 'installed') {
          await this.activateFetcher(plugin);
        }
      }

      // Register built-in plugins
      await this.registerBuiltInPlugins();
      
      this.initialized = true;
      this.emit({ type: 'plugin:enabled', pluginId: 'registry', timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to initialize plugin registry:', err);
      throw err;
    }
  }

  /**
   * Register built-in plugins
   */
  private async registerBuiltInPlugins(): Promise<void> {
    for (const [id, fetcher] of this.builtInFetchers) {
      const manifest: PluginManifest = {
        id,
        name: fetcher.name,
        version: '1.0.0',
        description: fetcher.description,
        author: 'System',
        entryPoint: 'builtin',
        icon: fetcher.icon,
        builtIn: true,
      };

      const existing = this.plugins.get(id);
      if (!existing) {
        const plugin: PluginDefinition = {
          manifest,
          status: 'enabled',
          installedAt: new Date().toISOString(),
          enabledAt: new Date().toISOString(),
        };
        this.plugins.set(id, plugin);
        await storage.savePlugin(plugin);
      }
      
      this.fetchers.set(id, new SandboxedFetcher(id, fetcher));
    }
  }

  /**
   * Install a plugin from manifest
   */
  async install(manifest: PluginManifest, sourceCode?: string): Promise<void> {
    // Verify signature if public key is provided
    if (manifest.publicKey && manifest.signature) {
      const manifestStr = JSON.stringify({ ...manifest, signature: undefined });
      const result = await verifyEd25519Signature(
        manifest.signature,
        manifestStr,
        manifest.publicKey
      );
      
      if (!result.valid) {
        throw new Error(`Plugin signature verification failed: ${result.error}`);
      }
    }

    // Check if plugin already exists
    const existing = this.plugins.get(manifest.id);
    if (existing) {
      throw new Error(`Plugin ${manifest.id} is already installed`);
    }

    // Create plugin definition
    const plugin: PluginDefinition = {
      manifest,
      status: 'installed',
      installedAt: new Date().toISOString(),
    };

    // Store in memory and persist
    this.plugins.set(manifest.id, plugin);
    await storage.savePlugin(plugin);

    this.emit({
      type: 'plugin:installed',
      pluginId: manifest.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    if (plugin.manifest.builtIn) {
      throw new Error(`Cannot uninstall built-in plugin ${pluginId}`);
    }

    // Disable before uninstalling
    if (plugin.status === 'enabled') {
      await this.disable(pluginId);
    }

    // Remove from memory and storage
    this.plugins.delete(pluginId);
    this.fetchers.delete(pluginId);
    await storage.deletePlugin(pluginId);

    this.emit({
      type: 'plugin:uninstalled',
      pluginId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Enable a plugin
   */
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    if (plugin.status === 'enabled') return;

    // Verify the plugin can be activated
    await this.activateFetcher(plugin);

    plugin.status = 'enabled';
    plugin.enabledAt = new Date().toISOString();
    plugin.lastError = undefined;

    await storage.savePlugin(plugin);

    this.emit({
      type: 'plugin:enabled',
      pluginId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Disable a plugin
   */
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    if (plugin.status === 'disabled') return;

    this.fetchers.delete(pluginId);
    plugin.status = 'disabled';

    await storage.savePlugin(plugin);

    this.emit({
      type: 'plugin:disabled',
      pluginId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Activate a fetcher plugin (create sandboxed instance)
   */
  private async activateFetcher(plugin: PluginDefinition): Promise<void> {
    // Check if it's a built-in fetcher
    const builtIn = this.builtInFetchers.get(plugin.manifest.id);
    if (builtIn) {
      this.fetchers.set(plugin.manifest.id, new SandboxedFetcher(plugin.manifest.id, builtIn));
      return;
    }

    // For custom plugins, we would load and instantiate here
    // For now, just mark as active
    // TODO: Implement dynamic plugin loading from source
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): PluginDefinition | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): PluginDefinition[] {
    return this.getAllPlugins().filter(p => p.status === 'enabled');
  }

  /**
   * Fetch articles using a plugin's fetcher
   */
  async fetchWithPlugin(
    pluginId: string,
    config: FetcherConfig
  ): Promise<FetcherResult> {
    const fetcher = this.fetchers.get(pluginId);
    if (!fetcher) {
      throw new Error(`Plugin ${pluginId} is not enabled or has no fetcher`);
    }

    try {
      return await fetcher.fetch(config);
    } catch (err) {
      if (err instanceof SandboxError) {
        // Update plugin error state
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
          plugin.lastError = err.message;
          await storage.savePlugin(plugin);
        }
        this.emit({
          type: 'plugin:error',
          pluginId,
          timestamp: new Date().toISOString(),
          error: err.message,
        });
      }
      throw err;
    }
  }

  /**
   * Validate config for a plugin
   */
  validatePluginConfig(pluginId: string, config: FetcherConfig) {
    const fetcher = this.fetchers.get(pluginId);
    if (!fetcher) {
      return { valid: false, errors: [`Plugin ${pluginId} not found or not enabled`] };
    }
    return fetcher.validateConfig?.(config) || { valid: true };
  }

  /**
   * Subscribe to plugin events
   */
  addEventListener(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit a plugin event
   */
  private emit(event: PluginEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Plugin event listener error:', err);
      }
    }
  }

  /**
   * Get the RSS/Atom fetcher for use by subscription system
   */
  getBuiltInFetcher(): FetcherDefinition {
    return RSS_ATOM_FETCHER;
  }

  /**
   * Get all built-in plugin IDs
   */
  getBuiltInPluginIds(): readonly string[] {
    return [BuiltInIds.RSS_ATOM];
  }
}

// Export singleton accessor
export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}

// Export types
export type { PluginRegistry } from './types';
export { BUILT_IN_PLUGINS } from './types';

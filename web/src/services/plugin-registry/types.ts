// Plugin Registry Type Definitions
import type { Article } from '../../types';

// Plugin manifest definition
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  icon?: string;
  dependencies?: Record<string, string>;
  permissions?: string[];
  signature?: string;  // Ed25519 signature for verification
  publicKey?: string;  // Base64 encoded Ed25519 public key
  sourceUrl?: string;
  builtIn?: boolean;
}

// Plugin definition with runtime state
export interface PluginDefinition {
  manifest: PluginManifest;
  status: 'installed' | 'uninstalled' | 'enabled' | 'disabled';
  installedAt?: string;
  enabledAt?: string;
  lastError?: string;
}

// Fetcher plugin - handles fetching articles from a source
export interface FetcherDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fetch: (config: FetcherConfig) => Promise<FetcherResult>;
  validateConfig?: (config: FetcherConfig) => ValidationResult;
}

export interface FetcherConfig {
  url?: string;
  customHeaders?: Record<string, string>;
  timeout?: number;
  [key: string]: unknown;
}

export interface FetcherResult {
  articles: Article[];
  metadata?: {
    feedType?: 'rss' | 'atom' | 'jsonfeed' | 'unknown';
    favicon?: string | null;
    siteName?: string | null;
    suggestedInterval?: number;
    error?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// Registry state persisted to IndexedDB
export interface RegistryState {
  plugins: PluginDefinition[];
  lastSyncAt: string;
}

// Plugin load context
export interface PluginContext {
  config: FetcherConfig;
  onError: (error: Error) => void;
}

// Marketplace plugin listing
export interface MarketplacePlugin {
  manifest: PluginManifest;
  downloadCount: number;
  rating: number;
  category: string;
}

// Built-in plugin IDs
export const BUILT_IN_PLUGINS = {
  RSS_ATOM: 'builtin-rss-atom-fetcher',
} as const;

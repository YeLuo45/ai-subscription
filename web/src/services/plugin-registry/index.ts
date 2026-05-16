// Plugin Registry - Public API
// Provides plugin lifecycle management with signature verification and sandboxing

export {
  // Registry singleton and types
  getPluginRegistry,
  type PluginRegistry,
  type PluginEvent,
  type PluginEventType,
} from './registry';

export {
  // Plugin types
  type PluginManifest,
  type PluginDefinition,
  type FetcherDefinition,
  type FetcherConfig,
  type FetcherResult,
  type ValidationResult,
  type MarketplacePlugin,
  type RegistryState,
  BUILT_IN_PLUGINS,
} from './types';

// Signature verification
export {
  verifyEd25519Signature,
  verifyPluginManifest,
  isEd25519Supported,
  type VerifyResult,
} from './verifier';

// Marketplace
export {
  fetchMarketplacePlugins,
  fetchPluginManifest,
  fetchPluginSource,
  searchPlugins,
  getPluginsByCategory,
} from './marketplace';

// Sandbox utilities
export {
  SandboxError,
  SandboxedFetcher,
  createSandboxContext,
  createIsolationProxy,
} from './sandbox';

// Storage utilities
export {
  loadRegistryState,
  saveRegistryState,
  getAllPlugins,
  savePlugin,
  deletePlugin,
  clearAllPlugins,
} from './storage';

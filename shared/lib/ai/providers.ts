/**
 * Provider Registry
 * Central registry of all supported AI providers and their model configurations
 */

import type { ProviderConfig, ProviderId } from './types/provider';

// ============================================================
// Provider Registry
// ============================================================

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  minimax: {
    id: 'minimax',
    type: 'anthropic-compatible',
    defaultBaseUrl: 'https://api.minimax.chat/v1',
    requiresApiKey: true,
    models: [
      {
        id: 'MiniMax-Text-01',
        contextWindow: 1000000,
        outputWindow: 128000,
        capabilities: { streaming: true, tools: false, vision: false },
      },
      {
        id: 'abab6.5s',
        contextWindow: 1000000,
        outputWindow: 128000,
        capabilities: { streaming: true, tools: false, vision: false },
      },
    ],
  },
  deepseek: {
    id: 'deepseek',
    type: 'openai-compatible',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    requiresApiKey: true,
    models: [
      {
        id: 'deepseek-chat',
        contextWindow: 64000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'deepseek-reasoner',
        contextWindow: 64000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: false, vision: false },
      },
    ],
  },
  kimi: {
    id: 'kimi',
    type: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    requiresApiKey: true,
    models: [
      {
        id: 'moonshot-v1-8k',
        contextWindow: 8000,
        outputWindow: 8000,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'moonshot-v1-32k',
        contextWindow: 32000,
        outputWindow: 32000,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'moonshot-v1-128k',
        contextWindow: 128000,
        outputWindow: 128000,
        capabilities: { streaming: true, tools: true, vision: false },
      },
    ],
  },
  openai: {
    id: 'openai',
    type: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    models: [
      {
        id: 'gpt-4o-mini',
        contextWindow: 128000,
        outputWindow: 16384,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'gpt-4o',
        contextWindow: 128000,
        outputWindow: 16384,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'o3-mini',
        contextWindow: 128000,
        outputWindow: 100000,
        capabilities: { streaming: true, tools: false, vision: false },
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    type: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        contextWindow: 200000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        contextWindow: 200000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
  },
  google: {
    id: 'google',
    type: 'google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    models: [
      {
        id: 'gemini-2.0-flash',
        contextWindow: 1000000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'gemini-2.5-pro-preview-06-05',
        contextWindow: 1000000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
  },
};

// ============================================================
// Provider Resolution Helpers
// ============================================================

/** Map model ID prefix to provider type */
const MODEL_PREFIX_MAP: Record<string, ProviderId> = {
  'minimax': 'minimax',
  'abab': 'minimax',
  'deepseek': 'deepseek',
  'moonshot': 'kimi',
  'kimi': 'kimi',
  'gpt-': 'openai',
  'o3': 'openai',
  'o4': 'openai',
  'claude': 'anthropic',
  'gemini': 'google',
};

/**
 * Resolve provider ID from a model string
 * Handles formats like "minimax/MiniMax-Text-01" or just "gpt-4o-mini"
 */
function resolveProviderType(model: string): ProviderId {
  const colonIdx = model.indexOf('/');
  const candidate = colonIdx > 0 ? model.slice(0, colonIdx) : model;

  // Check if it's a full model ID like "minimax/abab6.5s"
  if (PROVIDERS[candidate as ProviderId]) {
    return candidate as ProviderId;
  }

  // Check prefix mapping
  for (const [prefix, providerId] of Object.entries(MODEL_PREFIX_MAP)) {
    if (candidate.startsWith(prefix)) {
      return providerId;
    }
  }

  // Default to openai-compatible
  return 'openai';
}

/**
 * Resolve the actual model ID from a full model string
 * "minimax/MiniMax-Text-01" -> "MiniMax-Text-01"
 */
function resolveModelId(model: string): string {
  const colonIdx = model.indexOf('/');
  return colonIdx > 0 ? model.slice(colonIdx + 1) : model;
}

/**
 * Get provider config by ID
 */
function getProviderConfig(providerId: ProviderId): ProviderConfig | undefined {
  return PROVIDERS[providerId];
}

// Export functions
export { resolveProviderType, resolveModelId, getProviderConfig };

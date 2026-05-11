/**
 * AI Subscription Provider Registry
 * Model registry for ai-subscription with routing metadata
 * Based on llm-design-dev's PROVIDERS architecture
 */

import type { ProviderConfig, ProviderId, ProviderType, ModelInfo, ThinkingCapability } from './types/provider';

// Task types for routing
export type TaskType = 
  | 'translation'
  | 'quick-summary'      // <500 chars, simple structure
  | 'standard-summary'   // medium length
  | 'structured-summary' // needs multi-dimensional output (title + key_points + tags)
  | 'tag-generation'
  | 'knowledge-graph'    // entity extraction
  | 'chat'              // conversational interaction
  | 'push-strategy';    // push notification content strategy generation

// Model cost rank (1=cheapest, 3=most expensive)
export type CostRank = 1 | 2 | 3;

// Extended model info with routing metadata
export interface RouterModelInfo extends ModelInfo {
  taskTypes: TaskType[];
  costRank: CostRank;
  recommendedFor?: string[];  // Specific use cases where this model excels
}

// Provider config with routing support
export interface RouterProviderConfig extends Omit<ProviderConfig, 'models'> {
  models: RouterModelInfo[];
  thinking?: ThinkingCapability;
}

// ============================================================
// AI Subscription Providers
// ============================================================

export const AI_SUBSCRIPTION_PROVIDERS: Record<string, RouterProviderConfig> = {
  openai: {
    id: 'openai',
    type: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    thinking: {
      type: 'openai',
    },
    models: [
      {
        id: 'gpt-4o',
        contextWindow: 128000,
        outputWindow: 16384,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['structured-summary', 'tag-generation', 'chat', 'push-strategy'],
        costRank: 3,
        recommendedFor: ['multi-dimensional-output', 'high-accuracy-tags'],
      },
      {
        id: 'gpt-4o-mini',
        contextWindow: 128000,
        outputWindow: 16384,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['quick-summary', 'translation'],
        costRank: 1,
        recommendedFor: ['low-latency', 'cost-sensitive'],
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    type: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    thinking: {
      type: 'anthropic',
      minBudgetTokens: 1000,
      maxBudgetTokens: 40000,
    },
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        contextWindow: 200000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['standard-summary', 'structured-summary'],
        costRank: 2,
        recommendedFor: ['structured-output', 'reasoning'],
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        contextWindow: 200000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['standard-summary', 'structured-summary', 'chat', 'push-strategy'],
        costRank: 2,
        recommendedFor: ['balanced-performance'],
      },
    ],
  },
  google: {
    id: 'google',
    type: 'google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    thinking: {
      type: 'google',
    },
    models: [
      {
        id: 'gemini-2.0-flash',
        contextWindow: 1000000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['translation', 'quick-summary'],
        costRank: 1,
        recommendedFor: ['high-volume', 'low-latency', 'cost-effective'],
      },
      {
        id: 'gemini-2.5-pro-preview-06-05',
        contextWindow: 1000000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['knowledge-graph', 'standard-summary', 'structured-summary', 'push-strategy'],
        costRank: 2,
        recommendedFor: ['deep-understanding', 'entity-extraction'],
      },
    ],
  },
};

// ============================================================
// Model Lookup Helpers
// ============================================================

/**
 * Find the best model for a given task type
 */
export function findModelForTask(
  taskType: TaskType,
  preferredProvider?: ProviderId
): { providerId: string; modelId: string; model: RouterModelInfo } | null {
  // If preferred provider specified, try that first
  if (preferredProvider) {
    const provider = AI_SUBSCRIPTION_PROVIDERS[preferredProvider];
    if (provider) {
      const model = provider.models.find(m => m.taskTypes.includes(taskType));
      if (model) {
        return { providerId: provider.id, modelId: model.id, model };
      }
    }
  }

  // Search all providers for matching model
  for (const [providerId, provider] of Object.entries(AI_SUBSCRIPTION_PROVIDERS)) {
    const model = provider.models.find(m => m.taskTypes.includes(taskType));
    if (model) {
      return { providerId, modelId: model.id, model };
    }
  }

  return null;
}

/**
 * Get fallback chain for a task type
 * Returns models in order of preference for fallback
 */
export function getFallbackChain(taskType: TaskType): Array<{ providerId: string; modelId: string }> {
  const chain: Array<{ providerId: string; modelId: string }> = [];

  for (const [providerId, provider] of Object.entries(AI_SUBSCRIPTION_PROVIDERS)) {
    const model = provider.models.find(m => m.taskTypes.includes(taskType));
    if (model) {
      chain.push({ providerId, modelId: model.id });
    }
  }

  return chain;
}

/**
 * Get all models sorted by cost rank
 */
export function getModelsByCost(taskType: TaskType): Array<{ providerId: string; modelId: string; costRank: CostRank }> {
  const models: Array<{ providerId: string; modelId: string; costRank: CostRank }> = [];

  for (const [providerId, provider] of Object.entries(AI_SUBSCRIPTION_PROVIDERS)) {
    const model = provider.models.find(m => m.taskTypes.includes(taskType));
    if (model) {
      models.push({ providerId, modelId: model.id, costRank: model.costRank });
    }
  }

  return models.sort((a, b) => a.costRank - b.costRank);
}

// Re-export types for convenience
export type { ProviderConfig, ProviderId, ProviderType, ModelInfo, ThinkingCapability };

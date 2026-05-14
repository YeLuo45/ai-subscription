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
  | 'push-strategy'    // push notification content strategy generation
  | 'intent-classification'; // natural language intent parsing

// Model cost rank (1=cheapest, 3=most expensive)
export type CostRank = 1 | 2 | 3;

// Routing condition for fine-grained model selection
export interface RoutingCondition {
  // Content-based conditions
  minContentLength?: number;   // Minimum content length in characters
  maxContentLength?: number;   // Maximum content length in characters
  requiresVision?: boolean;     // Content requires vision capability
  
  // Quality vs Speed preference
  // 'speed' - prefer low latency models
  // 'quality' - prefer high accuracy models  
  // 'balanced' - balance between speed and quality
  preference?: 'speed' | 'quality' | 'balanced';
  
  // Provider preference (higher = more preferred)
  // Can be used to prefer certain providers over others
  providerPriority?: Record<string, number>;
}

// Extended model info with routing metadata
export interface RouterModelInfo extends ModelInfo {
  taskTypes: TaskType[];
  costRank: CostRank;
  recommendedFor?: string[];  // Specific use cases where this model excels
  routingCondition?: RoutingCondition; // Optional condition for model selection
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
        routingCondition: {
          preference: 'quality',
          requiresVision: true,
        },
      },
      {
        id: 'gpt-4o-mini',
        contextWindow: 128000,
        outputWindow: 16384,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['quick-summary', 'translation'],
        costRank: 1,
        recommendedFor: ['low-latency', 'cost-sensitive'],
        routingCondition: {
          preference: 'speed',
        },
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
        routingCondition: {
          preference: 'balanced',
        },
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        contextWindow: 200000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['standard-summary', 'structured-summary', 'chat', 'push-strategy'],
        costRank: 2,
        recommendedFor: ['balanced-performance'],
        routingCondition: {
          preference: 'balanced',
        },
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
        taskTypes: ['translation', 'quick-summary', 'intent-classification'],
        costRank: 1,
        recommendedFor: ['high-volume', 'low-latency', 'cost-effective'],
        routingCondition: {
          preference: 'speed',
          maxContentLength: 100000,
        },
      },
      {
        id: 'gemini-2.5-pro-preview-06-05',
        contextWindow: 1000000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
        taskTypes: ['knowledge-graph', 'standard-summary', 'structured-summary', 'push-strategy'],
        costRank: 2,
        recommendedFor: ['deep-understanding', 'entity-extraction'],
        routingCondition: {
          preference: 'quality',
          maxContentLength: 200000,
        },
      },
    ],
  },
  // Local WebLLM provider for offline/fallback scenarios
  local: {
    id: 'local',
    type: 'local',
    defaultBaseUrl: '',  // Not used for local
    requiresApiKey: false,
    thinking: undefined,
    models: [
      {
        id: 'qwen2-0.5b',
        contextWindow: 32000,
        outputWindow: 1024,
        capabilities: { streaming: false, tools: false, vision: false },
        taskTypes: ['intent-classification', 'tag-generation'],
        costRank: 1,
        recommendedFor: ['offline', 'low-latency', 'privacy-sensitive'],
        routingCondition: {
          preference: 'speed',
        },
      },
      {
        id: 'qwen2-0.5b-summary',
        contextWindow: 32000,
        outputWindow: 512,
        capabilities: { streaming: false, tools: false, vision: false },
        taskTypes: ['quick-summary', 'translation'],
        costRank: 1,
        recommendedFor: ['offline', 'quick-tasks'],
        routingCondition: {
          preference: 'speed',
          maxContentLength: 2000,
        },
      },
    ],
  },
};

// ============================================================
// Model Lookup Helpers
// ============================================================

/**
 * Score a model for a given task based on conditions
 * Returns a score where higher is better (0 means incompatible)
 */
function scoreModelForConditions(
  model: RouterModelInfo,
  conditions?: RoutingCondition
): number {
  if (!conditions) return 1; // No conditions = neutral score

  const condition = model.routingCondition;
  if (!condition) return 0.5; // Model without conditions gets neutral score

  let score = 1.0;

  // Check content length constraints
  if (conditions.minContentLength !== undefined && condition.maxContentLength !== undefined) {
    if (conditions.minContentLength > condition.maxContentLength) {
      return 0; // Incompatible - requested min exceeds model max
    }
  }

  if (conditions.maxContentLength !== undefined && condition.minContentLength !== undefined) {
    if (conditions.maxContentLength < condition.minContentLength) {
      return 0; // Incompatible - requested max below model min
    }
  }

  // Check vision requirement
  if (conditions.requiresVision && !model.capabilities.vision) {
    return 0; // Incompatible - model doesn't support vision
  }

  // Score based on preference match
  if (conditions.preference && condition.preference) {
    if (conditions.preference === condition.preference) {
      score += 0.5; // Exact match bonus
    } else if (
      (conditions.preference === 'balanced' && condition.preference !== 'balanced') ||
      (conditions.preference !== 'balanced' && condition.preference === 'balanced')
    ) {
      score += 0.2; // Partial match
    }
  }

  // Provider priority bonus
  if (conditions.providerPriority) {
    const providerId = model.taskTypes.length > 0 ? Object.keys(conditions.providerPriority)[0] : undefined;
    if (providerId && conditions.providerPriority[providerId]) {
      score += conditions.providerPriority[providerId] * 0.1;
    }
  }

  return score;
}

/**
 * Find the best model for a given task type with optional conditions
 */
export function findModelForTask(
  taskType: TaskType,
  preferredProvider?: ProviderId,
  conditions?: RoutingCondition
): { providerId: string; modelId: string; model: RouterModelInfo } | null {
  // If preferred provider specified, try that first
  if (preferredProvider) {
    const provider = AI_SUBSCRIPTION_PROVIDERS[preferredProvider];
    if (provider) {
      const model = provider.models.find(m => m.taskTypes.includes(taskType));
      if (model) {
        const score = scoreModelForConditions(model, conditions);
        if (score > 0) {
          return { providerId: provider.id, modelId: model.id, model };
        }
      }
    }
  }

  // Search all providers for matching model
  // Keep track of best scored model
  let bestMatch: { providerId: string; modelId: string; model: RouterModelInfo; score: number } | null = null;

  for (const [providerId, provider] of Object.entries(AI_SUBSCRIPTION_PROVIDERS)) {
    const model = provider.models.find(m => m.taskTypes.includes(taskType));
    if (model) {
      const score = scoreModelForConditions(model, conditions);
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { providerId, modelId: model.id, model, score };
      }
    }
  }

  return bestMatch ? { 
    providerId: bestMatch.providerId, 
    modelId: bestMatch.modelId, 
    model: bestMatch.model 
  } : null;
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

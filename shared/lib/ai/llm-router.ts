/**
 * LLM Router - Unified Interface for AI Model Routing
 * Provides routeAndCall with automatic thinking config injection and fallback
 * Enhanced with cost-aware routing, provider health checking, and budget control
 */

import { callLLM } from './llm';
import type { SimpleMessage, ThinkingConfig } from './types/provider';
import { AI_SUBSCRIPTION_PROVIDERS, findModelForTask, type TaskType, type RoutingCondition, type RouterModelInfo } from './providers-ai-subscription';

// Cost optimizer imports
import {
  estimateCost,
  getHealthChecker,
  getBudgetController,
  rankModels,
  selectBestModel,
  type ProviderHealth,
} from './cost-optimizer';

// Routing history imports
import type { RoutingDecision, RoutingExplanation } from './routing-history/index';

// Re-export TaskType for convenience
export { type TaskType } from './providers-ai-subscription';

// Local model support - task types that can use local models
const LOCAL_CAPABLE_TASKS = ['quick-summary', 'tag-generation', 'intent-classification'];

/**
 * Check if a task type is capable of local inference
 */
export function isLocalCapableTask(taskType: TaskType): boolean {
  return LOCAL_CAPABLE_TASKS.includes(taskType);
}

// ============================================================
// Thinking Config Builder for Router
// ============================================================

/**
 * Get thinking config for a specific model based on provider type
 */
function getThinkingConfigForModel(modelId: string): ThinkingConfig | undefined {
  // Find model in providers to get provider type
  for (const provider of Object.values(AI_SUBSCRIPTION_PROVIDERS)) {
    const model = provider.models.find(m => m.id === modelId);
    if (model) {
      // Enable thinking for appropriate models
      switch (provider.type) {
        case 'anthropic':
          return {
            enabled: true,
            budgetTokens: 4000, // Reasonable thinking budget
          };
        case 'openai':
        case 'openai-compatible':
          // Only o-series models use reasoningEffort
          if (modelId.startsWith('o')) {
            return {
              enabled: true,
              reasoningEffort: 'medium',
            };
          }
          return undefined;
        case 'google':
          return {
            enabled: true,
            thinkingBudget: 2000,
          };
        default:
          return undefined;
      }
    }
  }
  return undefined;
}

// ============================================================
// Route and Call
// ============================================================

export interface RouteAndCallOptions {
  taskType: TaskType;
  messages: SimpleMessage[];
  modelId?: string;        // Optional explicit model override
  providerId?: string;     // Optional explicit provider override
  forceProvider?: 'local' | 'cloud';  // Force specific provider type
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  schema?: any;            // Optional output schema for structured response
  thinking?: ThinkingConfig; // Override thinking config
  conditions?: RoutingCondition; // Optional routing conditions for conditional selection
}

/**
 * Route task to appropriate model and execute LLM call
 */
export async function routeAndCall(
  options: RouteAndCallOptions
): Promise<{
  text: string;
  modelId: string;
  providerId: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const { 
    taskType, 
    messages, 
    modelId: explicitModel, 
    providerId: explicitProvider,
    forceProvider,
    temperature = 0.7,
    maxTokens = 4000,
    apiKey,
    schema,
    conditions,
  } = options;

  // Get content length for routing decisions
  const contentLength = messages.reduce((len, msg) => len + (msg.content?.length || 0), 0);
  
  // Determine which model to use with cost-aware routing
  let selectedModelId: string;
  let selectedProviderId: string;

  // Note: Local inference is handled at the web layer, not here in shared.
  // The router still supports 'local' as a providerId for explicit routing,
  // but actual local inference calls go directly to local-inference service.
  
  // When forceProvider is 'local', route to local provider model
  if (forceProvider === 'local') {
    const modelInfo = findModelForTask(taskType, 'local', conditions);
    if (modelInfo) {
      selectedModelId = modelInfo.modelId;
      selectedProviderId = 'local';
    } else {
      throw new Error(`No local model found for task type: ${taskType}`);
    }
  } else if (explicitModel && explicitProvider) {
    selectedModelId = explicitModel;
    selectedProviderId = explicitProvider;
  } else {
    // Cost-aware routing: estimate cost, check health, and score models
    const costEst = estimateCost(messages.map(m => m.content || '').join('\n'), taskType);
    console.log(`[Cost Optimizer] ${taskType} cost estimate: ~${costEst.inputTokens} tokens, ~$${costEst.costUSD.toFixed(6)} USD`);

    // Check budget limits
    const budgetController = getBudgetController();
    const { throttle, reason: budgetReason } = await budgetController.shouldThrottle();
    
    if (throttle) {
      console.warn(`[Cost Optimizer] Budget exceeded: ${budgetReason}`);
      const fallback = budgetController.getFallbackStrategy();
      
      if (fallback === 'local') {
        // Fall back to local model
        const modelInfo = findModelForTask(taskType, 'local', conditions);
        if (modelInfo) {
          selectedModelId = modelInfo.modelId;
          selectedProviderId = 'local';
          console.log(`[Cost Optimizer] Falling back to local model due to budget`);
        } else {
          throw new Error(`Budget exceeded and no local fallback available for: ${taskType}`);
        }
      } else if (fallback === 'reject') {
        throw new Error(`Budget exceeded: ${budgetReason}`);
      } else {
        // free-tier: try cheapest available
        console.log(`[Cost Optimizer] Budget exceeded, searching for free-tier option`);
      }
    }

    // Check provider health for all available providers
    const healthChecker = getHealthChecker();
    const healthMap = await healthChecker.checkAllProviders();
    
    // Get preference from conditions or default to 'balanced'
    const preference = conditions?.preference || 'balanced';
    
    // Collect all candidate models for this task type
    const candidates: Array<{ model: RouterModelInfo; providerId: string }> = [];
    for (const [providerId, provider] of Object.entries(AI_SUBSCRIPTION_PROVIDERS)) {
      const model = provider.models.find(m => m.taskTypes.includes(taskType));
      if (model) {
        candidates.push({ model, providerId });
      }
    }

    // Score and rank candidates using rankModels (which logs detailed scoring)
    const ranked = rankModels(candidates, contentLength, preference, healthMap);

    // Build alternatives with reasons for routing history
    const alternatives: Array<{ model: string; provider: string; score: number; reason: string }> = [];
    for (let i = 1; i < ranked.length; i++) {
      const r = ranked[i];
      let reason = '';
      if (!r.health.available) {
        reason = 'health check failed';
      } else if (r.model.costRank > ranked[0].model.costRank) {
        reason = 'costRank too high';
      } else {
        reason = 'preference mismatch';
      }
      alternatives.push({
        model: r.model.id,
        provider: r.providerId,
        score: r.score,
        reason,
      });
    }

    if (ranked.length > 0) {
      const best = ranked[0];

      if (best.health.available) {
        selectedModelId = best.model.id;
        selectedProviderId = best.providerId;
      } else {
        // All providers unavailable, fall back to local if available
        console.warn(`[Cost Optimizer] All cloud providers unavailable, checking local fallback`);
        const modelInfo = findModelForTask(taskType, 'local', conditions);
        if (modelInfo) {
          selectedModelId = modelInfo.modelId;
          selectedProviderId = 'local';
        } else {
          throw new Error(`No available providers and no local fallback for: ${taskType}`);
        }
      }
    } else {
      throw new Error(`No model found for task type: ${taskType}`);
    }

    // Log the routing decision
    console.log(`[LLM Router] ${taskType} → ${selectedProviderId}/${selectedModelId}`);

    // Save routing decision to history (async, non-blocking)
    const routingDecision: RoutingDecision = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      taskType,
      contentLength,
      selectedModel: selectedModelId,
      selectedProvider: selectedProviderId,
      selectedScore: ranked[0]?.score || 0,
      alternatives,
      estimatedCostUSD: costEst.costUSD,
    };
    saveRoutingDecisionAsync(routingDecision);

  // Check quota before making the call
  const { checkQuota } = await import('./billing/quota-tracker');
  const quotaCheck = await checkQuota();
  if (!quotaCheck.allowed) {
    throw new Error(`Quota exceeded: ${quotaCheck.reason}. Please upgrade your plan.`);
  }
  if (quotaCheck.status?.isWarning) {
    console.warn(`[LLM Router] Warning: ${quotaCheck.status.usagePercent.toFixed(1)}% quota used`);
  }

  // Get thinking config for the selected model
  const thinkingConfig = options.thinking ?? getThinkingConfigForModel(selectedModelId);

  // Construct model string for callLLM (format: "provider/model")
  const modelString = `${selectedProviderId}/${selectedModelId}`;

  // Execute the call
  const result = await callLLM(
    {
      model: modelString,
      messages,
      temperature,
      maxTokens,
      apiKey,
    },
    `route:${taskType}`,
    undefined, // No retry options for now
    thinkingConfig
  );

  // Record cost if available
  recordCostAsync(taskType, selectedModelId, selectedProviderId, result.usage, true);

  // Auto-trigger cost alert check
  triggerCostAlertCheck();

  return {
    text: result.text,
    modelId: selectedModelId,
    providerId: selectedProviderId,
    usage: result.usage,
  };
}

/**
 * Async cost recording - doesn't block the response
 */
function recordCostAsync(
  taskType: TaskType,
  modelId: string,
  providerId: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined,
  success: boolean
): void {
  // Dynamically import cost tracker to avoid circular deps
  import('./cost-tracker').then(({ calculateCost, addRecord }) => {
    const inputTokens = usage?.promptTokens || 0;
    const outputTokens = usage?.completionTokens || 0;
    const costUSD = calculateCost(modelId, inputTokens, outputTokens);

    addRecord({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      taskType,
      modelId,
      provider: providerId,
      inputTokens,
      outputTokens,
      costUSD,
      latencyMs: 0, // Not tracking latency here
      success,
    }).catch(() => {
      // Silently fail
    });
  }).catch(() => {
    // Cost tracker not available
  });
}

/**
 * Trigger cost alert check asynchronously
 */
function triggerCostAlertCheck(): void {
  if (typeof window === 'undefined') return; // Only run in browser
  
  import('./cost-alert').then(({ getCostAlertService }) => {
    const service = getCostAlertService();
    service.checkAndAlert().catch(() => {
      // Silently fail
    });
  }).catch(() => {
    // Cost alert module not available
  });
}

// ============================================================
// Routing Explanation (last decision)
// ============================================================

let lastRoutingDecision: RoutingDecision | null = null;

/**
 * Get the explanation for the most recent routing decision
 */
export function getRoutingExplanation(): RoutingExplanation | null {
  if (!lastRoutingDecision) return null;

  const decision = lastRoutingDecision;
  const factors: RoutingExplanation['factors'] = [];

  // Analyze selected model factors
  factors.push({
    factor: 'Cost Rank',
    impact: decision.selectedScore > 5 ? 'positive' : 'neutral',
    detail: `Selected model has costRank ${decision.alternatives.length > 0 ? 'was lowest among candidates' : 'unknown'}`,
  });

  // Health factor
  const wasAvailable = decision.selectedScore > -1000;
  factors.push({
    factor: 'Health Status',
    impact: wasAvailable ? 'positive' : 'negative',
    detail: wasAvailable ? 'Provider was available' : 'Provider was down',
  });

  // Preference factor
  factors.push({
    factor: 'Preference Match',
    impact: 'neutral',
    detail: `Task type: ${decision.taskType}`,
  });

  return {
    decision,
    summary: `Selected ${decision.selectedProvider}/${decision.selectedModel} for ${decision.taskType} at ~$${decision.estimatedCostUSD.toFixed(6)} USD`,
    factors,
  };
}

/**
 * Save routing decision asynchronously (non-blocking)
 */
function saveRoutingDecisionAsync(decision: RoutingDecision): void {
  if (typeof window === 'undefined') return; // Only run in browser
  
  lastRoutingDecision = decision;
  
  import('./routing-history').then(({ saveRoutingDecision }) => {
    saveRoutingDecision(decision).catch(() => {
      // Silently fail
    });
  }).catch(() => {
    // Routing history module not available
  });
}

// ============================================================
// Route and Call with Fallback
// ============================================================

export async function routeAndCallWithFallback(
  options: RouteAndCallOptions
): Promise<{
  text: string;
  modelId: string;
  providerId: string;
  fallbackModelId?: string;
  fallbackProviderId?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const {
    taskType,
    messages,
    temperature = 0.7,
    maxTokens = 4000,
    apiKey,
    schema,
  } = options;

  // Get fallback chain
  const { getFallbackChain } = await import('./providers-ai-subscription');
  const chain = getFallbackChain(taskType);

  let lastError: Error | undefined;

  for (let i = 0; i < chain.length; i++) {
    const { modelId, providerId } = chain[i];

    try {
      console.log(`[LLM Router] Attempt ${i + 1}/${chain.length}: ${providerId}/${modelId}`);

      const result = await routeAndCall({
        ...options,
        modelId,
        providerId,
      });

      return {
        text: result.text,
        modelId: result.modelId,
        providerId: result.providerId,
        fallbackModelId: i > 0 ? chain[i - 1].modelId : undefined,
        fallbackProviderId: i > 0 ? chain[i - 1].providerId : undefined,
        usage: result.usage,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[LLM Router] ${providerId}/${modelId} failed: ${lastError.message}`);
    }
  }

  throw lastError || new Error(`All models failed for task type: ${taskType}`);
}

// ============================================================
// Prompt-based Helpers
// ============================================================

/**
 * Create a simple prompt-based routeAndCall helper
 */
export async function routeAndPrompt(
  taskType: TaskType,
  prompt: string,
  options?: Partial<Omit<RouteAndCallOptions, 'taskType' | 'messages'>>
): Promise<{
  text: string;
  modelId: string;
  providerId: string;
}> {
  return routeAndCall({
    taskType,
    messages: [{ role: 'user', content: prompt }],
    ...options,
  });
}

/**
 * Create a structured output routeAndCall helper
 */
export async function routeAndStructuredCall<T>(
  taskType: TaskType,
  prompt: string,
  schema: any, // z.ZodSchema<T>
  options?: Partial<Omit<RouteAndCallOptions, 'taskType' | 'messages'>>
): Promise<{
  data: T;
  modelId: string;
  providerId: string;
}> {
  const result = await routeAndCall({
    taskType,
    messages: [{ role: 'user', content: prompt }],
    ...options,
  });

  // Parse structured output if schema provided
  // For simplicity, we return text and let caller parse
  // In production, could use ai SDK's structured output features
  return {
    data: result.text as unknown as T,
    modelId: result.modelId,
    providerId: result.providerId,
  };
}

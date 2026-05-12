/**
 * LLM Router - Unified Interface for AI Model Routing
 * Provides routeAndCall with automatic thinking config injection and fallback
 */

import { callLLM } from './llm';
import type { SimpleMessage, ThinkingConfig } from './types/provider';
import { AI_SUBSCRIPTION_PROVIDERS, findModelForTask, type TaskType } from './providers-ai-subscription';

// Re-export TaskType for convenience
export { type TaskType } from './providers-ai-subscription';

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
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  schema?: any;            // Optional output schema for structured response
  thinking?: ThinkingConfig; // Override thinking config
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
    temperature = 0.7,
    maxTokens = 4000,
    apiKey,
    schema,
  } = options;

  // Determine which model to use
  let selectedModelId: string;
  let selectedProviderId: string;

  if (explicitModel && explicitProvider) {
    selectedModelId = explicitModel;
    selectedProviderId = explicitProvider;
  } else {
    const modelInfo = findModelForTask(taskType);
    if (!modelInfo) {
      throw new Error(`No model found for task type: ${taskType}`);
    }
    selectedModelId = modelInfo.modelId;
    selectedProviderId = modelInfo.providerId;
  }

  // Log the routing decision
  console.log(`[LLM Router] ${taskType} → ${selectedProviderId}/${selectedModelId}`);

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

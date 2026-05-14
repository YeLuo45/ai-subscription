/**
 * LLM - Core LLM calling interface
 * Wraps AI SDK (ai, @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google)
 * Provides callLLM / streamLLM with thinking config, retry, and provider abstraction
 * Includes enhanced error handling with retry mechanisms and circuit breaker
 */

import { generateText, streamText, type GenerateTextResult, type GenerateTextParams, type ProviderOptions } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

import type { SimpleMessage, ThinkingConfig, LLMRetryOptions, StreamChunk } from './types/provider';
import { PROVIDERS, resolveProviderType, resolveModelId } from './providers';
import { runWithThinkingContext, createThinkingContext } from './thinking-context';
import type { ToolName } from './types/tool';
import { toolList } from './tools';
import type { Tool } from 'ai';
import {
  withRetry,
  isRetryableError,
  calculateBackoffDelay,
  getCircuitBreaker,
  LLMError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  type RetryOptions,
} from './error-handling';

// Re-export for convenience
export { callLLM, streamLLM };

// ============================================================
// Provider Initialization
// ============================================================

/** Cache for provider instances */
const providerCache: Map<string, ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createGoogleGenerativeAI>> = new Map();

function getProvider(providerId: string, apiKey: string, baseURL?: string) {
  const cacheKey = `${providerId}:${apiKey}:${baseURL || 'default'}`;
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  const providerType = resolveProviderTypeFromId(providerId);
  let provider: any;

  switch (providerType) {
    case 'anthropic':
      provider = createAnthropic({ apiKey });
      break;
    case 'google':
      provider = createGoogleGenerativeAI({ apiKey });
      break;
    case 'openai':
    case 'openai-compatible':
    case 'anthropic-compatible':
    default:
      provider = createOpenAI({ apiKey, baseURL: baseURL || undefined });
      break;
  }

  providerCache.set(cacheKey, provider);
  return provider;
}

function resolveProviderTypeFromId(id: string): string {
  const config = PROVIDERS[id as keyof typeof PROVIDERS];
  return config?.type ?? 'openai-compatible';
}

// ============================================================
// Thinking Config Builder
// ============================================================

/**
 * Build provider-specific thinking options based on provider type and thinking config
 */
function buildThinkingProviderOptions(
  providerType: string,
  config: ThinkingConfig | undefined
): ProviderOptions | undefined {
  if (!config) return undefined;

  if (!config.enabled) {
    switch (providerType) {
      case 'openai':
      case 'openai-compatible':
        return { openai: { reasoningEffort: 'none' } } as ProviderOptions;
      case 'anthropic':
      case 'anthropic-compatible':
        return { anthropic: { thinking: { type: 'disabled' } } } as ProviderOptions;
      case 'google':
        return { google: { thinkingConfig: { thinkingBudget: 0 } } } as ProviderOptions;
    }
  }

  // Enabled case
  switch (providerType) {
    case 'openai':
    case 'openai-compatible':
      if (config.reasoningEffort) {
        return { openai: { reasoningEffort: config.reasoningEffort } } as ProviderOptions;
      }
      break;
    case 'anthropic':
    case 'anthropic-compatible':
      if (config.budgetTokens) {
        return { anthropic: { thinking: { type: 'enabled', budgetTokens: config.budgetTokens } } } as ProviderOptions;
      }
      break;
    case 'google':
      if (config.thinkingBudget !== undefined) {
        return { google: { thinkingConfig: { thinkingBudget: config.thinkingBudget } } } as ProviderOptions;
      }
      break;
  }

  return undefined;
}

// ============================================================
// Retry Logic - Enhanced with error-handling module
// ============================================================

/**
 * Map HTTP status codes to appropriate error types
 */
function createErrorFromStatus(err: unknown, providerId: string, modelId: string): Error {
  const status = (err as any)?.status || (err as any)?.statusCode;
  
  if (status === 429) {
    const retryAfter = (err as any)?.headers?.['retry-after'];
    const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;
    return new RateLimitError(
      err instanceof Error ? err.message : 'Rate limit exceeded',
      providerId,
      modelId,
      retryAfterMs
    );
  }
  
  if (status === 401 || status === 403) {
    return new LLMError(
      err instanceof Error ? err.message : 'Authentication failed',
      providerId,
      modelId,
      status,
      false // Not retryable
    );
  }
  
  if (status === 400) {
    return new LLMError(
      err instanceof Error ? err.message : 'Bad request',
      providerId,
      modelId,
      status,
      false // Not retryable
    );
  }
  
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return new ServerError(
      err instanceof Error ? err.message : 'Server error',
      providerId,
      modelId,
      status
    );
  }
  
  // Generic network errors
  if (err instanceof Error && /network|econnreset|econnrefused|socket/i.test(err.message)) {
    return new NetworkError(err.message, true);
  }
  
  // Generic timeout errors
  if (err instanceof Error && /timeout|timed out/i.test(err.message)) {
    return new TimeoutError(err.message, 30000);
  }
  
  return new LLMError(
    err instanceof Error ? err.message : String(err),
    providerId,
    modelId,
    status,
    isRetryableError(err) // Use the imported function
  );
}

// ============================================================
// callLLM
// ============================================================

/**
 * Call LLM with automatic provider selection, retry, and thinking support
 *
 * @param params.model - Model identifier (e.g., "minimax/MiniMax-Text-01" or "gpt-4o-mini")
 * @param params.messages - Chat messages
 * @param params.temperature - Temperature setting
 * @param params.maxTokens - Max tokens
 * @param params.apiKey - Optional API key override
 * @param params.baseURL - Optional base URL override
 * @param source - Call source identifier for tracing
 * @param retryOptions - Retry configuration
 * @param thinking - Thinking configuration
 */
async function callLLM(
  params: {
    model: string;
    messages: SimpleMessage[];
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseURL?: string;
  },
  source: string,
  retryOptions?: LLMRetryOptions,
  thinking?: ThinkingConfig
): Promise<GenerateTextResult<any, any>> {
  const { model, messages, temperature, maxTokens, apiKey, baseURL } = params;

  const providerId = resolveProviderType(model);
  const providerType = PROVIDERS[providerId]?.type ?? 'openai-compatible';
  const resolvedModelId = resolveModelId(model);

  // Get API key and base URL from config or parameters
  const config = PROVIDERS[providerId];
  const effectiveApiKey = apiKey ?? config?.defaultBaseUrl ?? '';
  const effectiveBaseURL = baseURL ?? config?.defaultBaseUrl;

  if (!effectiveApiKey) {
    throw new Error(`No API key provided for provider: ${providerId}`);
  }

  getProvider(providerId, effectiveApiKey, effectiveBaseURL);

  const thinkingOptions = buildThinkingProviderOptions(providerType, thinking);

  const options: GenerateTextParams = {
    model: resolvedModelId,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature,
    maxTokens,
    ...thinkingOptions,
  };

  // Get circuit breaker for this provider
  const circuitBreaker = getCircuitBreaker(`llm:${providerId}`);
  
  // Check circuit breaker before making request
  if (!circuitBreaker.isAllowing()) {
    const stats = circuitBreaker.getStats();
    throw new Error(`Circuit breaker is OPEN for ${providerId}. Failure count: ${stats.failureCount}`);
  }

  const context = createThinkingContext(source);

  // Use enhanced retry with circuit breaker
  try {
    return await circuitBreaker.execute(async () => {
      return await withRetry(
        async () => {
          return await runWithThinkingContext(context, async () => {
            return await generateText(options);
          });
        },
        {
          maxRetries: retryOptions?.retries ?? 3,
          initialDelayMs: retryOptions?.retryDelayMs ?? 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
          jitter: true,
          jitterFactor: 0.1,
          onRetry: (attempt, error, delayMs) => {
            console.warn(`[callLLM] Retry ${attempt} for ${providerId}/${resolvedModelId} after ${delayMs}ms: ${error.message}`);
          },
        }
      );
    });
  } catch (err) {
    // Wrap error with provider context
    const error = err instanceof Error ? err : new Error(String(err));
    error.message = `[${providerId}/${resolvedModelId}] ${error.message}`;
    throw error;
  }
}

// ============================================================
// streamLLM
// ============================================================

/**
 * Stream LLM response as an async generator of StreamChunks
 *
 * @param params.model - Model identifier
 * @param params.messages - Chat messages
 * @param params.temperature - Temperature setting
 * @param params.maxTokens - Max tokens
 * @param params.apiKey - Optional API key override
 * @param params.baseURL - Optional base URL override
 * @param source - Call source identifier for tracing
 * @param thinking - Thinking configuration
 */
function streamLLM(
  params: {
    model: string;
    messages: SimpleMessage[];
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseURL?: string;
  },
  source: string,
  thinking?: ThinkingConfig
): AsyncGenerator<StreamChunk> {
  const { model, messages, temperature, maxTokens, apiKey, baseURL } = params;

  const providerId = resolveProviderType(model);
  const providerType = PROVIDERS[providerId]?.type ?? 'openai-compatible';
  const resolvedModelId = resolveModelId(model);

  const config = PROVIDERS[providerId];
  const effectiveApiKey = apiKey ?? config?.defaultBaseUrl ?? '';
  const effectiveBaseURL = baseURL ?? config?.defaultBaseUrl;

  if (!effectiveApiKey) {
    throw new Error(`No API key provided for provider: ${providerId}`);
  }

  getProvider(providerId, effectiveApiKey, effectiveBaseURL);
  const thinkingOptions = buildThinkingProviderOptions(providerType, thinking);

  const context = createThinkingContext(source);

  return runWithThinkingContext(context, async function* () {
    const stream = streamText({
      model: resolvedModelId,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature,
      maxTokens,
      ...thinkingOptions,
    });

    for await (const chunk of stream.fullStream) {
      switch (chunk.type) {
        case 'text-delta':
          yield { type: 'text_delta', content: chunk.textDelta };
          break;
        case 'tool-call':
          yield { type: 'tool_call', toolName: chunk.toolName, toolArgs: JSON.stringify(chunk.args) };
          break;
        case 'tool-delta':
          yield { type: 'tool_delta', toolName: chunk.toolName, toolArgs: chunk.textDelta };
          break;
        case 'error':
          yield { type: 'error', error: chunk.error };
          break;
        case 'finish':
          yield { type: 'done' };
          break;
      }
    }
  });
}

// ============================================================
// callLLMWithTools
// ============================================================

/**
 * Call LLM with tool-use capability
 *
 * @param params.model - Model identifier
 * @param params.messages - Chat messages
 * @param params.temperature - Temperature setting
 * @param params.maxTokens - Max tokens
 * @param source - Call source identifier
 * @param enabledTools - List of enabled tool names
 * @param thinking - Thinking configuration
 */
export async function callLLMWithTools(
  params: {
    model: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  },
  source: string,
  enabledTools: ToolName[],
  thinking?: ThinkingConfig
): Promise<{
  text: string;
  toolCalls?: Array<{ toolName: ToolName; params: Record<string, unknown> }>;
}> {
  const tools: Tool[] = toolList
    .filter(t => enabledTools.includes(t.name as ToolName))
    .map(t => ({
      id: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

  const providerId = resolveProviderType(params.model);
  const providerType = PROVIDERS[providerId]?.type ?? 'openai-compatible';
  const resolvedModelId = resolveModelId(params.model);

  const config = PROVIDERS[providerId];
  const effectiveApiKey = config?.defaultBaseUrl ?? '';
  const effectiveBaseURL = config?.defaultBaseUrl;

  getProvider(providerId, effectiveApiKey, effectiveBaseURL);
  const thinkingOptions = buildThinkingProviderOptions(providerType, thinking);

  const context = createThinkingContext(source);

  const result = await runWithThinkingContext(context, async () => {
    return await generateText({
      model: resolvedModelId,
      messages: params.messages.map(m => ({ role: m.role, content: m.content })),
      tools,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      ...thinkingOptions,
    });
  });

  return {
    text: result.text,
    toolCalls: result.toolCalls?.map(tc => ({
      toolName: tc.toolName as ToolName,
      params: tc.args as Record<string, unknown>,
    })),
  };
}

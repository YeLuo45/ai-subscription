/**
 * LLM - Core LLM calling interface
 * Wraps AI SDK (ai, @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google)
 * Provides callLLM / streamLLM with thinking config, retry, and provider abstraction
 */

import { generateText, streamText, type GenerateTextResult, type GenerateTextParams, type ProviderOptions } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

import type { SimpleMessage, ThinkingConfig, LLMRetryOptions, StreamChunk } from './types/provider';
import { PROVIDERS, resolveProviderType, resolveModelId } from './providers';
import { runWithThinkingContext, createThinkingContext } from './thinking-context';

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
// Retry Logic
// ============================================================

const RETRYABLE_ERROR_CODES = new Set([
  429, 500, 502, 503, 504
]);

function isRetryableError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    return RETRYABLE_ERROR_CODES.has((err as any).status);
  }
  if (err && typeof err === 'object' && 'statusCode' in err) {
    return RETRYABLE_ERROR_CODES.has((err as any).statusCode);
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  const provider = getProvider(providerId, effectiveApiKey, effectiveBaseURL);

  const thinkingOptions = buildThinkingProviderOptions(providerType, thinking);

  const options: GenerateTextParams = {
    model: resolvedModelId,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature,
    maxTokens,
    ...thinkingOptions,
  };

  // Retry loop with exponential backoff
  let lastError: Error | null = null;
  const retries = retryOptions?.retries ?? 0;
  const retryDelay = retryOptions?.retryDelayMs ?? 1000;

  const context = createThinkingContext(source);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await runWithThinkingContext(context, async () => {
        return await generateText(options);
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries && isRetryableError(err)) {
        await delay(Math.pow(2, attempt) * retryDelay);
        continue;
      }
    }
  }

  throw lastError;
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

  const provider = getProvider(providerId, effectiveApiKey, effectiveBaseURL);
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

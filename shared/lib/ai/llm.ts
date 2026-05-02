/**
 * LLM - Core LLM calling interface
 * Wraps AI SDK 3.x Provider architecture
 * Provides callLLM / streamLLM with thinking config, retry, and provider abstraction
 */

import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

import type { SimpleMessage, ThinkingConfig, LLMRetryOptions, StreamChunk } from './types/provider';
import { PROVIDERS } from './providers';

// Re-export
export { callLLM, streamLLM };

// ============================================================
// Provider Cache
// ============================================================

type AILLMProvider = ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createGoogleGenerativeAI>;

const providerCache: Map<string, AILLMProvider> = new Map();

function getProvider(providerId: string, apiKey: string, baseURL?: string): AILLMProvider {
  const cacheKey = `${providerId}:${apiKey}:${baseURL || 'default'}`;
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  const config = PROVIDERS[providerId as keyof typeof PROVIDERS];
  const providerType = config?.type ?? 'openai-compatible';

  let provider: AILLMProvider;

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

// ============================================================
// Thinking Config Builder
// ============================================================

interface ThinkingOptions {
  openai?: { reasoningEffort?: string };
  anthropic?: { thinking?: { type: 'enabled' | 'disabled'; budgetTokens?: number } };
  google?: { thinkingConfig?: { thinkingBudget?: number } };
}

function buildThinkingOptions(
  providerType: string,
  config: ThinkingConfig | undefined
): ThinkingOptions | undefined {
  if (!config) return undefined;

  if (!config.enabled) {
    switch (providerType) {
      case 'openai':
      case 'openai-compatible':
        return { openai: { reasoningEffort: 'none' } };
      case 'anthropic':
      case 'anthropic-compatible':
        return { anthropic: { thinking: { type: 'disabled' } } };
      case 'google':
        return { google: { thinkingConfig: { thinkingBudget: 0 } } };
    }
  }

  switch (providerType) {
    case 'openai':
    case 'openai-compatible':
      if (config.reasoningEffort) {
        return { openai: { reasoningEffort: config.reasoningEffort } };
      }
      break;
    case 'anthropic':
    case 'anthropic-compatible':
      if (config.budgetTokens) {
        return { anthropic: { thinking: { type: 'enabled', budgetTokens: config.budgetTokens } } };
      }
      break;
    case 'google':
      if (config.thinkingBudget !== undefined) {
        return { google: { thinkingConfig: { thinkingBudget: config.thinkingBudget } } };
      }
      break;
  }

  return undefined;
}

// ============================================================
// Retry Logic
// ============================================================

const RETRYABLE_ERROR_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryableError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    if ('status' in err) return RETRYABLE_ERROR_CODES.has((err as any).status);
    if ('statusCode' in err) return RETRYABLE_ERROR_CODES.has((err as any).statusCode);
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// callLLM
// ============================================================

async function callLLM(
  params: {
    model: string;
    messages: SimpleMessage[];
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseURL?: string;
  },
  _source: string,
  retryOptions?: LLMRetryOptions,
  thinking?: ThinkingConfig
): Promise<{ text: string; finishReason?: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const { model, messages, temperature, maxTokens, apiKey, baseURL } = params;

  const providerId = resolveProviderType(model);
  const config = PROVIDERS[providerId as keyof typeof PROVIDERS];
  const providerType = config?.type ?? 'openai-compatible';
  const resolvedModelId = resolveModelId(model);

  const effectiveApiKey = apiKey ?? config?.defaultBaseUrl ?? '';
  const effectiveBaseURL = baseURL ?? config?.defaultBaseUrl;

  if (!effectiveApiKey) {
    throw new Error(`No API key provided for provider: ${providerId}`);
  }

  const provider = getProvider(providerId, effectiveApiKey, effectiveBaseURL);
  const languageModel = provider(resolvedModelId);

  const thinkingOpts = buildThinkingOptions(providerType, thinking);

  const options: any = {
    model: languageModel,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature,
    maxTokens,
    ...thinkingOpts,
  };

  let lastError: Error | null = null;
  const retries = retryOptions?.retries ?? 0;
  const retryDelay = retryOptions?.retryDelayMs ?? 1000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await generateText(options as any);
      return {
        text: result.text,
        finishReason: result.finishReason,
        usage: result.usage ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
        } : undefined,
      };
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

async function streamLLM(
  params: {
    model: string;
    messages: SimpleMessage[];
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseURL?: string;
  },
  _source: string,
  thinking?: ThinkingConfig
): Promise<AsyncGenerator<StreamChunk>> {
  const { model, messages, temperature, maxTokens, apiKey, baseURL } = params;

  const providerId = resolveProviderType(model);
  const config = PROVIDERS[providerId as keyof typeof PROVIDERS];
  const providerType = config?.type ?? 'openai-compatible';
  const resolvedModelId = resolveModelId(model);

  const effectiveApiKey = apiKey ?? config?.defaultBaseUrl ?? '';
  const effectiveBaseURL = baseURL ?? config?.defaultBaseUrl;

  if (!effectiveApiKey) {
    throw new Error(`No API key provided for provider: ${providerId}`);
  }

  const provider = getProvider(providerId, effectiveApiKey, effectiveBaseURL);
  const languageModel = provider(resolvedModelId);

  const thinkingOpts = buildThinkingOptions(providerType, thinking);

  const streamResult = await streamText({
    model: languageModel,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature,
    maxTokens,
    ...thinkingOpts,
  } as any);

  const generator = (async function* () {
    for await (const chunk of streamResult.fullStream) {
      switch (chunk.type) {
        case 'text-delta':
          yield { type: 'text_delta' as const, content: chunk.textDelta };
          break;
        case 'tool-call':
          yield { type: 'tool_call' as const, toolName: chunk.toolName, toolArgs: JSON.stringify(chunk.args) };
          break;
        case 'tool-call-delta':
          yield { type: 'tool_delta' as const, toolName: chunk.toolName, toolArgs: chunk.argsTextDelta };
          break;
        case 'error':
          yield { type: 'error' as const, error: String(chunk.error) };
          break;
        case 'finish':
          yield { type: 'done' as const };
          break;
      }
    }
  })();

  return generator;
}

// ============================================================
// Helpers (imported from providers)
// ============================================================

function resolveProviderType(model: string): string {
  const colonIdx = model.indexOf('/');
  const candidate = colonIdx > 0 ? model.slice(0, colonIdx) : model;

  const MODEL_PREFIX_MAP: Record<string, string> = {
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

  if ((PROVIDERS as any)[candidate]) {
    return candidate;
  }

  for (const [prefix, providerId] of Object.entries(MODEL_PREFIX_MAP)) {
    if (candidate.startsWith(prefix)) {
      return providerId;
    }
  }

  return 'openai';
}

function resolveModelId(model: string): string {
  const colonIdx = model.indexOf('/');
  return colonIdx > 0 ? model.slice(colonIdx + 1) : model;
}

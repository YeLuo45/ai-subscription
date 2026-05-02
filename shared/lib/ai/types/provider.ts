/**
 * AI Provider Types and Capabilities
 * Core type definitions for the AI SDK integration layer
 */

export type ProviderId = 'minimax' | 'deepseek' | 'kimi' | 'openai' | 'anthropic' | 'google';

export type ProviderType = 'openai' | 'anthropic' | 'anthropic-compatible' | 'google' | 'openai-compatible';

export interface ModelInfo {
  id: string;
  contextWindow: number;
  outputWindow: number;
  capabilities: ModelCapabilities;
}

export interface ModelCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
}

export interface ThinkingCapability {
  type: 'anthropic' | 'openai' | 'google';
  minBudgetTokens?: number;
  maxBudgetTokens?: number;
}

export interface ProviderConfig {
  id: ProviderId;
  type: ProviderType;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  models: ModelInfo[];
  thinking?: ThinkingCapability;
}

/** Simple message structure used across LLM calls */
export interface SimpleMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Streaming chunk from LLM */
export interface StreamChunk {
  type: 'text_delta' | 'tool_call' | 'tool_delta' | 'error' | 'done';
  content?: string;
  toolName?: string;
  toolArgs?: string;
  error?: string;
}

/** Retry options for LLM calls */
export interface LLMRetryOptions {
  retries: number;
  retryDelayMs?: number;
}

/** Thinking configuration for models that support it */
export interface ThinkingConfig {
  enabled: boolean;
  budgetTokens?: number;       // Anthropic: max_tokens for thinking
  reasoningEffort?: string;     // OpenAI o-series: low/medium/high
  thinkingBudget?: number;      // Gemini 2.5: thinkingBudget
}

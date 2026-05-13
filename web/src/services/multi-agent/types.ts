/**
 * Multi-Agent System Types
 * Core type definitions for multi-agent collaboration in AI subscription
 */

/**
 * Supported target languages for translation
 */
export type Language = 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES';

/**
 * Agent role in the multi-agent system
 */
export type AgentRole = 'extractor' | 'summarizer' | 'tagger' | 'translator' | 'critic' | 'orchestrator';

/**
 * Agent status
 */
export type AgentStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed';

/**
 * Agent identifier with role
 */
export interface AgentId {
  id: string;
  role: AgentRole;
  name?: string;
}

/**
 * Message types for agent communication
 */
export type AgentMessageType =
  | 'extraction_result'
  | 'summary_result'
  | 'tag_result'
  | 'translation_result'
  | 'critic_result'
  | 'agent_status'
  | 'error'
  | 'task_assigned'
  | 'task_completed';

/**
 * Agent message envelope
 */
export interface AgentMessage<T = unknown> {
  id: string;
  type: AgentMessageType;
  source: AgentId;
  target?: AgentId;
  payload: T;
  timestamp: number;
  correlationId?: string;
}

/**
 * Agent task
 */
export interface AgentTask<TInput = unknown, TOutput = unknown> {
  id: string;
  agent: AgentId;
  type: string;
  input: TInput;
  priority?: number;
  createdAt: number;
  timeout?: number;
}

/**
 * Agent result wrapper
 */
export interface AgentResult<T = unknown> {
  agent: AgentId;
  data: T;
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Extraction result from ExtractorAgent
 */
export interface ExtractionResult {
  title: string;
  summary: string;
  entities: string[];
}

/**
 * Summary result from SummarizerAgent
 */
export interface SummaryResult {
  keyPoints: string[];
}

/**
 * Tag result from TaggerAgent
 */
export interface TagResult {
  tags: string[];
}

/**
 * Translation result from TranslatorAgent
 */
export interface TranslationResult {
  translatedTitle: string;
  translatedDescription: string;
}

/**
 * Critic evaluation result
 */
export interface CriticResult {
  score: number;
  feedback: string;
  approved: boolean;
  suggestions?: string[];
}

/**
 * Agent execution context
 */
export interface AgentContext {
  id: string;
  agent: AgentId;
  status: AgentStatus;
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
  score?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Multi-agent event types for streaming
 */
export type MultiAgentEvent =
  | { type: 'agent_start'; agent: AgentId }
  | { type: 'agent_end'; agent: AgentId; success: boolean }
  | { type: 'extraction_delta'; data: ExtractionResult }
  | { type: 'summary_delta'; data: SummaryResult }
  | { type: 'tag_delta'; data: TagResult }
  | { type: 'translation_delta'; data: TranslationResult }
  | { type: 'critic_delta'; data: CriticResult }
  | { type: 'error'; error: string; agent?: AgentId }
  | { type: 'done' };

/**
 * Article input for multi-agent processing
 */
export interface MultiAgentArticle {
  title: string;
  content: string;
  description?: string;
  url?: string;
}

/**
 * Context pool options
 */
export interface ContextPoolOptions {
  maxConcurrent?: number;
  defaultTimeout?: number;
  enableMetrics?: boolean;
}

/**
 * Message bus options
 */
export interface MessageBusOptions {
  maxHistorySize?: number;
  enableLogging?: boolean;
}

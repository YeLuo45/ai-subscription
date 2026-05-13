/**
 * Multi-Agent Pipeline System
 * Unified exports for multi-agent collaboration framework
 * 
 * Architecture:
 * - MessageBus: Pub/Sub message passing between agents
 * - ContextPool: Shared state management with event notification
 * - Agents: BaseAgent, CoordinatorAgent, SpecialistAgent, CriticAgent
 * - PipelineAgents: Extractor, Summarizer, Tagger, Translator
 * - Teams: ContentPipelineTeam (pre-configured pipeline)
 */

// Core infrastructure
export { MessageBus, messageBus, createMessageBus, type MessageHandler } from './message-bus';

export { ContextPool, contextPool, createContextPool } from './context-pool';

// Types from types.ts
export type {
  AgentId,
  AgentRole,
  AgentStatus,
  AgentMessage,
  AgentMessageType,
  AgentTask,
  AgentResult,
  AgentContext,
  ExtractionResult,
  SummaryResult,
  TagResult,
  TranslationResult,
  CriticResult,
  MultiAgentEvent,
  MultiAgentArticle,
  Language,
  ContextPoolOptions,
  MessageBusOptions,
} from './types';

// Base Agent
export { BaseAgent } from './agents/BaseAgent';

// Coordinator Agent
export { CoordinatorAgent } from './agents/CoordinatorAgent';
export type { CoordinatorConfig } from './agents/CoordinatorAgent';

// Specialist Agent
export { SpecialistAgent } from './agents/SpecialistAgent';
export type { SpecialistConfig } from './agents/SpecialistAgent';

// Critic Agent
export { CriticAgent } from './agents/CriticAgent';
export type { CriticConfig, CriticScore, AgentOutput } from './agents/CriticAgent';

// Pipeline Agents (4 specialists)
export {
  ExtractorPipelineAgent,
  SummarizerPipelineAgent,
  TaggerPipelineAgent,
  TranslatorPipelineAgent,
  createExtractorAgent,
  createSummarizerAgent,
  createTaggerAgent,
  createTranslatorAgent,
  getPipelineAgentTypes,
} from './agents/pipeline-agents';

export type { PipelineAgentType } from './agents/pipeline-agents';
export type { ExtractionResult as ExtractionResult2 } from './agents/pipeline-agents';
export type { SummaryResult as SummaryResult2 } from './agents/pipeline-agents';
export type { TagResult as TagResult2 } from './agents/pipeline-agents';
export type { TranslationResult as TranslationResult2, Language as Language2 } from './agents/pipeline-agents';

// Individual agents (legacy/existing)
export { ExtractorAgent } from './agents/ExtractorAgent';
export { SummarizerAgent } from './agents/SummarizerAgent';
export { TaggerAgent } from './agents/TaggerAgent';
export { TranslatorAgent } from './agents/TranslatorAgent';

// Content Pipeline Team
export { ContentPipelineTeam, createContentPipelineTeam } from './teams/content-pipeline-team';
export type { PipelineTeamConfig, PipelineTeamResult } from './teams/content-pipeline-team';

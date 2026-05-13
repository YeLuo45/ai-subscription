/**
 * Multi-Agent System - Agents Module
 * Export all agent classes
 */

// Types first
export * from './types';

// Base Agent
export { BaseAgent } from './BaseAgent';

// Coordinator Agent
export { CoordinatorAgent, type CoordinatorConfig } from './CoordinatorAgent';

// Specialist Agent
export { SpecialistAgent, type SpecialistConfig } from './SpecialistAgent';

// Critic Agent
export { CriticAgent, type CriticConfig, type CriticScore, type AgentOutput } from './CriticAgent';

// Pipeline Agents
export { ExtractorAgent, type ExtractorConfig, type ExtractionResult } from './ExtractorAgent';
export { SummarizerAgent, type SummarizerConfig, type SummaryResult } from './SummarizerAgent';
export { TaggerAgent, type TaggerConfig, type TagResult } from './TaggerAgent';
export { TranslatorAgent, type TranslatorConfig, type TranslationResult, type Language } from './TranslatorAgent';

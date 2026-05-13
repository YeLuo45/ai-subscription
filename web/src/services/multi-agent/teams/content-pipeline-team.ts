/**
 * Content Pipeline Team
 * Pre-configured team with Coordinator + Specialist Agents + Critic for content processing
 * Implements the multi-agent pipeline architecture from PRD Section 4
 */

import { CoordinatorAgent } from '../agents/CoordinatorAgent';
import { CriticAgent, type AgentOutput } from '../agents/CriticAgent';
import {
  ExtractorPipelineAgent,
  SummarizerPipelineAgent,
  TaggerPipelineAgent,
  TranslatorPipelineAgent,
} from '../agents/pipeline-agents';
import { messageBus } from '../message-bus';
import { contextPool } from '../context-pool';
import type { AgentId } from '../types';
import { AgentRole } from '../agents/types';

export interface PipelineTeamConfig {
  enableParallelExecution?: boolean;  // Enable tagger/translator parallel execution
  criticThreshold?: number;           // Score threshold for fallback (default 0.6)
  maxRetries?: number;
}

export interface PipelineTeamResult {
  success: boolean;
  extraction?: { title: string; summary: string; entities: string[] };
  summary?: { keyPoints: string[] };
  tags?: { tags: string[] };
  translation?: { translatedTitle: string; translatedDescription: string };
  criticScore?: { overall: number; accuracy: number; coherence: number; relevance: number; details: string };
  fallbackTriggered?: boolean;
  error?: string;
}

/**
 * Content Pipeline Team
 * Coordinates extraction, summarization, tagging, and translation with critic evaluation
 */
export class ContentPipelineTeam {
  private coordinator: CoordinatorAgent;
  private critic: CriticAgent;
  private extractor: ExtractorPipelineAgent;
  private summarizer: SummarizerPipelineAgent;
  private tagger: TaggerPipelineAgent;
  private translator: TranslatorPipelineAgent;
  private config: Required<PipelineTeamConfig>;
  private agentIds: Map<string, AgentId>;

  constructor(config: PipelineTeamConfig = {}) {
    this.config = {
      enableParallelExecution: config.enableParallelExecution ?? true,
      criticThreshold: config.criticThreshold ?? 0.6,
      maxRetries: config.maxRetries ?? 3,
    };

    // Initialize coordinator
    this.coordinator = new CoordinatorAgent({
      id: 'coordinator',
      name: 'ContentPipelineCoordinator',
      role: AgentRole.COORDINATOR,
      capabilities: ['coordination', 'task-distribution', 'result-aggregation'],
    });

    // Initialize critic
    this.critic = new CriticAgent({
      id: 'critic',
      name: 'ContentPipelineCritic',
      role: AgentRole.CRITIC,
      capabilities: ['evaluation', 'critique'],
      minAcceptableScore: this.config.criticThreshold * 100,
    });

    // Initialize pipeline agents
    this.extractor = new ExtractorPipelineAgent();
    this.summarizer = new SummarizerPipelineAgent();
    this.tagger = new TaggerPipelineAgent();
    this.translator = new TranslatorPipelineAgent();

    // Create agent IDs
    this.agentIds = new Map([
      ['coordinator', { id: 'coordinator', role: 'orchestrator', name: 'ContentPipelineCoordinator' }],
      ['critic', { id: 'critic', role: 'critic', name: 'ContentPipelineCritic' }],
      ['extractor', { id: 'extractor', role: 'extractor', name: 'Extractor' }],
      ['summarizer', { id: 'summarizer', role: 'summarizer', name: 'Summarizer' }],
      ['tagger', { id: 'tagger', role: 'tagger', name: 'Tagger' }],
      ['translator', { id: 'translator', role: 'translator', name: 'Translator' }],
    ]);

    // Setup message bus subscriptions
    this.setupMessageBus();
  }

  /**
   * Setup message bus subscriptions for agent communication
   */
  private setupMessageBus(): void {
    // Subscribe to extraction results
    messageBus.subscribe('extraction_result', (message) => {
      contextPool.createContext(this.agentIds.get('extractor')!, { taskId: message.correlationId });
    });

    // Subscribe to task completion
    messageBus.subscribe('task_completed', (_message) => {
      // Handle task completion events
    });
  }

  /**
   * Process article through the multi-agent pipeline
   */
  async process(
    article: { title: string; content: string; description?: string },
    options?: { targetLang?: 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES' }
  ): Promise<PipelineTeamResult> {
    let fallbackTriggered = false;

    try {
      // Step 1: Extract
      const extraction = await this.extractor.execute(article.content);

      // Store extraction in context pool
      const extractionContext = contextPool.createContext(this.agentIds.get('extractor')!);
      contextPool.completeContext(extractionContext.id, extraction);

      // Publish extraction result
      await messageBus.publish('extraction_result', this.agentIds.get('extractor')!, extraction);

      // Step 2: Summarize (sequential - depends on extraction)
      const summary = await this.summarizer.execute(extraction);

      // Store summary in context pool
      const summaryContext = contextPool.createContext(this.agentIds.get('summarizer')!);
      contextPool.completeContext(summaryContext.id, summary);

      // Step 3: Tag and Translate in parallel if enabled
      let tags: { tags: string[] } | undefined;
      let translation: { translatedTitle: string; translatedDescription: string } | undefined;

      if (this.config.enableParallelExecution) {
        // Execute tagger and translator in parallel
        const [tagResult, translationResult] = await Promise.all([
          this.tagger.execute(article.content),
          this.translator.execute({ title: article.title, description: article.description }, options?.targetLang),
        ]);
        tags = tagResult;
        translation = translationResult;
      } else {
        // Sequential execution
        tags = await this.tagger.execute(article.content);
        translation = await this.translator.execute({ title: article.title, description: article.description }, options?.targetLang);
      }

      // Store results in context pool
      if (tags) {
        const tagContext = contextPool.createContext(this.agentIds.get('tagger')!);
        contextPool.completeContext(tagContext.id, tags);
      }

      if (translation) {
        const transContext = contextPool.createContext(this.agentIds.get('translator')!);
        contextPool.completeContext(transContext.id, translation);
      }

      // Step 4: Critic evaluation
      const output: AgentOutput = { extraction, summary, tags, translation };
      const criticResult = await this.critic.evaluate(output);

      // Store critic score
      const criticContext = contextPool.createContext(this.agentIds.get('critic')!);
      contextPool.completeContext(criticContext.id, criticResult.data);
      contextPool.setScore(criticContext.id, criticResult.data.overall);

      // Check if fallback is needed (score < threshold)
      if (this.critic.needsFallback(criticResult.data)) {
        fallbackTriggered = true;
        // Could implement fallback logic here (e.g., re-run with simpler prompt)
      }

      return {
        success: true,
        extraction,
        summary,
        tags,
        translation,
        criticScore: criticResult.data,
        fallbackTriggered,
      };
    } catch (error) {
      return {
        success: false,
        fallbackTriggered,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run pipeline with AsyncGenerator for streaming (for backward compatibility)
   */
  async *processStreaming(
    article: { title: string; content: string; description?: string },
    options?: { targetLang?: 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES' }
  ): AsyncGenerator<{ type: string; data?: unknown; error?: string }, void, unknown> {
    try {
      // Start extraction
      yield { type: 'agent_start', data: { agent: 'extractor' } };
      const extraction = await this.extractor.execute(article.content);
      yield { type: 'extraction_delta', data: extraction };
      yield { type: 'agent_end', data: { agent: 'extractor' } };

      // Start summarization
      yield { type: 'agent_start', data: { agent: 'summarizer' } };
      const summary = await this.summarizer.execute(extraction);
      yield { type: 'summary_delta', data: summary };
      yield { type: 'agent_end', data: { agent: 'summarizer' } };

      // Parallel execution of tagger and translator if enabled
      if (this.config.enableParallelExecution) {
        yield { type: 'agent_start', data: { agent: 'tagger' } };
        yield { type: 'agent_start', data: { agent: 'translator' } };

        const [tagResult, translationResult] = await Promise.all([
          this.tagger.execute(article.content),
          this.translator.execute({ title: article.title, description: article.description }, options?.targetLang),
        ]);

        yield { type: 'tag_delta', data: tagResult };
        yield { type: 'agent_end', data: { agent: 'tagger' } };
        yield { type: 'translation_delta', data: translationResult };
        yield { type: 'agent_end', data: { agent: 'translator' } };
      } else {
        // Sequential
        yield { type: 'agent_start', data: { agent: 'tagger' } };
        const tags = await this.tagger.execute(article.content);
        yield { type: 'tag_delta', data: tags };
        yield { type: 'agent_end', data: { agent: 'tagger' } };

        yield { type: 'agent_start', data: { agent: 'translator' } };
        const translation = await this.translator.execute({ title: article.title, description: article.description }, options?.targetLang);
        yield { type: 'translation_delta', data: translation };
        yield { type: 'agent_end', data: { agent: 'translator' } };
      }

      // Critic evaluation
      const output: AgentOutput = {
        extraction,
        summary,
        tags: await this.tagger.execute(article.content),
        translation: await this.translator.execute({ title: article.title, description: article.description }, options?.targetLang),
      };
      const criticResult = await this.critic.evaluate(output);
      yield { type: 'critic_delta', data: criticResult.data };

      yield { type: 'done' };
    } catch (error) {
      yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Get team status
   */
  getStatus(): {
    coordinator: string;
    critic: string;
    agents: Record<string, string>;
  } {
    return {
      coordinator: this.coordinator.getStatus(),
      critic: this.critic.getStatus(),
      agents: {
        extractor: this.extractor.getStatus(),
        summarizer: this.summarizer.getStatus(),
        tagger: this.tagger.getStatus(),
        translator: this.translator.getStatus(),
      },
    };
  }

  /**
   * Reset all agents
   */
  reset(): void {
    this.coordinator.reset();
    this.critic.reset();
    this.extractor.reset();
    this.summarizer.reset();
    this.tagger.reset();
    this.translator.reset();
    contextPool.clear();
  }
}

/**
 * Create default content pipeline team
 */
export function createContentPipelineTeam(config?: PipelineTeamConfig): ContentPipelineTeam {
  return new ContentPipelineTeam(config);
}

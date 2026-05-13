/**
 * Content Pipeline Team
 * Orchestrates the multi-agent content processing pipeline
 * 
 * This module coordinates Extractor, Summarizer, Tagger, and Translator agents
 * to process content through a structured pipeline with critic evaluation.
 */

import {
  ExtractorAgent,
  SummarizerAgent,
  TaggerAgent,
  TranslatorAgent,
  CriticAgent,
  CoordinatorAgent,
  type ExtractionResult,
  type SummaryResult,
  type TagResult,
  type TranslationResult,
  type AgentOutput,
  type CriticScore,
  type Language,
  AgentRole,
  AgentStatus,
  type AgentResult,
} from './agents';

// ============================================================
// Pipeline Configuration
// ============================================================

export interface ContentPipelineConfig {
  enableExtraction?: boolean;
  enableSummary?: boolean;
  enableTags?: boolean;
  enableTranslation?: boolean;
  targetLanguage?: Language;
  minCriticScore?: number;
  maxRetries?: number;
}

const DEFAULT_CONFIG: Required<ContentPipelineConfig> = {
  enableExtraction: true,
  enableSummary: true,
  enableTags: false,
  enableTranslation: false,
  targetLanguage: 'ZH',
  minCriticScore: 50,
  maxRetries: 3,
};

// ============================================================
// Pipeline Events
// ============================================================

export type PipelineEvent =
  | { type: 'agent_start'; agent: string }
  | { type: 'extraction_delta'; data: ExtractionResult }
  | { type: 'summary_delta'; data: SummaryResult }
  | { type: 'tag_delta'; data: TagResult }
  | { type: 'translation_delta'; data: TranslationResult }
  | { type: 'critic_score'; data: CriticScore }
  | { type: 'agent_end'; agent: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

// ============================================================
// Article Input
// ============================================================

export interface PipelineArticle {
  title: string;
  content: string;
  description?: string;
}

// ============================================================
// Pipeline Result
// ============================================================

export interface ContentPipelineResult {
  extraction?: ExtractionResult;
  summary?: SummaryResult;
  tags?: TagResult;
  translation?: TranslationResult;
  criticScore?: CriticScore;
  success: boolean;
  error?: string;
}

// ============================================================
// Content Pipeline Team
// ============================================================

export class ContentPipelineTeam {
  private extractor: ExtractorAgent;
  private summarizer: SummarizerAgent;
  private tagger: TaggerAgent;
  private translator: TranslatorAgent;
  private critic: CriticAgent;
  private coordinator: CoordinatorAgent;
  private config: Required<ContentPipelineConfig>;

  constructor(config: ContentPipelineConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize agents with proper configurations
    this.extractor = new ExtractorAgent({
      id: 'extractor',
      name: 'Content Extractor',
      role: AgentRole.PIPELINE,
      capabilities: ['extraction'],
    });

    this.summarizer = new SummarizerAgent({
      id: 'summarizer',
      name: 'Content Summarizer',
      role: AgentRole.PIPELINE,
      capabilities: ['summarization'],
    });

    this.tagger = new TaggerAgent({
      id: 'tagger',
      name: 'Content Tagger',
      role: AgentRole.PIPELINE,
      capabilities: ['tagging'],
    });

    this.translator = new TranslatorAgent({
      id: 'translator',
      name: 'Content Translator',
      role: AgentRole.PIPELINE,
      capabilities: ['translation'],
      defaultTargetLang: this.config.targetLanguage,
    });

    this.critic = new CriticAgent({
      id: 'critic',
      name: 'Content Critic',
      role: AgentRole.CRITIC,
      capabilities: ['evaluation'],
      minAcceptableScore: this.config.minCriticScore,
    });

    this.coordinator = new CoordinatorAgent({
      id: 'coordinator',
      name: 'Pipeline Coordinator',
      role: AgentRole.COORDINATOR,
      capabilities: ['coordination', 'task_management'],
    });
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(config: Partial<ContentPipelineConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.targetLanguage) {
      this.translator.setDefaultTargetLang(config.targetLanguage);
    }
    if (config.minCriticScore) {
      this.critic.setMinAcceptableScore(config.minCriticScore);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<ContentPipelineConfig>> {
    return { ...this.config };
  }

  /**
   * Get agent states
   */
  getAgentStates(): Record<string, { status: AgentStatus; currentTask?: string }> {
    return {
      extractor: { status: this.extractor.getStatus(), currentTask: this.extractor.getCurrentTask() },
      summarizer: { status: this.summarizer.getStatus(), currentTask: this.summarizer.getCurrentTask() },
      tagger: { status: this.tagger.getStatus(), currentTask: this.tagger.getCurrentTask() },
      translator: { status: this.translator.getStatus(), currentTask: this.translator.getCurrentTask() },
      critic: { status: this.critic.getStatus(), currentTask: this.critic.getCurrentTask() },
      coordinator: { status: this.coordinator.getStatus(), currentTask: this.coordinator.getCurrentTask() },
    };
  }

  /**
   * Run the content pipeline with streaming events
   */
  async *runPipeline(
    article: PipelineArticle
  ): AsyncGenerator<PipelineEvent> {
    const result: ContentPipelineResult = { success: true };

    // Step 1: Extraction
    if (this.config.enableExtraction) {
      yield { type: 'agent_start', agent: 'extractor' };

      try {
        const extractionResult = await this.extractor.extract(article.content);
        if (extractionResult.success && extractionResult.data) {
          result.extraction = extractionResult.data;
          yield { type: 'extraction_delta', data: extractionResult.data };
        } else {
          throw new Error(extractionResult.error || 'Extraction failed');
        }
      } catch (error) {
        yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
      }

      yield { type: 'agent_end', agent: 'extractor' };
    }

    // Step 2: Summarization (depends on extraction)
    if (this.config.enableSummary && result.extraction) {
      yield { type: 'agent_start', agent: 'summarizer' };

      try {
        const summaryResult = await this.summarizer.summarize(result.extraction);
        if (summaryResult.success && summaryResult.data) {
          result.summary = summaryResult.data;
          yield { type: 'summary_delta', data: summaryResult.data };
        } else {
          throw new Error(summaryResult.error || 'Summarization failed');
        }
      } catch (error) {
        yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
      }

      yield { type: 'agent_end', agent: 'summarizer' };
    }

    // Step 3: Tagging (can run in parallel with other steps)
    if (this.config.enableTags) {
      yield { type: 'agent_start', agent: 'tagger' };

      try {
        const tagResult = await this.tagger.tag(article.content);
        if (tagResult.success && tagResult.data) {
          result.tags = tagResult.data;
          yield { type: 'tag_delta', data: tagResult.data };
        } else {
          throw new Error(tagResult.error || 'Tagging failed');
        }
      } catch (error) {
        yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
      }

      yield { type: 'agent_end', agent: 'tagger' };
    }

    // Step 4: Translation (can run in parallel with other steps)
    if (this.config.enableTranslation) {
      yield { type: 'agent_start', agent: 'translator' };

      try {
        const translationResult = await this.translator.translate(
          { title: article.title, description: article.description },
          this.config.targetLanguage
        );
        if (translationResult.success && translationResult.data) {
          result.translation = translationResult.data;
          yield { type: 'translation_delta', data: translationResult.data };
        } else {
          throw new Error(translationResult.error || 'Translation failed');
        }
      } catch (error) {
        yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
      }

      yield { type: 'agent_end', agent: 'translator' };
    }

    // Step 5: Critic evaluation
    yield { type: 'agent_start', agent: 'critic' };

    try {
      const output: AgentOutput = {
        extraction: result.extraction,
        summary: result.summary,
        tags: result.tags,
        translation: result.translation,
      };

      const criticResult = await this.critic.evaluate(output);
      if (criticResult.success && criticResult.data) {
        result.criticScore = criticResult.data;
        yield { type: 'critic_score', data: criticResult.data };

        // Check if quality is acceptable
        if (this.critic.needsFallback(criticResult.data)) {
          console.warn(`[ContentPipeline] Critic score below threshold: ${criticResult.data.overall}`);
        }
      }
    } catch (error) {
      yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
    }

    yield { type: 'agent_end', agent: 'critic' };

    yield { type: 'done' };
  }

  /**
   * Run pipeline and collect all results
   */
  async runPipelineCollected(article: PipelineArticle): Promise<ContentPipelineResult> {
    const result: ContentPipelineResult = { success: true };

    for await (const event of this.runPipeline(article)) {
      switch (event.type) {
        case 'extraction_delta':
          result.extraction = event.data;
          break;
        case 'summary_delta':
          result.summary = event.data;
          break;
        case 'tag_delta':
          result.tags = event.data;
          break;
        case 'translation_delta':
          result.translation = event.data;
          break;
        case 'critic_score':
          result.criticScore = event.data;
          break;
        case 'error':
          result.success = false;
          result.error = event.error;
          break;
      }
    }

    return result;
  }

  /**
   * Run individual agent
   */
  async runAgent(
    agentType: 'extractor' | 'summarizer' | 'tagger' | 'translator',
    input: unknown
  ): Promise<AgentResult> {
    switch (agentType) {
      case 'extractor':
        return this.extractor.process(input);
      case 'summarizer':
        return this.summarizer.process(input);
      case 'tagger':
        return this.tagger.process(input);
      case 'translator':
        return this.translator.process(input);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Reset all agents
   */
  reset(): void {
    this.extractor.reset();
    this.summarizer.reset();
    this.tagger.reset();
    this.translator.reset();
    this.critic.reset();
    this.coordinator.reset();
  }
}

// ============================================================
// Factory Function
// ============================================================

let pipelineInstance: ContentPipelineTeam | null = null;

export function getContentPipelineTeam(config?: ContentPipelineConfig): ContentPipelineTeam {
  if (!pipelineInstance) {
    pipelineInstance = new ContentPipelineTeam(config);
  } else if (config) {
    pipelineInstance.updateConfig(config);
  }
  return pipelineInstance;
}

export function resetContentPipelineTeam(): void {
  if (pipelineInstance) {
    pipelineInstance.reset();
    pipelineInstance = null;
  }
}

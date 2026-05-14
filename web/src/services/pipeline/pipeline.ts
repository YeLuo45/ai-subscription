/**
 * Pipeline Orchestration
 * AsyncGenerator-based streaming pipeline with MessageBus+ContextPool
 * for parallel agent execution and CriticAgent evaluation
 * Includes enhanced error handling and retry mechanisms
 */

import { decidePipeline, validatePipelineOptions, type PipelineOptions } from './director';
import { createExtractorAgent, createSummarizerAgent, createTaggerAgent, createTranslatorAgent } from './agents';
import { createCriticAgent } from './criticAgent';
import { messageBus } from './messageBus';
import { contextPool } from './contextPool';
import type { PipelineEvent, PipelineArticle, ExtractionResult, CriticScore } from './types';
import type { AgentResult } from './agents';
import { withRetry, isRetryableError, calculateBackoffDelay, getCircuitBreaker, type RetryOptions } from '../../../../shared/lib/ai/error-handling';

// Re-export critic agent creator
export { createCriticAgent } from './criticAgent';

/** Default retry options for pipeline agents */
const DEFAULT_PIPELINE_RETRY_OPTIONS: Partial<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
  jitterFactor: 0.1,
};

/**
 * Run the extraction agent with streaming output and ContextPool tracking
 * Includes retry logic with exponential backoff
 */
async function* runExtractor(
  article: PipelineArticle
): AsyncGenerator<PipelineEvent> {
  const extractor = createExtractorAgent();
  const context = contextPool.createContext('extractor');
  contextPool.updateContext(context.id, { status: 'running' });

  const retryOptions = { ...DEFAULT_PIPELINE_RETRY_OPTIONS };

  try {
    const result = await withRetry(
      async () => extractor(article.content),
      {
        ...retryOptions,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Extractor] Retry attempt ${attempt}: ${error.message}`);
        },
      }
    );
    contextPool.updateContext(context.id, { status: 'completed', result: result.data });
    await messageBus.publish('extraction_result', 'extractor', result.data);
    yield { type: 'extraction_delta', data: result.data };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    contextPool.updateContext(context.id, { status: 'failed', error: errorMessage });
    throw new Error(`Extractor failed: ${errorMessage}`);
  }
}

/**
 * Run the summarizer agent with streaming output and ContextPool tracking
 * Includes retry logic with exponential backoff
 */
async function* runSummarizer(
  article: PipelineArticle,
  extraction: ExtractionResult
): AsyncGenerator<PipelineEvent> {
  const summarizer = createSummarizerAgent();
  const context = contextPool.createContext('summarizer');
  contextPool.updateContext(context.id, { status: 'running' });

  const retryOptions = { ...DEFAULT_PIPELINE_RETRY_OPTIONS };

  try {
    const result = await withRetry(
      async () => summarizer(extraction),
      {
        ...retryOptions,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Summarizer] Retry attempt ${attempt}: ${error.message}`);
        },
      }
    );
    contextPool.updateContext(context.id, { status: 'completed', result: result.data });
    await messageBus.publish('summary_result', 'summarizer', result.data);
    yield { type: 'summary_delta', data: result.data };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    contextPool.updateContext(context.id, { status: 'failed', error: errorMessage });
    throw new Error(`Summarizer failed: ${errorMessage}`);
  }
}

/**
 * Run the tagger agent with streaming output and ContextPool tracking
 * Includes retry logic with exponential backoff
 */
async function* runTagger(article: PipelineArticle): AsyncGenerator<PipelineEvent> {
  const tagger = createTaggerAgent();
  const context = contextPool.createContext('tagger');
  contextPool.updateContext(context.id, { status: 'running' });

  const retryOptions = { ...DEFAULT_PIPELINE_RETRY_OPTIONS };

  try {
    const result = await withRetry(
      async () => tagger(article.content),
      {
        ...retryOptions,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Tagger] Retry attempt ${attempt}: ${error.message}`);
        },
      }
    );
    contextPool.updateContext(context.id, { status: 'completed', result: result.data });
    await messageBus.publish('tag_result', 'tagger', result.data);
    yield { type: 'tag_delta', data: result.data };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    contextPool.updateContext(context.id, { status: 'failed', error: errorMessage });
    throw new Error(`Tagger failed: ${errorMessage}`);
  }
}

/**
 * Run the translator agent with streaming output and ContextPool tracking
 * Includes retry logic with exponential backoff
 */
async function* runTranslator(
  article: PipelineArticle,
  targetLang: string
): AsyncGenerator<PipelineEvent> {
  const translator = createTranslatorAgent();
  const context = contextPool.createContext('translator');
  contextPool.updateContext(context.id, { status: 'running' });

  const retryOptions = { ...DEFAULT_PIPELINE_RETRY_OPTIONS };

  try {
    const result = await withRetry(
      async () => translator(
        { title: article.title, description: article.description },
        targetLang as 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES'
      ),
      {
        ...retryOptions,
        onRetry: (attempt, error, delayMs) => {
          console.warn(`[Translator] Retry attempt ${attempt}: ${error.message}`);
        },
      }
    );
    contextPool.updateContext(context.id, { status: 'completed', result: result.data });
    await messageBus.publish('translation_result', 'translator', result.data);
    yield { type: 'translation_delta', data: result.data };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    contextPool.updateContext(context.id, { status: 'failed', error: errorMessage });
    throw new Error(`Translator failed: ${errorMessage}`);
  }
}

/**
 * Run the critic agent to evaluate pipeline results
 * Includes retry logic with exponential backoff
 */
async function runCritic(
  extraction?: ExtractionResult,
  summary?: { keyPoints: string[] },
  tags?: { tags: string[] },
  translation?: { translatedTitle: string; translatedDescription: string }
): Promise<AgentResult<CriticScore>> {
  const critic = createCriticAgent();
  const context = contextPool.createContext('critic');
  contextPool.updateContext(context.id, { status: 'running' });

  const retryOptions = { ...DEFAULT_PIPELINE_RETRY_OPTIONS };

  try {
    const result = await withRetry(
      async () => critic({ extraction, summary, tags, translation }),
      {
        ...retryOptions,
        onRetry: (attempt, error) => {
          console.warn(`[Critic] Retry attempt ${attempt}: ${error.message}`);
        },
      }
    );
    contextPool.updateContext(context.id, {
      status: 'completed',
      result: result.data,
      score: result.data.overall
    });
    await messageBus.publish('critic_result', 'critic', result.data);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    contextPool.updateContext(context.id, { status: 'failed', error: errorMessage });
    throw new Error(`Critic failed: ${errorMessage}`);
  }
}

/**
 * Execute parallel agents (tagger + translator) using ContextPool
 */
async function* runParallelAgents(
  article: PipelineArticle,
  targetLang: string,
  enableTags: boolean,
  enableTranslation: boolean
): AsyncGenerator<PipelineEvent> {
  const tasks: Array<() => Promise<void>> = [];
  const results: {
    tag?: { tags: string[] };
    translation?: { translatedTitle: string; translatedDescription: string };
  } = {};

  if (enableTags) {
    tasks.push(async () => {
      const context = contextPool.createContext('tagger');
      contextPool.updateContext(context.id, { status: 'running' });

      const retryOptions = { ...DEFAULT_PIPELINE_RETRY_OPTIONS };

      try {
        const tagger = createTaggerAgent();
        const result = await withRetry(
          async () => tagger(article.content),
          {
            ...retryOptions,
            onRetry: (attempt, error) => {
              console.warn(`[Tagger] Retry attempt ${attempt}: ${error.message}`);
            },
          }
        );
        contextPool.updateContext(context.id, { status: 'completed', result: result.data });
        results.tag = result.data;
        await messageBus.publish('tag_result', 'tagger', result.data);
      } catch (err) {
        contextPool.updateContext(context.id, {
          status: 'failed',
          error: `Tagger failed: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    });
  }

  if (enableTranslation) {
    tasks.push(async () => {
      const context = contextPool.createContext('translator');
      contextPool.updateContext(context.id, { status: 'running' });

      const retryOptions = { ...DEFAULT_PIPELINE_RETRY_OPTIONS };

      try {
        const translator = createTranslatorAgent();
        const result = await withRetry(
          async () => translator(
            { title: article.title, description: article.description },
            targetLang as 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES'
          ),
          {
            ...retryOptions,
            onRetry: (attempt, error) => {
              console.warn(`[Translator] Retry attempt ${attempt}: ${error.message}`);
            },
          }
        );
        contextPool.updateContext(context.id, { status: 'completed', result: result.data });
        results.translation = result.data;
        await messageBus.publish('translation_result', 'translator', result.data);
      } catch (err) {
        contextPool.updateContext(context.id, {
          status: 'failed',
          error: `Translator failed: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    });
  }

  // Execute tasks in parallel
  if (tasks.length > 0) {
    await Promise.all(tasks.map(task => task()));
  }

  // Yield results after parallel execution
  if (results.tag) {
    yield { type: 'tag_delta', data: results.tag };
  }
  if (results.translation) {
    yield { type: 'translation_delta', data: results.translation };
  }
}

/**
 * Run the multi-agent processing pipeline
 * Uses AsyncGenerator pattern for streaming output with MessageBus+ContextPool
 * for parallel agent execution and CriticAgent evaluation
 *
 * @param article - Article to process
 * @param options - Pipeline options
 * @yields PipelineEvent stream
 */
export async function* runPipeline(
  article: PipelineArticle,
  options?: PipelineOptions
): AsyncGenerator<PipelineEvent> {
  const validatedOptions = validatePipelineOptions(options);
  const pipeline = decidePipeline(validatedOptions);

  // Clear previous context pool state
  contextPool.clear();
  messageBus.clearHistory();

  // Track results for critic evaluation
  let extractionResult: ExtractionResult | null = null;
  let summaryResult: { keyPoints: string[] } | null = null;
  let tagResult: { tags: string[] } | null = null;
  let translationResult: { translatedTitle: string; translatedDescription: string } | null = null;

  // Execute sequential agents (extractor, summarizer) first
  for (const agent of pipeline) {
    yield { type: 'agent_start', agent };

    try {
      switch (agent) {
        case 'extractor': {
          for await (const event of runExtractor(article)) {
            yield event;
            if (event.type === 'extraction_delta') {
              extractionResult = event.data;
            }
          }
          break;
        }

        case 'summarizer': {
          if (!extractionResult) {
            extractionResult = {
              title: article.title,
              summary: article.description || article.content.slice(0, 200),
              entities: [],
            };
          }
          for await (const event of runSummarizer(article, extractionResult)) {
            yield event;
            if (event.type === 'summary_delta') {
              summaryResult = event.data;
            }
          }
          break;
        }

        // Skip tagger/translator here - handled in parallel block
        case 'tagger':
        case 'translator': {
          break;
        }
      }
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err.message : String(err) };
    }

    yield { type: 'agent_end', agent };
  }

  // Run tagger and translator in parallel
  const hasParallel = validatedOptions.enableTags || validatedOptions.enableTranslation;
  if (hasParallel) {
    yield { type: 'agent_start', agent: 'parallel_tagger_translator' };

    try {
      for await (const event of runParallelAgents(
        article,
        validatedOptions.targetLanguage,
        validatedOptions.enableTags,
        validatedOptions.enableTranslation
      )) {
        yield event;
        if (event.type === 'tag_delta') {
          tagResult = event.data;
        }
        if (event.type === 'translation_delta') {
          translationResult = event.data;
        }
      }
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err.message : String(err) };
    }

    yield { type: 'agent_end', agent: 'parallel_tagger_translator' };
  }

  // Run CriticAgent evaluation
  yield { type: 'agent_start', agent: 'critic' };
  try {
    const criticResult = await runCritic(extractionResult, summaryResult, tagResult, translationResult);
    yield { type: 'critic_delta', data: criticResult.data };
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : String(err) };
  }
  yield { type: 'agent_end', agent: 'critic' };

  yield { type: 'done' };
}

/**
 * Run pipeline and collect all results
 * Convenience function that collects streaming events into a final result
 */
export async function runPipelineCollected(
  article: PipelineArticle,
  options?: PipelineOptions
): Promise<{
  extraction?: ExtractionResult;
  summary?: { keyPoints: string[] };
  tags?: { tags: string[] };
  translation?: { translatedTitle: string; translatedDescription: string };
  critic?: CriticScore;
}> {
  const results: {
    extraction?: ExtractionResult;
    summary?: { keyPoints: string[] };
    tags?: { tags: string[] };
    translation?: { translatedTitle: string; translatedDescription: string };
    critic?: CriticScore;
  } = {};

  for await (const event of runPipeline(article, options)) {
    switch (event.type) {
      case 'extraction_delta':
        results.extraction = event.data;
        break;
      case 'summary_delta':
        results.summary = event.data;
        break;
      case 'tag_delta':
        results.tags = event.data;
        break;
      case 'translation_delta':
        results.translation = event.data;
        break;
      case 'critic_delta':
        results.critic = event.data;
        break;
    }
  }

  return results;
}

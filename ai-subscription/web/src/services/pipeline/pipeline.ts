/**
 * Pipeline Orchestration
 * AsyncGenerator-based streaming pipeline with MessageBus+ContextPool
 * for parallel agent execution and CriticAgent evaluation
 */

import { decidePipeline, validatePipelineOptions, type PipelineOptions } from './director';
import { createExtractorAgent, createSummarizerAgent, createTaggerAgent, createTranslatorAgent, createCriticAgent } from './agents';
import { messageBus, type MessageType } from './messageBus';
import { contextPool } from './contextPool';
import type { PipelineEvent, PipelineArticle, ExtractionResult, CriticScore } from './types';
import type { AgentResult } from './agents';

// Re-export critic agent creator
export { createCriticAgent } from './criticAgent';

/**
 * Run the extraction agent with streaming output
 */
async function* runExtractor(
  article: PipelineArticle
): AsyncGenerator<PipelineEvent> {
  const extractor = createExtractorAgent();
  const context = contextPool.createContext('extractor');
  contextPool.updateContext(context.id, { status: 'running' });

  try {
    const result = await extractor(article.content);
    contextPool.updateContext(context.id, { status: 'completed', result: result.data });
    
    // Publish result to message bus
    await messageBus.publish('extraction_result', 'extractor', result.data);
    
    yield { type: 'extraction_delta', data: result.data };
  } catch (err) {
    contextPool.updateContext(context.id, { status: 'failed', error: String(err) });
    throw new Error(`Extractor failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Run the summarizer agent with streaming output
 */
async function* runSummarizer(
  article: PipelineArticle,
  extraction: ExtractionResult
): AsyncGenerator<PipelineEvent> {
  const summarizer = createSummarizerAgent();
  const context = contextPool.createContext('summarizer');
  contextPool.updateContext(context.id, { status: 'running' });

  try {
    const result = await summarizer(extraction);
    contextPool.updateContext(context.id, { status: 'completed', result: result.data });
    
    // Publish result to message bus
    await messageBus.publish('summary_result', 'summarizer', result.data);
    
    yield { type: 'summary_delta', data: result.data };
  } catch (err) {
    contextPool.updateContext(context.id, { status: 'failed', error: String(err) });
    throw new Error(`Summarizer failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Run the tagger agent with streaming output
 */
async function* runTagger(article: PipelineArticle): AsyncGenerator<PipelineEvent> {
  const tagger = createTaggerAgent();
  const context = contextPool.createContext('tagger');
  contextPool.updateContext(context.id, { status: 'running' });

  try {
    const result = await tagger(article.content);
    contextPool.updateContext(context.id, { status: 'completed', result: result.data });
    
    // Publish result to message bus
    await messageBus.publish('tag_result', 'tagger', result.data);
    
    yield { type: 'tag_delta', data: result.data };
  } catch (err) {
    contextPool.updateContext(context.id, { status: 'failed', error: String(err) });
    throw new Error(`Tagger failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Run the translator agent with streaming output
 */
async function* runTranslator(
  article: PipelineArticle,
  targetLang: string
): AsyncGenerator<PipelineEvent> {
  const translator = createTranslatorAgent();
  const context = contextPool.createContext('translator');
  contextPool.updateContext(context.id, { status: 'running' });

  try {
    const result = await translator(
      { title: article.title, description: article.description },
      targetLang as 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES'
    );
    contextPool.updateContext(context.id, { status: 'completed', result: result.data });
    
    // Publish result to message bus
    await messageBus.publish('translation_result', 'translator', result.data);
    
    yield { type: 'translation_delta', data: result.data };
  } catch (err) {
    contextPool.updateContext(context.id, { status: 'failed', error: String(err) });
    throw new Error(`Translator failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Run the critic agent to evaluate pipeline results
 */
async function runCritic(
  extraction?: ExtractionResult,
  summary?: { keyPoints: string[] },
  tags?: { tags: string[] },
  translation?: { translatedTitle: string; translatedDescription: string }
): Promise<{ agent: string; data: CriticScore }> {
  const critic = createCriticAgent();
  const context = contextPool.createContext('critic');
  contextPool.updateContext(context.id, { status: 'running' });

  try {
    const result = await critic({ extraction, summary, tags, translation });
    contextPool.updateContext(context.id, { 
      status: 'completed', 
      result: result.data,
      score: result.data.overall 
    });
    
    // Publish result to message bus
    await messageBus.publish('critic_result', 'critic', result.data);
    
    return result;
  } catch (err) {
    contextPool.updateContext(context.id, { status: 'failed', error: String(err) });
    throw new Error(`Critic failed: ${err instanceof Error ? err.message : String(err)}`);
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

  // Create parallel tasks for tagger and translator
  if (enableTags) {
    tasks.push(async () => {
      const context = contextPool.createContext('tagger');
      contextPool.updateContext(context.id, { status: 'running' });
      
      try {
        const tagger = createTaggerAgent();
        const result = await tagger(article.content);
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
      
      try {
        const translator = createTranslatorAgent();
        const result = await translator(
          { title: article.title, description: article.description },
          targetLang as 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES'
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

  // Execute tasks in parallel using Promise.all
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

  // Track extraction result for summarizer
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

        // For tagger and translator, we run them in parallel
        case 'tagger':
        case 'translator': {
          // Skip individual handling - handled in parallel block below
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
  const results: ReturnType<typeof runPipelineCollected> = {};

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

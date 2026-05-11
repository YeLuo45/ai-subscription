/**
 * Pipeline Orchestration
 * AsyncGenerator-based streaming pipeline for multi-agent processing
 */

import { decidePipeline, validatePipelineOptions, type PipelineOptions } from './director';
import { createExtractorAgent, createSummarizerAgent, createTaggerAgent, createTranslatorAgent } from './agents';
import type { PipelineEvent, PipelineArticle, ExtractionResult } from './types';

/**
 * Run the extraction agent with streaming output
 */
async function* runExtractor(
  article: PipelineArticle
): AsyncGenerator<PipelineEvent> {
  const extractor = createExtractorAgent();

  try {
    const result = await extractor(article.content);
    yield { type: 'extraction_delta', data: result.data };
  } catch (err) {
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

  try {
    const result = await summarizer(extraction);
    yield { type: 'summary_delta', data: result.data };
  } catch (err) {
    throw new Error(`Summarizer failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Run the tagger agent with streaming output
 */
async function* runTagger(article: PipelineArticle): AsyncGenerator<PipelineEvent> {
  const tagger = createTaggerAgent();

  try {
    const result = await tagger(article.content);
    yield { type: 'tag_delta', data: result.data };
  } catch (err) {
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

  try {
    const result = await translator(
      { title: article.title, description: article.description },
      targetLang as 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES'
    );
    yield { type: 'translation_delta', data: result.data };
  } catch (err) {
    throw new Error(`Translator failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Run the multi-agent processing pipeline
 * Uses AsyncGenerator pattern for streaming output
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

  // Track extraction result for summarizer
  let extractionResult: ExtractionResult | null = null;

  for (const agent of pipeline) {
    yield { type: 'agent_start', agent };

    try {
      switch (agent) {
        case 'extractor': {
          for await (const event of runExtractor(article)) {
            yield event;
            // Capture extraction result for summarizer
            if (event.type === 'extraction_delta') {
              extractionResult = event.data;
            }
          }
          break;
        }

        case 'summarizer': {
          if (!extractionResult) {
            // If extraction was skipped, create basic extraction
            extractionResult = {
              title: article.title,
              summary: article.description || article.content.slice(0, 200),
              entities: [],
            };
          }
          for await (const event of runSummarizer(article, extractionResult)) {
            yield event;
          }
          break;
        }

        case 'tagger': {
          for await (const event of runTagger(article)) {
            yield event;
          }
          break;
        }

        case 'translator': {
          for await (const event of runTranslator(article, validatedOptions.targetLanguage)) {
            yield event;
          }
          break;
        }
      }
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err.message : String(err) };
    }

    yield { type: 'agent_end', agent };
  }

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
    }
  }

  return results;
}

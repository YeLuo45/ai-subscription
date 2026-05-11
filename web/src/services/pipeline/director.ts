/**
 * Pipeline Director
 * Decides which agents to run based on options
 */

import type { Language } from './types';

export interface PipelineOptions {
  /** Enable extraction agent (default: true) */
  enableExtraction?: boolean;
  /** Enable summarization agent (default: true) */
  enableSummary?: boolean;
  /** Enable tagging agent (default: false) */
  enableTags?: boolean;
  /** Enable translation agent (default: false) */
  enableTranslation?: boolean;
  /** Target language for translation (e.g., 'ZH', 'EN') */
  targetLanguage?: Language;
}

/**
 * Decide which pipeline agents to run based on options
 * @param options - Pipeline options
 * @returns Ordered list of agent names to execute
 */
export function decidePipeline(options: PipelineOptions): string[] {
  const pipeline: string[] = [];

  if (options.enableExtraction !== false) {
    pipeline.push('extractor');
  }

  if (options.enableSummary !== false) {
    pipeline.push('summarizer');
  }

  if (options.enableTags) {
    pipeline.push('tagger');
  }

  if (options.enableTranslation) {
    pipeline.push('translator');
  }

  return pipeline;
}

/**
 * Validate pipeline options
 * @param options - Pipeline options to validate
 * @returns Validated options with defaults applied
 */
export function validatePipelineOptions(options?: PipelineOptions): Required<PipelineOptions> {
  return {
    enableExtraction: options?.enableExtraction ?? true,
    enableSummary: options?.enableSummary ?? true,
    enableTags: options?.enableTags ?? false,
    enableTranslation: options?.enableTranslation ?? false,
    targetLanguage: options?.targetLanguage ?? 'ZH',
  };
}

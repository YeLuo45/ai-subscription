/**
 * Pipeline Module
 * Multi-agent collaboration processing pipeline
 *
 * @example
 * ```typescript
 * import { runPipeline } from './services/pipeline';
 *
 * for await (const event of runPipeline(article, { enableTags: true })) {
 *   console.log(event);
 * }
 * ```
 */

// Types
export type { PipelineEvent, Language, PipelineArticle, ExtractionResult, SummaryResult, TagResult, TranslationResult } from './types';

// Director
export type { PipelineOptions } from './director';
export { decidePipeline, validatePipelineOptions } from './director';

// Pipeline
export { runPipeline, runPipelineCollected } from './pipeline';

/**
 * Pipeline Event Types
 * Defines the streaming event types for multi-agent pipeline processing
 */

/**
 * Supported target languages for translation
 */
export type Language = 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES';

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
 * Pipeline event types for streaming output
 */
export type PipelineEvent =
  | { type: 'agent_start'; agent: string }
  | { type: 'extraction_delta'; data: ExtractionResult }
  | { type: 'summary_delta'; data: SummaryResult }
  | { type: 'tag_delta'; data: TagResult }
  | { type: 'translation_delta'; data: TranslationResult }
  | { type: 'agent_end'; agent: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

/**
 * Article input for pipeline processing
 */
export interface PipelineArticle {
  title: string;
  content: string;
  description?: string;
}

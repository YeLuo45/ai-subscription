/**
 * Multi-Agent Module
 * Multi-agent collaboration system for content processing
 * 
 * @example
 * ```typescript
 * import { ContentPipelineTeam, getContentPipelineTeam } from './services/multi-agent';
 * 
 * const team = getContentPipelineTeam({ enableTags: true });
 * 
 * for await (const event of team.runPipeline({ title: 'Test', content: '...' })) {
 *   console.log(event);
 * }
 * ```
 */

// Agents
export * from './agents';

// Content Pipeline Team
export {
  ContentPipelineTeam,
  getContentPipelineTeam,
  resetContentPipelineTeam,
  type ContentPipelineConfig,
  type PipelineEvent,
  type PipelineArticle,
  type ContentPipelineResult,
} from './content-pipeline-team';

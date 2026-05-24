/**
 * MCP Tool: generate_push_strategy
 * Exposes push strategy decision via MCP
 */

import { routeAndCall } from '../../../../shared/lib/ai/llm-router';

export interface PushStrategyInput {
  articleTitle: string;
  summary?: string;
  tags?: string[];
}

export interface PushStrategyOutput {
  action: 'push_now' | 'aggregate' | 'archive' | 'review';
  confidence: number;
  reason: string;
}

export async function pushStrategyTool(input: PushStrategyInput): Promise<PushStrategyOutput> {
  if (!input.articleTitle) {
    throw new Error('articleTitle is required');
  }

  const messages = [
    {
      role: 'user' as const,
      content: `Analyze and decide push strategy for: ${input.articleTitle}${input.summary ? `\n\nSummary: ${input.summary}` : ''}${input.tags ? `\n\nTags: ${input.tags.join(', ')}` : ''}`,
    },
  ];

  try {
    const result = await routeAndCall({
      taskType: 'push-strategy',
      messages,
      modelHint: 'gpt-4o',
    });

    const strategy = (result as any).action || 'review';
    return {
      action: ['push_now', 'aggregate', 'archive', 'review'].includes(strategy) ? strategy as any : 'review',
      confidence: (result as any).confidence || 0.6,
      reason: (result as any).reason || 'AI-generated decision',
    };
  } catch (error) {
    // Fallback to simple heuristic when AI fails
    const hasTags = input.tags && input.tags.length > 0;
    return {
      action: hasTags ? 'push_now' : 'review',
      confidence: 0.5,
      reason: 'Fallback: ' + (error instanceof Error ? error.message : 'AI unavailable'),
    };
  }
}

/**
 * MCP Tool: generate_push_strategy
 * Exposes push strategy decision via MCP
 */

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

  // Simple heuristic-based strategy decision
  const hasTags = input.tags && input.tags.length > 0;
  const hasSummary = input.summary && input.summary.length > 50;
  const titleLower = input.articleTitle.toLowerCase();
  const isUrgent = /\b(breaking|urgent|alert|emergency|critical|now|immediate)\b/i.test(titleLower);
  const isRecurring = /\b(daily|weekly|monthly|regular|recurring)\b/i.test(titleLower);

  if (isUrgent) {
    return { action: 'push_now', confidence: 0.9, reason: 'Urgent keyword detected' };
  }
  if (isRecurring) {
    return { action: 'aggregate', confidence: 0.8, reason: 'Recurring content aggregated' };
  }
  if (hasTags && hasSummary) {
    return { action: 'push_now', confidence: 0.7, reason: 'Content with tags and summary' };
  }
  if (!hasTags && !hasSummary) {
    return { action: 'archive', confidence: 0.6, reason: 'No tags or summary, auto-archived' };
  }

  return { action: 'review', confidence: 0.5, reason: 'Needs manual review' };
}

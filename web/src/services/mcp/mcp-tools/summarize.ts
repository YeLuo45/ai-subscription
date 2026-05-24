/**
 * MCP Tool: summarize_article
 * Exposes structured summary generation via MCP
 */

export interface SummarizeInput {
  articleUrl?: string;
  articleContent?: string;
}

export interface SummarizeOutput {
  title: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
}

export async function summarizeTool(input: SummarizeInput): Promise<SummarizeOutput> {
  if (!input.articleUrl && !input.articleContent) {
    throw new Error('Either articleUrl or articleContent is required');
  }

  // Build a placeholder result for now - actual LLM call would use routeAndCall
  // The import path issue will be resolved when integrated with the MCP server
  return {
    title: input.articleUrl ? new URL(input.articleUrl).hostname : 'Article Summary',
    keyPoints: ['Key insight 1', 'Key insight 2'],
    sentiment: 'neutral',
    summary: input.articleContent ? input.articleContent.slice(0, 200) + '...' : 'Summary placeholder',
  };
}

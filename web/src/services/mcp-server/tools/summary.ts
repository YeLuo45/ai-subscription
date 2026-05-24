/**
 * Summary Tool for MCP Server
 * Implements: summarize_article
 */

import type { MCPTool, MCPToolCallResult, SummarizeArticleParams } from '../types';
import { getArticles, saveSummary } from '../../storage';

// Tool definition
export const summarizeArticleTool: MCPTool = {
  name: 'summarize_article',
  description: 'Generate an AI-powered summary for an article. Returns concise summary with key points.',
  inputSchema: {
    type: 'object',
    properties: {
      articleId: {
        type: 'string',
        description: 'Article ID to summarize',
      },
      length: {
        type: 'string',
        description: 'Summary length: short, medium, or long (default: medium)',
        enum: ['short', 'medium', 'long'],
        default: 'medium',
      },
    },
    required: ['articleId'],
  },
};

// Tool handler
async function handleSummarizeArticle(args: Record<string, unknown>): Promise<MCPToolCallResult> {
  try {
    const params = args as unknown as SummarizeArticleParams;
    const { articleId, length = 'medium' } = params;

    if (!articleId || typeof articleId !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Invalid params: articleId is required' }),
        }],
        isError: true,
      };
    }

    // Find the article
    const articles = await getArticles(undefined, 1000);
    const article = articles.find(a => a.id === articleId);

    if (!article) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Article not found', code: -32002 }),
        }],
        isError: true,
      };
    }

    // Generate summary based on length
    const contentToSummarize = article.content || article.description;
    const maxLength = length === 'short' ? 100 : length === 'long' ? 500 : 200;
    
    // Simple extractive summarization (first N characters of description)
    // In production, this would call the LLM router for AI-generated summary
    let summaryText: string;
    if (contentToSummarize && contentToSummarize.length > maxLength) {
      // Truncate intelligently at sentence boundary
      const truncated = contentToSummarize.slice(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastNewline = truncated.lastIndexOf('\n');
      const cutPoint = lastPeriod > 0 ? lastPeriod + 1 : lastNewline > 0 ? lastNewline : maxLength;
      summaryText = truncated.slice(0, cutPoint).trim();
    } else {
      summaryText = contentToSummarize || article.description;
    }

    // Generate keywords from title and content
    const wordList = (article.title + ' ' + (article.content || '')).toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .filter((w: string) => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were', 'will', 'their'].includes(w));
    
    const uniqueWords: string[] = [];
    for (const w of wordList) {
      if (!uniqueWords.includes(w)) {
        uniqueWords.push(w);
      }
    }
    const keywords = uniqueWords.slice(0, 5);

    // Save the summary
    const summary = await saveSummary({
      articleId: article.id,
      subscriptionId: article.subscriptionId,
      content: summaryText,
      keywords,
      modelId: 'local-summarizer',
      tokenUsed: Math.ceil(summaryText.length / 4),
      tags: [],
      isStarred: false,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          summary: {
            id: summary.id,
            content: summary.content,
            keywords: summary.keywords,
            length,
            modelId: summary.modelId,
          },
          article: {
            id: article.id,
            title: article.title,
          },
        }),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Failed to summarize article', details: error instanceof Error ? error.message : String(error) }),
      }],
      isError: true,
    };
  }
}

// Export tool handlers map
export const summaryTools = {
  summarize_article: handleSummarizeArticle,
};

// Export tool definitions
export const summaryToolDefs: MCPTool[] = [
  summarizeArticleTool,
];
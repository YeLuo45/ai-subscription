/**
 * Article Management Tools for MCP Server
 * Implements: fetch_articles, search_articles
 */

import type { MCPTool, MCPToolCallResult, ArticleData, FetchArticlesParams, SearchArticlesParams } from '../types';
import { MCP_SERVER_ERROR_CODES } from '../types';
import { getArticles } from '../../storage';

// Tool definitions
export const fetchArticlesTool: MCPTool = {
  name: 'fetch_articles',
  description: 'Fetch articles from subscriptions. Supports pagination with limit and offset.',
  inputSchema: {
    type: 'object',
    properties: {
      subscriptionId: {
        type: 'string',
        description: 'Optional subscription ID to filter articles',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of articles to return (default: 50)',
        default: 50,
        minimum: 1,
        maximum: 200,
      },
      offset: {
        type: 'number',
        description: 'Number of articles to skip for pagination (default: 0)',
        default: 0,
        minimum: 0,
      },
    },
    required: [],
  },
};

export const searchArticlesTool: MCPTool = {
  name: 'search_articles',
  description: 'Search articles by keyword. Matches title, description, and content.',
  inputSchema: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: 'Search keyword',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of articles to return (default: 20)',
        default: 20,
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['keyword'],
  },
};

// Tool handlers
async function handleFetchArticles(args: Record<string, unknown>): Promise<MCPToolCallResult> {
  try {
    const params = args as unknown as FetchArticlesParams;
    const { subscriptionId, limit = 50, offset = 0 } = params;

    const articles = await getArticles(subscriptionId, limit + offset);
    
    // Apply pagination
    const paginatedArticles = articles.slice(offset, offset + limit);
    
    const result: ArticleData[] = paginatedArticles.map(article => ({
      id: article.id,
      subscriptionId: article.subscriptionId,
      title: article.title,
      link: article.link,
      description: article.description,
      content: article.content,
      author: article.author,
      pubDate: article.pubDate,
      fetchedAt: article.fetchedAt,
      isRead: article.isRead,
      isStarred: article.isStarred,
      isReadLater: article.isReadLater,
      readLaterAt: article.readLaterAt,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          articles: result,
          total: articles.length,
          hasMore: articles.length > offset + limit,
        }),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Failed to fetch articles', details: error instanceof Error ? error.message : String(error) }),
      }],
      isError: true,
    };
  }
}

async function handleSearchArticles(args: Record<string, unknown>): Promise<MCPToolCallResult> {
  try {
    const params = args as unknown as SearchArticlesParams;
    const { keyword, limit = 20 } = params;

    if (!keyword || typeof keyword !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Invalid params: keyword is required' }),
        }],
        isError: true,
      };
    }

    const allArticles = await getArticles(undefined, 500); // Get more for search
    const keywordLower = keyword.toLowerCase();
    
    const matchedArticles = allArticles.filter(article => {
      return (
        article.title.toLowerCase().includes(keywordLower) ||
        article.description.toLowerCase().includes(keywordLower) ||
        (article.content && article.content.toLowerCase().includes(keywordLower))
      );
    }).slice(0, limit);

    const result: ArticleData[] = matchedArticles.map(article => ({
      id: article.id,
      subscriptionId: article.subscriptionId,
      title: article.title,
      link: article.link,
      description: article.description,
      content: article.content,
      author: article.author,
      pubDate: article.pubDate,
      fetchedAt: article.fetchedAt,
      isRead: article.isRead,
      isStarred: article.isStarred,
      isReadLater: article.isReadLater,
      readLaterAt: article.readLaterAt,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          articles: result,
          total: matchedArticles.length,
          keyword,
        }),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Failed to search articles', details: error instanceof Error ? error.message : String(error) }),
      }],
      isError: true,
    };
  }
}

// Export tool handlers map
export const articleTools = {
  fetch_articles: handleFetchArticles,
  search_articles: handleSearchArticles,
};

// Export tool definitions
export const articleToolDefs: MCPTool[] = [
  fetchArticlesTool,
  searchArticlesTool,
];
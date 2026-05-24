/**
 * MCP Server Tool Registry
 * Aggregates all tool definitions and handlers
 */

import type { MCPTool, ToolHandler } from '../types';
import { subscriptionToolDefs, subscriptionTools } from './subscriptions';
import { articleToolDefs, articleTools } from './articles';
import { summaryToolDefs, summaryTools } from './summary';

// All tool definitions
export const allToolDefs: MCPTool[] = [
  ...subscriptionToolDefs,
  ...articleToolDefs,
  ...summaryToolDefs,
];

// All tool handlers
export const allToolHandlers: Record<string, ToolHandler> = {
  ...subscriptionTools,
  ...articleTools,
  ...summaryTools,
};

// Tool name constants
export const TOOL_NAMES = {
  LIST_SUBSCRIPTIONS: 'list_subscriptions',
  ADD_SUBSCRIPTION: 'add_subscription',
  REMOVE_SUBSCRIPTION: 'remove_subscription',
  FETCH_ARTICLES: 'fetch_articles',
  SEARCH_ARTICLES: 'search_articles',
  SUMMARIZE_ARTICLE: 'summarize_article',
} as const;

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];
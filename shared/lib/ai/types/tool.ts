/**
 * Tool Types for AI Function Calling
 * Defines tool names, tool call structures, and tool definitions with Zod schemas
 */

import { z } from 'zod';

export type ToolName = 'web_search' | 'fetch_rss' | 'calculate';

export interface ToolCall {
  toolName: ToolName;
  params: Record<string, unknown>;
}

export interface ToolResult {
  toolName: ToolName;
  result: unknown;
  error?: string;
}

export const toolDefinitions = {
  web_search: {
    description: 'Search the web for latest information about any topic',
    parameters: z.object({
      query: z.string().describe('The search query'),
    }),
  },

  fetch_rss: {
    description: 'Fetch the latest items from an RSS feed URL',
    parameters: z.object({
      url: z.string().url().describe('The RSS feed URL'),
    }),
  },

  calculate: {
    description: 'Evaluate a mathematical expression',
    parameters: z.object({
      expression: z.string().describe('Math expression, e.g. "sqrt(16) + 2^3"'),
    }),
  },
} as const;

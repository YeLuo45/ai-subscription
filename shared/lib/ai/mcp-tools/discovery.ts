/**
 * MCP Tool Discovery
 * Tool categories, built-in tools, and search functionality
 */

import type { MCPTool, ToolCategory, MCPTool as IMCPTool } from './types';

/**
 * Predefined tool categories
 */
export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'web',
    name: 'Web & Search',
    description: 'Tools for web search and content fetching',
    tags: ['search', 'web', 'http', 'fetch'],
  },
  {
    id: 'data',
    name: 'Data Processing',
    description: 'Tools for data manipulation and processing',
    tags: ['math', 'calculate', 'transform', 'parse'],
  },
  {
    id: 'rss',
    name: 'RSS & Feeds',
    description: 'Tools for RSS feed consumption and parsing',
    tags: ['rss', 'feed', 'xml', 'atom'],
  },
  {
    id: 'utility',
    name: 'Utilities',
    description: 'General utility tools',
    tags: ['utility', 'helper', 'misc'],
  },
];

/**
 * Built-in MCP tools
 */
export const BUILT_IN_TOOLS: IMCPTool[] = [
  {
    id: 'builtin-web-search',
    name: 'Web Search',
    description: 'Search the web for latest information about any topic',
    provider: 'built-in',
    toolSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
    capabilities: ['search', 'web', 'http'],
    isBuiltIn: true,
    createdAt: Date.now(),
  },
  {
    id: 'builtin-fetch-rss',
    name: 'Fetch RSS',
    description: 'Fetch the latest items from an RSS feed URL',
    provider: 'built-in',
    toolSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The RSS feed URL' },
      },
      required: ['url'],
    },
    capabilities: ['rss', 'feed', 'xml'],
    isBuiltIn: true,
    createdAt: Date.now(),
  },
  {
    id: 'builtin-calculate',
    name: 'Calculator',
    description: 'Evaluate a mathematical expression',
    provider: 'built-in',
    toolSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression, e.g. "sqrt(16) + 2^3"' },
      },
      required: ['expression'],
    },
    capabilities: ['math', 'calculate'],
    isBuiltIn: true,
    createdAt: Date.now(),
  },
];

/**
 * Search tools by query and optional filters
 */
export function searchTools(
  query: string,
  filters?: {
    category?: string;
    capability?: string;
    provider?: string;
  }
): MCPTool[] {
  const lowerQuery = query.toLowerCase();
  
  return BUILT_IN_TOOLS.filter(tool => {
    // Text match on name or description
    const matchesQuery = !query || 
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.capabilities.some(cap => cap.toLowerCase().includes(lowerQuery));
    
    if (!matchesQuery) return false;
    
    // Provider filter
    if (filters?.provider && tool.provider !== filters.provider) return false;
    
    // Capability filter
    if (filters?.capability && !tool.capabilities.includes(filters.capability)) return false;
    
    return true;
  });
}

/**
 * Get all built-in tools
 */
export function getBuiltInTools(): MCPTool[] {
  return [...BUILT_IN_TOOLS];
}

/**
 * Find tools by capability
 */
export function findByCapability(capability: string): MCPTool[] {
  return BUILT_IN_TOOLS.filter(tool => tool.capabilities.includes(capability));
}

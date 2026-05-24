/**
 * MCP Client Module Index
 * 
 * Unified exports for MCP Client functionality including:
 * - HTTP Transport
 * - GitHub Adapter
 * - MCP Client Panel
 * - Tool integration
 */

export { HTTPTransport, createHTTPTransport, isHTTPURL, parseServerURL } from './http-transport';
export type { HTTPTransportConfig } from './http-transport';
export { HTTPTransportError } from './http-transport';

export { createGitHubAdapter, DEFAULT_GITHUB_MCP_URL } from './adapters/github-adapter';
export type { GitHubAdapterConfig, GitHubSearchResult, GitHubRepoInfo } from './adapters/github-adapter';
export type { MCPServerAdapter } from './adapters/github-adapter';

export { MCPClient, createMCPClient } from './client';
export { getMCPServerRegistry } from './registry';
export type { MCPRegistryEvent, MCPServerStatus } from './registry';

export {
  mcpToolToAITool,
  mcpToolsToAITools,
  executeMCPTool,
  createMCPToolExecutor,
  getAvailableMCPToolsForAI,
  getMCPToolsByServer,
  MCPToolAdapter,
  createMCPToolAdapter,
} from './tool-adapter';

// Re-export AI adapter functions for tool integration
export {
  callMCPTool,
  detectGitHubURL,
  normalizeGitHubUrl,
  getRepoInfo,
  searchGitHubRepositories,
  enhanceArticleWithGitHub,
  shouldTriggerSearch,
  searchWithBrave,
  enhanceArticleWithSearch,
  enhanceWithMCP,
  getMCPEnhanceConfig,
  saveMCPEnhanceConfig,
  updateMCPEnhanceConfig,
  type MCPEnhanceConfig,
  type Article,
  type AnalysisContext,
  type EnrichedArticle,
  type GitHubRepoInfo as GitHubRepoInfoType,
  type SearchResult,
} from './ai-adapter';

// Re-export types
export type {
  MCPServerConfig,
  MCPClientConfig,
  MCPTool,
  MCPToolList,
  MCPToolCallRequest,
  MCPToolCallResult,
  MCPClientState,
  MCPServerStatus as MCPServerStatusType,
  MCPClientEvent,
  ToolCallRequest,
  ToolCallResult,
} from './types';

export { MCP_STORAGE_KEY, MCP_ERROR_CODES, DEFAULT_MCP_CONFIG } from './types';
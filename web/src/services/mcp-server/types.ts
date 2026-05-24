/**
 * MCP Server Type Definitions
 * Core types for MCP (Model Context Protocol) Server implementation
 */

// JSON-RPC 2.0 Types (reused from MCP client)
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// MCP Server Error Codes
export const MCP_SERVER_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Application-specific error codes
  SUBSCRIPTION_NOT_FOUND: -32001,
  ARTICLE_NOT_FOUND: -32002,
  RESOURCE_NOT_FOUND: -32003,
} as const;

export type MCPServerErrorCode = typeof MCP_SERVER_ERROR_CODES[keyof typeof MCP_SERVER_ERROR_CODES];

// MCP Tool Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolInputSchema;
}

export interface MCPToolInputSchema {
  type: 'object';
  properties: Record<string, MCPToolProperty>;
  required?: string[];
}

export interface MCPToolProperty {
  type: string;
  description: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
}

export interface MCPToolList {
  tools: MCPTool[];
}

export interface MCPToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// MCP Server Capabilities
export interface ServerCapabilities {
  tools: MCPToolList;
  resources?: {
    list: () => { resources: unknown[] };
  };
  prompts?: {
    list: () => { prompts: unknown[] };
  };
}

// MCP Server Info
export interface MCPServerInfo {
  name: string;
  version: string;
}

// Tool Handler Types
export type ToolHandler = (args: Record<string, unknown>) => Promise<MCPToolCallResult>;

export interface ToolRegistry {
  [toolName: string]: ToolHandler;
}

// Initialize request/response
export interface InitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: MCPServerInfo;
}

// Subscription types for tools
export interface SubscriptionData {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'atom' | 'api';
  category: string;
  enabled: boolean;
  aiSummaryEnabled: boolean;
  fetchIntervalMinutes: number;
  lastFetchedAt?: string;
  createdAt: string;
  updatedAt: string;
  groupId?: string;
  useCustomInterval: boolean;
}

export interface AddSubscriptionParams {
  url: string;
  name: string;
  category?: string;
}

export interface RemoveSubscriptionParams {
  id: string;
}

// Article types for tools
export interface ArticleData {
  id: string;
  subscriptionId: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  author?: string;
  pubDate: string;
  fetchedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isReadLater: boolean;
  readLaterAt?: string;
}

export interface FetchArticlesParams {
  subscriptionId?: string;
  limit?: number;
  offset?: number;
}

export interface SearchArticlesParams {
  keyword: string;
  limit?: number;
}

export interface SummarizeArticleParams {
  articleId: string;
  length?: 'short' | 'medium' | 'long';
}
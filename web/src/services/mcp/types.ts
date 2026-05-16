/**
 * MCP Client Type Definitions
 * Core types for MCP (Model Context Protocol) client implementation
 */

// MCP Server Configuration
export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;           // Command to start the MCP server
  args: string[];            // Command line arguments
  env: Record<string, string>;  // Environment variables
  enabled: boolean;
  lastError?: string;
  lastConnected?: number;     // Unix timestamp
}

// MCP Client Configuration
export interface MCPClientConfig {
  servers: MCPServerConfig[];
  autoConnect: boolean;       // Auto-connect to enabled servers on init
  connectionTimeout: number; // Timeout in ms for connection attempts
}

// MCP JSON-RPC Message Types
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

// MCP Protocol Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolList {
  tools: MCPTool[];
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
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

// Tool Call for AI SDK Integration
export interface ToolCallRequest {
  toolName: string;
  params: Record<string, unknown>;
}

export interface ToolCallResult {
  toolName: string;
  result: unknown;
  error?: string;
}

// MCP Client State
export type MCPClientState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface MCPServerStatus {
  serverId: string;
  state: MCPClientState;
  error?: string;
  availableTools: MCPTool[];
}

// Event Types
export interface MCPClientEvent {
  type: 'connected' | 'disconnected' | 'error' | 'toolsUpdated';
  serverId: string;
  timestamp: number;
  tools?: MCPTool[];
  error?: string;
}

// LocalStorage Keys
export const MCP_STORAGE_KEY = 'mcp-server-config';

// Error Codes
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  CONNECTION_FAILED: -32001,
  TIMEOUT: -32002,
} as const;

// Default Configuration
export const DEFAULT_MCP_CONFIG: MCPClientConfig = {
  servers: [],
  autoConnect: true,
  connectionTimeout: 10000,
};
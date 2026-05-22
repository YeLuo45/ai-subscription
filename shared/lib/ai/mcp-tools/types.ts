/**
 * MCP Tool Types
 * Core type definitions for MCP tool registry, discovery, and invocation
 */

/**
 * MCP Tool definition
 */
export interface MCPTool {
  id: string;
  name: string;
  description: string;
  provider: string;
  endpoint?: string;
  toolSchema: any;  // JSONSchema
  capabilities: string[];
  isBuiltIn: boolean;
  createdAt: number;
}

/**
 * Tool category for organization and discovery
 */
export interface ToolCategory {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

/**
 * Request to call an MCP tool
 */
export interface ToolCallRequest {
  toolId: string;
  parameters: Record<string, any>;
  timeoutMs?: number;
}

/**
 * Result from calling an MCP tool
 */
export interface ToolCallResult {
  success: boolean;
  result?: any;
  error?: string;
  latencyMs: number;
}

/**
 * Tool usage statistics
 */
export interface ToolUsageStats {
  toolId: string;
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  lastUsed: number;
}

/**
 * Built-in tool executor function signature
 */
export type BuiltInToolExecutor = (params: Record<string, any>) => Promise<any>;

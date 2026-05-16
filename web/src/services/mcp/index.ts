/**
 * MCP Client Module
 * 
 * Provides MCP (Model Context Protocol) client functionality for connecting
 * to MCP servers and using their tools within the AI subscription system.
 */

// Re-export all public types and functions
export type {
  MCPServerConfig,
  MCPClientConfig,
  MCPTool,
  MCPToolList,
  MCPToolCallRequest,
  MCPToolCallResult,
  MCPClientState,
  MCPServerStatus,
  MCPClientEvent,
  ToolCallRequest,
  ToolCallResult,
} from './types';

export { MCP_STORAGE_KEY, MCP_ERROR_CODES, DEFAULT_MCP_CONFIG } from './types';

export { MCPClient, createMCPClient } from './client';
export { getMCPServerRegistry } from './registry';
export type { MCPRegistryEvent } from './registry';

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
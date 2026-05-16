/**
 * MCP Tool Adapter - Adapts MCP tools to AI SDK tool format
 * 
 * This module provides integration between MCP tools (from MCP servers)
 * and the AI SDK's tool calling format used by routeAndCall in llm-router.ts.
 */

import type { MCPTool, MCPToolCallResult, ToolCallRequest, ToolCallResult } from './types';
import { getMCPServerRegistry } from './registry';

// Re-export types for convenience
export type { MCPTool, MCPToolCallResult, ToolCallRequest, ToolCallResult };

/**
 * Convert an MCP tool to AI SDK tool format
 */
export function mcpToolToAITool(tool: MCPTool): {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
} {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  };
}

/**
 * Convert MCP tools to AI SDK format
 */
export function mcpToolsToAITools(mcpTools: MCPTool[]): Array<{
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}> {
  return mcpTools.map(mcpToolToAITool);
}

/**
 * Execute an MCP tool and format the result
 */
export async function executeMCPTool(
  serverId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    const registry = getMCPServerRegistry();
    const result = await registry.callTool(serverId, toolName, params);
    
    // Extract text content from MCP result
    let textResult = '';
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          textResult += item.text;
        }
      }
    }
    
    return {
      toolName,
      result: textResult || result,
      error: result.isError ? 'Tool execution returned error' : undefined,
    };
  } catch (error) {
    return {
      toolName,
      result: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a tool executor function for a specific MCP tool
 */
export function createMCPToolExecutor(serverId: string) {
  return async (toolName: string, params: Record<string, unknown>): Promise<unknown> => {
    const result = await executeMCPTool(serverId, toolName, params);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.result;
  };
}

/**
 * Get all available MCP tools from all connected servers
 * Formatted for AI SDK consumption
 */
export function getAvailableMCPToolsForAI(): Array<{
  serverId: string;
  serverName: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}> {
  const registry = getMCPServerRegistry();
  const allTools = registry.getAllTools();
  
  return allTools.map(({ serverId, serverName, tool }) => ({
    serverId,
    serverName,
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }));
}

/**
 * Get tools grouped by server
 */
export function getMCPToolsByServer(): Record<string, Array<{
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}>> {
  const registry = getMCPServerRegistry();
  const allTools = registry.getAllTools();
  const byServer: Record<string, Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>> = {};

  for (const { serverId, tool } of allTools) {
    if (!byServer[serverId]) {
      byServer[serverId] = [];
    }
    byServer[serverId].push({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    });
  }

  return byServer;
}

/**
 * MCPToolAdapter - Class for adapting multiple MCP tools
 */
export class MCPToolAdapter {
  private serverId: string;
  private tools: Map<string, MCPTool> = new Map();

  constructor(serverId: string, tools: MCPTool[] = []) {
    this.serverId = serverId;
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * Add a tool to the adapter
   */
  addTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool
   */
  async execute(name: string, params: Record<string, unknown>): Promise<ToolCallResult> {
    if (!this.tools.has(name)) {
      return {
        toolName: name,
        result: null,
        error: `Tool ${name} not found`,
      };
    }
    return executeMCPTool(this.serverId, name, params);
  }

  /**
   * Convert all tools to AI SDK format
   */
  toAITools(): Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> {
    return Array.from(this.tools.values()).map(mcpToolToAITool);
  }
}

/**
 * Create an MCPToolAdapter for a server
 */
export function createMCPToolAdapter(serverId: string, tools: MCPTool[] = []): MCPToolAdapter {
  return new MCPToolAdapter(serverId, tools);
}
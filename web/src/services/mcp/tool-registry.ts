/**
 * MCP Tool Registry
 * Central registry for all MCP tools exposed by ai-subscription
 */

import type { MCPTool } from './types';

export interface ToolHandler {
  (input: Record<string, unknown>): Promise<unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: ToolHandler;
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Register a new tool
   */
  registerTool(
    name: string,
    handler: ToolHandler,
    inputSchema: Record<string, unknown>,
    description: string
  ): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool already registered: ${name}`);
    }
    this.tools.set(name, { name, description, inputSchema, handler });
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools as MCPTool format
   */
  getMCPTools(): MCPTool[] {
    return this.listTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Call a tool by name
   */
  async callTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.handler(input);
  }
}

export const toolRegistry = new ToolRegistry();
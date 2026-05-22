/**
 * MCP Tool Registry
 * Central registry for managing MCP tools (both built-in and external)
 */

import type { MCPTool, BuiltInToolExecutor } from './types';
import { BUILT_IN_TOOLS } from './discovery';

/**
 * In-memory storage for tool executors (built-in tools)
 */
const builtInExecutors: Map<string, BuiltInToolExecutor> = new Map();

/**
 * MCP Tool Registry class
 * Manages registration, unregistration, and querying of MCP tools
 */
class MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  constructor() {
    // Initialize with built-in tools
    this.initializeBuiltInTools();
  }

  /**
   * Initialize built-in tools from discovery module
   */
  private initializeBuiltInTools(): void {
    for (const tool of BUILT_IN_TOOLS) {
      this.tools.set(tool.id, tool);
    }
  }

  /**
   * Register a new tool
   */
  register(tool: MCPTool): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool ${tool.id} is already registered, overwriting`);
    }
    this.tools.set(tool.id, tool);
  }

  /**
   * Unregister a tool by ID
   */
  unregister(toolId: string): void {
    if (!this.tools.has(toolId)) {
      console.warn(`Tool ${toolId} is not registered`);
      return;
    }
    this.tools.delete(toolId);
  }

  /**
   * Get a tool by ID
   */
  getTool(toolId: string): MCPTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * List all registered tools
   */
  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools by provider
   */
  listByProvider(provider: string): MCPTool[] {
    return this.listTools().filter(tool => tool.provider === provider);
  }

  /**
   * Register a built-in tool executor
   */
  registerExecutor(toolId: string, executor: BuiltInToolExecutor): void {
    builtInExecutors.set(toolId, executor);
  }

  /**
   * Get a built-in tool executor
   */
  getExecutor(toolId: string): BuiltInToolExecutor | undefined {
    return builtInExecutors.get(toolId);
  }

  /**
   * Clear all tools (mainly for testing)
   */
  clear(): void {
    this.tools.clear();
    builtInExecutors.clear();
    this.initializeBuiltInTools();
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new MCPToolRegistry();

export { MCPToolRegistry };

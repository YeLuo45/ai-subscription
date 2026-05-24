/**
 * ToolRegistry Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { toolRegistry, ToolRegistry } from './tool-registry';

describe('ToolRegistry', () => {
  beforeEach(() => {
    // Create a fresh registry for each test
  });

  it('should register a tool', () => {
    const handler = async (input: Record<string, unknown>) => ({ result: input.value });
    toolRegistry.registerTool('test_tool', handler, { type: 'object' }, 'Test tool');
    expect(toolRegistry.getTool('test_tool')).toBeDefined();
    expect(toolRegistry.getTool('test_tool')?.name).toBe('test_tool');
  });

  it('should list all registered tools', () => {
    const handler1 = async (input: Record<string, unknown>) => input;
    const handler2 = async (input: Record<string, unknown>) => input;
    toolRegistry.registerTool('tool1', handler1, { type: 'object' }, 'Tool 1');
    toolRegistry.registerTool('tool2', handler2, { type: 'object' }, 'Tool 2');
    const tools = toolRegistry.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(2);
  });

  it('should get MCP tools format', () => {
    const handler = async (input: Record<string, unknown>) => input;
    toolRegistry.registerTool('mcp_tool', handler, { type: 'object', properties: {} }, 'MCP tool');
    const mcpTools = toolRegistry.getMCPTools();
    expect(mcpTools.some(t => t.name === 'mcp_tool')).toBe(true);
  });

  it('should throw on duplicate tool registration', () => {
    const handler = async (input: Record<string, unknown>) => input;
    toolRegistry.registerTool('dup_tool', handler, { type: 'object' }, 'Dup');
    expect(() => {
      toolRegistry.registerTool('dup_tool', handler, { type: 'object' }, 'Dup again');
    }).toThrow('Tool already registered: dup_tool');
  });
});

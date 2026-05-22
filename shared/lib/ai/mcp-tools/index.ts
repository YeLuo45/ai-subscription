/**
 * MCP Tools Module
 * Tool registry, discovery, bridge, and usage tracking for MCP integration
 */

// Types
export {
  type MCPTool,
  type ToolCategory,
  type ToolCallRequest,
  type ToolCallResult,
  type ToolUsageStats,
  type BuiltInToolExecutor,
} from './types';

// Registry
export { toolRegistry, MCPToolRegistry } from './registry';

// Discovery
export { TOOL_CATEGORIES, BUILT_IN_TOOLS, searchTools, getBuiltInTools, findByCapability } from './discovery';

// Bridge
export { callTool } from './bridge';

// Usage tracking
export { recordToolUsage, getToolUsageStats, getRecentUsage, getAggregateStats, clearUsageStats } from './usage';

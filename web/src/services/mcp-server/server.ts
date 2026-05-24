/**
 * MCP Server - JSON-RPC 2.0 over stdio Implementation
 * Main server class that handles MCP protocol requests
 */

import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPServerInfo,
  ServerCapabilities,
  InitializeResult,
  MCPToolList,
  MCPToolCallResult,
  ToolHandler,
} from './types';
import { MCP_SERVER_ERROR_CODES } from './types';
import { allToolDefs, allToolHandlers } from './tools';

// Server constants
const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO: MCPServerInfo = {
  name: 'ai-subscription-mcp-server',
  version: '1.0.0',
};

// Server capabilities
const SERVER_CAPABILITIES: ServerCapabilities = {
  tools: { tools: allToolDefs },
};

/**
 * MCPServer class - handles JSON-RPC 2.0 requests over stdio
 */
export class MCPServer {
  private initialized = false;
  private protocolVersion: string | null = null;

  /**
   * Handle incoming JSON-RPC request
   */
  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { id, method, params } = request;

    try {
      // Handle known methods
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id, params);
        
        case 'tools/list':
          return this.handleToolsList(id);
        
        case 'tools/call':
          return this.handleToolsCall(id, params);
        
        case 'initialized':
          // Client sent initialized notification, acknowledge silently
          return this.createResponse(id, { acknowledged: true });
        
        default:
          return this.createError(id, MCP_SERVER_ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${method}`);
      }
    } catch (error) {
      console.error(`[MCP Server] Error handling ${method}:`, error);
      return this.createError(
        id,
        MCP_SERVER_ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal error'
      );
    }
  }

  /**
   * Handle initialize request - MCP handshake
   */
  private handleInitialize(id: string | number, params?: Record<string, unknown>): JSONRPCResponse {
    try {
      const initParams = params as unknown as { protocolVersion?: string; capabilities?: Record<string, unknown>; clientInfo?: { name: string; version: string } };
      
      this.protocolVersion = initParams?.protocolVersion || PROTOCOL_VERSION;
      this.initialized = true;

      const result: InitializeResult = {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: SERVER_CAPABILITIES,
        serverInfo: SERVER_INFO,
      };

      return this.createResponse(id, result);
    } catch (error) {
      return this.createError(
        id,
        MCP_SERVER_ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to initialize'
      );
    }
  }

  /**
   * Handle tools/list request - return available tools
   */
  private handleToolsList(id: string | number): JSONRPCResponse {
    const toolList: MCPToolList = { tools: allToolDefs };
    return this.createResponse(id, toolList);
  }

  /**
   * Handle tools/call request - execute a tool
   */
  private async handleToolsCall(id: string | number, params?: Record<string, unknown>): Promise<JSONRPCResponse> {
    try {
      const callParams = params as unknown as { name: string; arguments?: Record<string, unknown> };
      
      if (!callParams?.name) {
        return this.createError(id, MCP_SERVER_ERROR_CODES.INVALID_PARAMS, 'Tool name is required');
      }

      const handler: ToolHandler | undefined = allToolHandlers[callParams.name];
      
      if (!handler) {
        return this.createError(
          id,
          MCP_SERVER_ERROR_CODES.METHOD_NOT_FOUND,
          `Tool not found: ${callParams.name}`
        );
      }

      // Execute the tool handler
      const args = callParams.arguments || {};
      return this.executeTool(id, callParams.name, handler, args);
    } catch (error) {
      return this.createError(
        id,
        MCP_SERVER_ERROR_CODES.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to execute tool'
      );
    }
  }

  /**
   * Execute a tool handler and format the response
   */
  private async executeTool(
    id: string | number,
    toolName: string,
    handler: ToolHandler,
    args: Record<string, unknown>
  ): Promise<JSONRPCResponse> {
    try {
      const result: MCPToolCallResult = await handler(args);
      
      return this.createResponse(id, result);
    } catch (error) {
      return this.createError(
        id,
        MCP_SERVER_ERROR_CODES.INTERNAL_ERROR,
        `Tool ${toolName} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a success response
   */
  private createResponse(id: string | number, result: unknown): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  /**
   * Create an error response
   */
  private createError(id: string | number, code: number, message: string): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get server info
   */
  getServerInfo(): MCPServerInfo {
    return SERVER_INFO;
  }
}

/**
 * Create a new MCPServer instance
 */
export function createMCPServer(): MCPServer {
  return new MCPServer();
}

/**
 * Run MCP Server in stdio mode
 * Reads JSON-RPC requests from stdin and writes responses to stdout
 */
export async function runMCPServer(): Promise<void> {
  const server = createMCPServer();
  const stdin = process.stdin;
  const stdout = process.stdout;

  let buffer = '';

  stdin.on('data', async (chunk: Buffer) => {
    buffer += chunk.toString();
    
    // Process complete JSON messages (newline-delimited)
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const request = JSON.parse(trimmed) as JSONRPCRequest;
        const response = await server.handleRequest(request);
        stdout.write(JSON.stringify(response) + '\n');
        stdout.write(''); // Flush
      } catch (error) {
        console.error('[MCP Server] Failed to parse request:', error);
      }
    }
  });

  stdin.resume();
}
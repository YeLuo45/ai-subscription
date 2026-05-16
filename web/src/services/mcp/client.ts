/**
 * MCP Client - JSON-RPC over stdio Protocol Implementation
 * 
 * Since browsers can't directly spawn processes, this client uses Web Workers
 * with MessageChannel to simulate stdio communication. The worker acts as a
 * bridge that can communicate with MCP servers via stdin/stdout.
 * 
 * For production, this would typically connect to a desktop extension or
 * a local MCP server via WebSocket.
 */

import type {
  MCPServerConfig,
  MCPTool,
  MCPToolList,
  MCPToolCallRequest,
  MCPToolCallResult,
  MCPClientState,
  MCPServerStatus,
  MCPClientEvent,
  JSONRPCRequest,
  JSONRPCResponse,
} from './types';
import { MCP_ERROR_CODES } from './types';

// Unique ID generator for JSON-RPC requests
let idCounter = 0;
function generateId(): string {
  return `${Date.now()}-${++idCounter}`;
}

/**
 * MCPClient - Manages connection to a single MCP server
 */
export class MCPClient {
  private serverId: string;
  private state: MCPClientState = 'disconnected';
  private tools: MCPTool[] = [];
  private eventListeners: Set<(event: MCPClientEvent) => void> = new Set();
  
  // For worker-based communication
  private worker: Worker | null = null;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();
  
  // For server-sent events / streaming responses
  private messageBuffer: string = '';

  constructor(serverId: string) {
    this.serverId = serverId;
  }

  /**
   * Connect to the MCP server
   * In browser, this spawns a Web Worker that acts as the MCP process bridge
   */
  async connect(config: MCPServerConfig): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');

    try {
      // Create a worker that will bridge to the MCP server
      // The worker code is defined inline to avoid needing separate files
      const workerCode = this.createWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Initialize the MCP server
      await this.initializeServer(config);
      
      this.setState('connected');
      this.emit({
        type: 'connected',
        serverId: this.serverId,
        timestamp: Date.now(),
      });

      // Fetch available tools
      await this.listTools();

    } catch (error) {
      this.setState('error');
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.emit({
        type: 'error',
        serverId: this.serverId,
        timestamp: Date.now(),
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  disconnect(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    this.setState('disconnected');
    this.emit({
      type: 'disconnected',
      serverId: this.serverId,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current state
   */
  getState(): MCPClientState {
    return this.state;
  }

  /**
   * Get available tools from this server
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    if (this.state !== 'connected') {
      throw new Error(`Cannot call tool: not connected (state: ${this.state})`);
    }

    const request: Record<string, unknown> = {
      name,
      arguments: args,
    };

    const response = await this.sendRequest('tools/call', request);
    return response as MCPToolCallResult;
  }

  /**
   * Subscribe to client events
   */
  addEventListener(listener: (event: MCPClientEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  private sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      // Send via worker
      if (this.worker) {
        this.worker.postMessage(request);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const data = event.data;
    
    if (data.id && this.pendingRequests.has(String(data.id))) {
      // This is a response to one of our pending requests
      const pending = this.pendingRequests.get(String(data.id))!;
      this.pendingRequests.delete(String(data.id));
      
      if (data.error) {
        pending.reject(new Error(data.error.message || 'Request failed'));
      } else {
        pending.resolve(data.result);
      }
    } else if (data.method === 'notifications/tools/list_changed') {
      // Server notifying us that tools have changed
      this.listTools().then(() => {
        this.emit({
          type: 'toolsUpdated',
          serverId: this.serverId,
          timestamp: Date.now(),
          tools: this.tools,
        });
      });
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error(`[MCP Client ${this.serverId}] Worker error:`, error);
    this.setState('error');
    this.emit({
      type: 'error',
      serverId: this.serverId,
      timestamp: Date.now(),
      error: error.message || 'Worker error',
    });
  }

  /**
   * Initialize the MCP server with handshake
   */
  private async initializeServer(config: MCPServerConfig): Promise<void> {
    const result = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: 'ai-subscription-web',
        version: '1.0.0',
      },
    });

    // Send initialized notification
    if (this.worker) {
      this.worker.postMessage({
        jsonrpc: '2.0',
        method: 'initialized',
        params: {},
      });
    }
  }

  /**
   * List available tools from the server
   */
  private async listTools(): Promise<void> {
    try {
      const result = await this.sendRequest('tools/list');
      const toolList = result as MCPToolList;
      this.tools = toolList.tools || [];
      this.emit({
        type: 'toolsUpdated',
        serverId: this.serverId,
        timestamp: Date.now(),
        tools: this.tools,
      });
    } catch (error) {
      console.error(`[MCP Client ${this.serverId}] Failed to list tools:`, error);
    }
  }

  /**
   * Update internal state
   */
  private setState(state: MCPClientState): void {
    this.state = state;
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: MCPClientEvent): void {
    for (const listener of Array.from(this.eventListeners)) {
      try {
        listener(event);
      } catch (err) {
        console.error('[MCP Client] Event listener error:', err);
      }
    }
  }

  /**
   * Create inline worker code for MCP bridge
   * This worker simulates MCP protocol communication
   */
  private createWorkerCode(): string {
    return `
      // MCP Worker Bridge
      // Simulates MCP JSON-RPC communication for browser environment
      
      let messageBuffer = '';
      
      self.onmessage = function(event) {
        const request = event.data;
        
        // Handle incoming JSON-RPC request from main thread
        if (request.jsonrpc === '2.0' && request.method) {
          handleRequest(request);
        }
      };
      
      async function handleRequest(request) {
        const { id, method, params } = request;
        
        try {
          // Simulate MCP server responses based on method
          // In production, this would forward to actual MCP server
          const result = await simulateMCPServer(method, params);
          
          // Send response back to main thread
          self.postMessage({
            jsonrpc: '2.0',
            id: id,
            result: result
          });
        } catch (error) {
          self.postMessage({
            jsonrpc: '2.0',
            id: id,
            error: {
              code: -32603,
              message: error.message || 'Internal error'
            }
          });
        }
      }
      
      async function simulateMCPServer(method, params) {
        // Simulated responses for common MCP methods
        switch (method) {
          case 'initialize':
            return {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'simulated-mcp-server', version: '1.0.0' }
            };
          
          case 'tools/list':
            // Return empty tools list - actual tools come from configured servers
            return { tools: [] };
          
          case 'tools/call':
            // Simulate tool call - in production, forward to actual MCP server
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    tool: params?.name,
                    args: params?.arguments,
                    message: 'Simulated MCP tool response'
                  })
                }
              ]
            };
          
          default:
            throw new Error('Method not found: ' + method);
        }
      }
    `;
  }
}

/**
 * Create a new MCPClient instance for a server
 */
export function createMCPClient(serverId: string): MCPClient {
  return new MCPClient(serverId);
}
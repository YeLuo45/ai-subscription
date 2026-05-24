/**
 * HTTP Transport for MCP Client
 * JSON-RPC 2.0 over HTTP using native fetch API
 * 
 * Supports connection to HTTP-based MCP servers (not stdio)
 */

import type {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
} from './types';
import { MCP_ERROR_CODES } from './types';

// Unique ID generator for JSON-RPC requests
let idCounter = 0;
function generateId(): string {
  return `${Date.now()}-${++idCounter}`;
}

/**
 * HTTP Transport configuration
 */
export interface HTTPTransportConfig {
  url: string;                    // MCP server HTTP endpoint
  authToken?: string;              // Bearer token or API key
  timeout?: number;                // Request timeout in ms (default: 30000)
  headers?: Record<string, string>; // Additional HTTP headers
}

/**
 * HTTP Transport error
 */
export class HTTPTransportError extends Error {
  code: number;
  
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'HTTPTransportError';
  }
}

/**
 * HTTP Transport for MCP JSON-RPC communication
 * Uses native fetch API - no external dependencies
 */
export class HTTPTransport {
  private config: HTTPTransportConfig;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(config: HTTPTransportConfig) {
    this.config = {
      url: config.url,
      authToken: config.authToken,
      timeout: config.timeout ?? 30000,
      headers: config.headers ?? {},
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<HTTPTransportConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): HTTPTransportConfig {
    return { ...this.config };
  }

  /**
   * Send a JSON-RPC request via HTTP POST
   */
  async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      this.executeRequest(request).then((response) => {
        this.pendingRequests.delete(id);
        if (response.error) {
          reject(new Error(response.error.message || 'Request failed'));
        } else {
          resolve(response.result);
        }
      }).catch((error) => {
        this.pendingRequests.delete(id);
        reject(error);
      });

      // Timeout for this specific request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new HTTPTransportError(
            MCP_ERROR_CODES.TIMEOUT,
            `Request ${method} timed out after ${this.config.timeout}ms`
          ));
        }
      }, this.config.timeout);
    });
  }

  /**
   * Execute HTTP request to MCP server
   */
  private async executeRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.config.headers,
    };

    // Add auth header if configured
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HTTPTransportError(
          MCP_ERROR_CODES.CONNECTION_FAILED,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json() as JSONRPCResponse;
      return data;

    } catch (error) {
      if (error instanceof HTTPTransportError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new HTTPTransportError(
            MCP_ERROR_CODES.TIMEOUT,
            `Request timed out after ${this.config.timeout}ms`
          );
        }
        throw new HTTPTransportError(
          MCP_ERROR_CODES.CONNECTION_FAILED,
          `Connection failed: ${error.message}`
        );
      }
      
      throw new HTTPTransportError(
        MCP_ERROR_CODES.INTERNAL_ERROR,
        'Unknown error occurred'
      );
    }
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Short timeout for notifications

      await fetch(this.config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(notification),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (error) {
      // Notifications don't expect responses, so we just log errors
      console.warn('[HTTPTransport] Notification failed:', error);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new HTTPTransportError(
        MCP_ERROR_CODES.INTERNAL_ERROR,
        'Transport closed'
      ));
    }
    this.pendingRequests.clear();
  }
}

/**
 * Create a new HTTPTransport instance
 */
export function createHTTPTransport(config: HTTPTransportConfig): HTTPTransport {
  return new HTTPTransport(config);
}

/**
 * Parse MCP server URL to detect if it's HTTP-based
 * Returns true for http:// or https:// URLs
 */
export function isHTTPURL(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Parse MCP server URL and extract configuration
 */
export function parseServerURL(url: string): {
  isHTTP: boolean;
  url: string;
  authToken?: string;
} {
  // Check for URL with embedded token: https://user:token@server.com
  const urlWithAuthRegex = /^https?:\/\/([^:]+):([^@]+)@/;
  const match = url.match(urlWithAuthRegex);
  
  if (match) {
    return {
      isHTTP: true,
      url: url.replace(urlWithAuthRegex, 'https://'),
      authToken: `${match[1]}:${match[2]}`,
    };
  }
  
  return {
    isHTTP: isHTTPURL(url),
    url,
  };
}
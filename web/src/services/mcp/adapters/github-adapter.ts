/**
 * GitHub MCP Adapter
 * 
 * Provides GitHub-specific MCP tool integration using HTTP transport.
 * Supports:
 * - search_repositories: Search GitHub repositories
 * - get_repository_info: Get repository metadata
 */

import { HTTPTransport, createHTTPTransport, parseServerURL, type HTTPTransportConfig } from '../http-transport';
import type { MCPTool, MCPToolCallResult } from '../types';

// Adapter interface for MCP servers
export interface MCPServerAdapter {
  readonly serverId: string;
  readonly serverName: string;
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getTools(): MCPTool[];
  callTool(name: string, args: Record<string, unknown>): Promise<MCPToolCallResult>;
  search_repositories(query: string, limit?: number): Promise<GitHubSearchResult[]>;
  get_repository_info(owner: string, repo: string): Promise<GitHubRepoInfo | null>;
}

export interface GitHubSearchResult {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  created_at: string;
  pushed_at: string;
}

export interface GitHubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  license: {
    name: string;
  } | null;
  homepage: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  latest_commit?: string;
}

/**
 * GitHub MCP Adapter configuration
 */
export interface GitHubAdapterConfig {
  serverId?: string;
  serverName?: string;
  url: string;
  authToken?: string;
  timeout?: number;
}

/**
 * Default GitHub MCP Server URL
 * This is the endpoint for GitHub MCP server (https://github.com/modelcontextprotocol/servers)
 */
export const DEFAULT_GITHUB_MCP_URL = 'https://mcp.github.com/jsonrpc';

/**
 * Create a GitHub MCP Adapter instance
 */
export function createGitHubAdapter(config: GitHubAdapterConfig): MCPServerAdapter {
  return new GitHubAdapter(config);
}

/**
 * GitHub MCP Adapter implementation
 */
class GitHubAdapter implements MCPServerAdapter {
  readonly serverId: string;
  readonly serverName: string;
  
  private transport: HTTPTransport | null = null;
  private connected = false;
  private tools: MCPTool[] = [];

  constructor(config: GitHubAdapterConfig) {
    this.serverId = config.serverId ?? 'github';
    this.serverName = config.serverName ?? 'GitHub MCP';
  }

  /**
   * Connect to the GitHub MCP server
   */
  async connect(): Promise<void> {
    if (this.connected && this.transport) {
      return;
    }

    const transportConfig: HTTPTransportConfig = {
      url: DEFAULT_GITHUB_MCP_URL,
      timeout: 30000,
    };

    // If custom URL is provided, use it
    if (DEFAULT_GITHUB_MCP_URL !== this.transport?.getConfig().url) {
      const parsed = parseServerURL(DEFAULT_GITHUB_MCP_URL);
      transportConfig.url = parsed.url;
      transportConfig.authToken = parsed.authToken ?? this.transport?.getConfig().authToken;
    }

    // Apply provided auth token
    if (this.transport?.getConfig().authToken) {
      transportConfig.authToken = this.transport.getConfig().authToken;
    }

    this.transport = createHTTPTransport(transportConfig);
    
    // Initialize with the MCP server
    await this.transport.sendRequest('initialize', {
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
    await this.transport.sendNotification('initialized', {});

    // List available tools
    await this.listTools();
    
    this.connected = true;
  }

  /**
   * Disconnect from the GitHub MCP server
   */
  disconnect(): void {
    if (this.transport) {
      this.transport.cancelAll();
      this.transport = null;
    }
    this.connected = false;
    this.tools = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Call a tool on the GitHub MCP server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    if (!this.connected || !this.transport) {
      throw new Error('Not connected to GitHub MCP server');
    }

    try {
      const result = await this.transport.sendRequest('tools/call', {
        name,
        arguments: args,
      });
      return result as MCPToolCallResult;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: String(error) }),
        }],
        isError: true,
      };
    }
  }

  /**
   * Search GitHub repositories
   */
  async search_repositories(query: string, limit = 5): Promise<GitHubSearchResult[]> {
    const result = await this.callTool('search_repositories', {
      query,
      limit,
    });

    if (result.isError) {
      console.error('[GitHubAdapter] search_repositories error:', result);
      return [];
    }

    try {
      const content = result.content?.[0]?.text;
      if (!content) return [];
      
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      return data.items || [];
    } catch (error) {
      console.error('[GitHubAdapter] Failed to parse search results:', error);
      return [];
    }
  }

  /**
   * Get repository information
   */
  async get_repository_info(owner: string, repo: string): Promise<GitHubRepoInfo | null> {
    const url = `https://github.com/${owner}/${repo}`;
    const result = await this.callTool('get_repo', { url });

    if (result.isError) {
      console.error('[GitHubAdapter] get_repository_info error:', result);
      return null;
    }

    try {
      const content = result.content?.[0]?.text;
      if (!content) return null;
      
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      return data;
    } catch (error) {
      console.error('[GitHubAdapter] Failed to parse repo info:', error);
      return null;
    }
  }

  /**
   * List available tools from the server
   */
  private async listTools(): Promise<void> {
    if (!this.transport) return;

    try {
      const result = await this.transport.sendRequest('tools/list');
      const toolList = result as { tools: MCPTool[] };
      this.tools = toolList.tools || [];
    } catch (error) {
      console.warn('[GitHubAdapter] Failed to list tools:', error);
      // Provide default GitHub tools even if server doesn't respond
      this.tools = DEFAULT_GITHUB_TOOLS;
    }
  }
}

/**
 * Default GitHub tools if server doesn't provide a list
 */
const DEFAULT_GITHUB_TOOLS: MCPTool[] = [
  {
    name: 'search_repositories',
    description: 'Search GitHub repositories by query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Maximum results (default: 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_repo',
    description: 'Get repository information by URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Repository URL (e.g., https://github.com/owner/repo)' },
      },
      required: ['url'],
    },
  },
];
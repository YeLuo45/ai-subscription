/**
 * MCPServerRegistry - Singleton registry for managing MCP server configurations
 * and client instances. Handles persistence to localStorage and connection lifecycle.
 */

import type {
  MCPServerConfig,
  MCPClientConfig,
  MCPClientEvent,
  MCPServerStatus,
  MCPClientState,
  MCPTool,
} from './types';
import { MCPClient, createMCPClient } from './client';
import { MCP_STORAGE_KEY, DEFAULT_MCP_CONFIG } from './types';

// LocalStorage helper functions
function loadConfig(): MCPClientConfig {
  try {
    const stored = localStorage.getItem(MCP_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[MCP Registry] Failed to load config:', error);
  }
  return DEFAULT_MCP_CONFIG;
}

function saveConfig(config: MCPClientConfig): void {
  try {
    localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('[MCP Registry] Failed to save config:', error);
  }
}

// Event types for registry changes
export interface MCPRegistryEvent {
  type: 'serverAdded' | 'serverUpdated' | 'serverRemoved' | 'serverConnected' | 'serverDisconnected' | 'serverError';
  serverId: string;
  timestamp: number;
  config?: MCPServerConfig;
  tools?: MCPTool[];
  error?: string;
}

type RegistryEventListener = (event: MCPRegistryEvent) => void;

/**
 * MCPServerRegistry - Manages all MCP server configurations and client instances
 */
class MCPServerRegistry {
  private static instance: MCPServerRegistry | null = null;

  // In-memory state
  private config: MCPClientConfig;
  private clients: Map<string, MCPClient> = new Map();
  private serverStatuses: Map<string, MCPServerStatus> = new Map();
  private eventListeners: Set<RegistryEventListener> = new Set();
  private initialized = false;

  private constructor() {
    this.config = loadConfig();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MCPServerRegistry {
    if (!MCPServerRegistry.instance) {
      MCPServerRegistry.instance = new MCPServerRegistry();
    }
    return MCPServerRegistry.instance;
  }

  /**
   * Initialize the registry and auto-connect to enabled servers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Set up statuses for all configured servers
    for (const server of this.config.servers) {
      this.serverStatuses.set(server.id, {
        serverId: server.id,
        state: 'disconnected',
        availableTools: [],
      });
    }

    // Auto-connect to enabled servers if configured
    if (this.config.autoConnect) {
      await this.connectAllEnabled();
    }

    this.initialized = true;
  }

  /**
   * Get all server configurations
   */
  getServers(): MCPServerConfig[] {
    return [...this.config.servers];
  }

  /**
   * Get a specific server configuration
   */
  getServer(serverId: string): MCPServerConfig | undefined {
    return this.config.servers.find(s => s.id === serverId);
  }

  /**
   * Add a new MCP server configuration
   */
  async addServer(config: Omit<MCPServerConfig, 'id'>): Promise<MCPServerConfig> {
    const id = `server-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newServer: MCPServerConfig = {
      ...config,
      id,
    };

    this.config.servers.push(newServer);
    saveConfig(this.config);

    this.serverStatuses.set(id, {
      serverId: id,
      state: 'disconnected',
      availableTools: [],
    });

    this.emit({
      type: 'serverAdded',
      serverId: id,
      timestamp: Date.now(),
      config: newServer,
    });

    return newServer;
  }

  /**
   * Update an existing server configuration
   */
  async updateServer(serverId: string, updates: Partial<MCPServerConfig>): Promise<MCPServerConfig | null> {
    const index = this.config.servers.findIndex(s => s.id === serverId);
    if (index === -1) return null;

    const oldConfig = this.config.servers[index];
    const updatedServer = {
      ...oldConfig,
      ...updates,
      id: serverId, // Preserve original ID
    };

    this.config.servers[index] = updatedServer;
    saveConfig(this.config);

    this.emit({
      type: 'serverUpdated',
      serverId,
      timestamp: Date.now(),
      config: updatedServer,
    });

    return updatedServer;
  }

  /**
   * Remove a server configuration
   */
  async removeServer(serverId: string): Promise<boolean> {
    const index = this.config.servers.findIndex(s => s.id === serverId);
    if (index === -1) return false;

    // Disconnect if connected
    await this.disconnectServer(serverId);

    this.config.servers.splice(index, 1);
    saveConfig(this.config);

    this.serverStatuses.delete(serverId);
    this.clients.delete(serverId);

    this.emit({
      type: 'serverRemoved',
      serverId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Enable or disable a server
   */
  async setServerEnabled(serverId: string, enabled: boolean): Promise<boolean> {
    const server = this.getServer(serverId);
    if (!server) return false;

    if (enabled && !server.enabled) {
      // Was disabled, now enabling - connect
      server.enabled = true;
      await this.updateServer(serverId, { enabled: true });
      await this.connectServer(serverId);
    } else if (!enabled && server.enabled) {
      // Was enabled, now disabling - disconnect
      server.enabled = false;
      await this.updateServer(serverId, { enabled: false });
      await this.disconnectServer(serverId);
    }

    return true;
  }

  /**
   * Connect to a specific server
   */
  async connectServer(serverId: string): Promise<void> {
    const server = this.getServer(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Create client if not exists
    if (!this.clients.has(serverId)) {
      const client = createMCPClient(serverId);
      this.clients.set(serverId, client);
      
      // Forward client events to registry listeners
      client.addEventListener((event) => {
        this.handleClientEvent(serverId, event);
      });
    }

    const client = this.clients.get(serverId)!;
    
    try {
      await client.connect(server);
      
      // Update status
      this.updateServerStatus(serverId, 'connected');

    } catch (error) {
      this.updateServerStatus(serverId, 'error', 
        error instanceof Error ? error.message : 'Connection failed'
      );
      throw error;
    }
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      client.disconnect();
      this.updateServerStatus(serverId, 'disconnected');
    }
  }

  /**
   * Connect to all enabled servers
   */
  async connectAllEnabled(): Promise<void> {
    const promises = this.config.servers
      .filter(s => s.enabled)
      .map(s => this.connectServer(s.id).catch(err => {
        console.error(`[MCP Registry] Auto-connect failed for ${s.id}:`, err);
      }));
    
    await Promise.allSettled(promises);
  }

  /**
   * Get the status of a specific server
   */
  getServerStatus(serverId: string): MCPServerStatus | undefined {
    return this.serverStatuses.get(serverId);
  }

  /**
   * Get statuses of all servers
   */
  getAllServerStatuses(): MCPServerStatus[] {
    return Array.from(this.serverStatuses.values());
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): Array<{ serverId: string; serverName: string; tool: MCPTool }> {
    const tools: Array<{ serverId: string; serverName: string; tool: MCPTool }> = [];

    for (const server of this.config.servers) {
      const status = this.serverStatuses.get(server.id);
      if (status && status.state === 'connected') {
        for (const tool of status.availableTools) {
          tools.push({
            serverId: server.id,
            serverName: server.name,
            tool,
          });
        }
      }
    }

    return tools;
  }

  /**
   * Call a tool from a specific server
   */
  async callTool(serverId: string, toolName: string, args: Record<string, unknown>) {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No client for server ${serverId}`);
    }
    return client.callTool(toolName, args);
  }

  /**
   * Test connection to a server (connect, list tools, disconnect)
   */
  async testConnection(serverId: string): Promise<MCPTool[]> {
    const server = this.getServer(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Create a temporary client for testing
    const testClient = createMCPClient(serverId);
    
    const cleanup = () => {
      testClient.disconnect();
    };

    try {
      await testClient.connect(server);
      const tools = testClient.getTools();
      return tools;
    } finally {
      cleanup();
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: RegistryEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Handle events from individual clients
   */
  private handleClientEvent(serverId: string, event: MCPClientEvent): void {
    switch (event.type) {
      case 'connected':
        this.updateServerStatus(serverId, 'connected');
        this.emit({
          type: 'serverConnected',
          serverId,
          timestamp: Date.now(),
        });
        break;
      
      case 'disconnected':
        this.updateServerStatus(serverId, 'disconnected');
        this.emit({
          type: 'serverDisconnected',
          serverId,
          timestamp: Date.now(),
        });
        break;
      
      case 'error':
        this.updateServerStatus(serverId, 'error', event.error);
        this.emit({
          type: 'serverError',
          serverId,
          timestamp: Date.now(),
          error: event.error,
        });
        break;
      
      case 'toolsUpdated':
        if (event.tools) {
          const status = this.serverStatuses.get(serverId);
          if (status) {
            status.availableTools = event.tools;
          }
        }
        break;
    }
  }

  /**
   * Update server status
   */
  private updateServerStatus(serverId: string, state: MCPClientState, error?: string): void {
    const existing = this.serverStatuses.get(serverId);
    if (existing) {
      existing.state = state;
      if (error) {
        existing.error = error;
      }
    } else {
      this.serverStatuses.set(serverId, {
        serverId,
        state,
        error,
        availableTools: [],
      });
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: MCPRegistryEvent): void {
    for (const listener of Array.from(this.eventListeners)) {
      try {
        listener(event);
      } catch (err) {
        console.error('[MCP Registry] Event listener error:', err);
      }
    }
  }
}

// Export singleton accessor
export function getMCPServerRegistry(): MCPServerRegistry {
  return MCPServerRegistry.getInstance();
}

// Re-export types from types.ts
export type {
  MCPServerConfig,
  MCPServerStatus,
  MCPTool,
  MCPClientConfig,
  MCPClientState,
  MCPClientEvent,
  ToolCallRequest,
  ToolCallResult,
} from './types';
export { MCPClient } from './client';
/**
 * MCP stdio Communication Module
 * 
 * Handles MCP JSON-RPC communication over stdio with Authorization header injection.
 * For browser environment, uses Web Workers to simulate the stdio bridge.
 */

import type { MCPServerConfig } from './types';

/**
 * Prepare environment variables for MCP server process
 * Injects Authorization header if authToken is configured
 */
export function prepareServerEnv(server: MCPServerConfig): Record<string, string> {
  const env: Record<string, string> = { ...server.env };
  
  // Inject Authorization header if authToken is configured
  if (server.authToken) {
    // Support Bearer token format
    const token = server.authToken.startsWith('Bearer ') 
      ? server.authToken 
      : `Bearer ${server.authToken}`;
    
    // Set common HTTP auth environment variables
    // These are commonly used by MCP servers
    env['MCP_AUTH_TOKEN'] = server.authToken;
    env['MCP_AUTHORIZATION'] = token;
    env['AUTH_TOKEN'] = server.authToken;
    env['AUTHORIZATION'] = token;
  }
  
  return env;
}

/**
 * Create headers for MCP HTTP connection (if using HTTP transport)
 * Includes Authorization header from server config
 */
export function createMCPHeaders(server: MCPServerConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (server.authToken) {
    const token = server.authToken.startsWith('Bearer ') 
      ? server.authToken 
      : `Bearer ${server.authToken}`;
    headers['Authorization'] = token;
  }
  
  return headers;
}

/**
 * Replace placeholders in config values with actual values
 * Supports ${VAR_NAME} placeholder format
 */
export function resolveConfigPlaceholders(
  config: string | undefined,
  env: Record<string, string>
): string {
  if (!config) return '';
  
  return config.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return env[varName] || match;
  });
}

/**
 * Build command arguments with resolved placeholders
 */
export function buildCommandArgs(
  command: string,
  args: string[],
  env: Record<string, string>
): { command: string; args: string[] } {
  // Resolve placeholders in command
  const resolvedCommand = resolveConfigPlaceholders(command, env);
  
  // Resolve placeholders in each argument
  const resolvedArgs = args.map(arg => resolveConfigPlaceholders(arg, env));
  
  return {
    command: resolvedCommand,
    args: resolvedArgs,
  };
}

/**
 * Connection timeout in milliseconds
 */
export const MCP_CONNECTION_TIMEOUT = 5000;

/**
 * Check if we should use auth based on server config
 */
export function shouldUseAuth(server: MCPServerConfig): boolean {
  return Boolean(server.authToken && server.authToken.length > 0);
}
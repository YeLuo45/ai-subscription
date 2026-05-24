/**
 * HTTP Transport Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HTTPTransport, createHTTPTransport, isHTTPURL, parseServerURL, HTTPTransportError } from './http-transport';
import { MCP_ERROR_CODES } from './types';

describe('HTTPTransport', () => {
  let transport: HTTPTransport;

  describe('createHTTPTransport', () => {
    it('should create transport with valid config', () => {
      const transport = createHTTPTransport({
        url: 'https://example.com/mcp',
        timeout: 5000,
      });
      expect(transport).toBeDefined();
      const config = transport.getConfig();
      expect(config.url).toBe('https://example.com/mcp');
      expect(config.timeout).toBe(5000);
    });

    it('should use default timeout if not specified', () => {
      const transport = createHTTPTransport({
        url: 'https://example.com/mcp',
      });
      const config = transport.getConfig();
      expect(config.timeout).toBe(30000);
    });

    it('should store auth token in config', () => {
      const transport = createHTTPTransport({
        url: 'https://example.com/mcp',
        authToken: 'my-secret-token',
      });
      const config = transport.getConfig();
      expect(config.authToken).toBe('my-secret-token');
    });
  });

  describe('updateConfig', () => {
    it('should update URL', () => {
      const transport = createHTTPTransport({
        url: 'https://example.com/mcp',
      });
      transport.updateConfig({ url: 'https://other.com/api' });
      expect(transport.getConfig().url).toBe('https://other.com/api');
    });

    it('should update timeout', () => {
      const transport = createHTTPTransport({
        url: 'https://example.com/mcp',
        timeout: 5000,
      });
      transport.updateConfig({ timeout: 10000 });
      expect(transport.getConfig().timeout).toBe(10000);
    });

    it('should update auth token', () => {
      const transport = createHTTPTransport({
        url: 'https://example.com/mcp',
      });
      transport.updateConfig({ authToken: 'new-token' });
      expect(transport.getConfig().authToken).toBe('new-token');
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const transport = createHTTPTransport({
        url: 'https://example.com/mcp',
      });
      const config1 = transport.getConfig();
      const config2 = transport.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1.url).toBe(config2.url);
    });
  });

  describe('cancelAll', () => {
    it('should clear pending requests without error', () => {
      const transport = createHTTPTransport({
        url: 'https://example.com/mcp',
      });
      // Should not throw
      transport.cancelAll();
    });
  });
});

describe('isHTTPURL', () => {
  it('should return true for http:// URLs', () => {
    expect(isHTTPURL('http://example.com')).toBe(true);
  });

  it('should return true for https:// URLs', () => {
    expect(isHTTPURL('https://example.com')).toBe(true);
  });

  it('should return false for non-http URLs', () => {
    expect(isHTTPURL('npx @some/server')).toBe(false);
    expect(isHTTPURL('/path/to/server')).toBe(false);
    expect(isHTTPURL('file:///path')).toBe(false);
  });
});

describe('parseServerURL', () => {
  it('should parse simple HTTP URL', () => {
    const result = parseServerURL('https://example.com/mcp');
    expect(result.isHTTP).toBe(true);
    expect(result.url).toBe('https://example.com/mcp');
    expect(result.authToken).toBeUndefined();
  });

  it('should parse HTTP URL with embedded credentials', () => {
    const result = parseServerURL('https://user:token@example.com/mcp');
    expect(result.isHTTP).toBe(true);
    expect(result.url).toBe('https://example.com/mcp');
    expect(result.authToken).toBe('user:token');
  });

  it('should identify non-HTTP URLs', () => {
    const result = parseServerURL('npx @anthropic/mcp-server-github');
    expect(result.isHTTP).toBe(false);
    expect(result.url).toBe('npx @anthropic/mcp-server-github');
  });
});

describe('HTTPTransportError', () => {
  it('should create error with code and message', () => {
    const error = new HTTPTransportError(MCP_ERROR_CODES.CONNECTION_FAILED, 'Connection failed');
    expect(error.code).toBe(MCP_ERROR_CODES.CONNECTION_FAILED);
    expect(error.message).toBe('Connection failed');
    expect(error.name).toBe('HTTPTransportError');
  });

  it('should extend Error', () => {
    const error = new HTTPTransportError(MCP_ERROR_CODES.TIMEOUT, 'Request timed out');
    expect(error instanceof Error).toBe(true);
  });
});
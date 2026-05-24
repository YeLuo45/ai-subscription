/**
 * GitHub MCP Adapter Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGitHubAdapter, DEFAULT_GITHUB_MCP_URL, type GitHubSearchResult, type GitHubRepoInfo } from './github-adapter';

// Mock the HTTP transport
vi.mock('../../http-transport', () => ({
  createHTTPTransport: vi.fn(() => ({
    sendRequest: vi.fn(),
    sendNotification: vi.fn(),
    getConfig: vi.fn(() => ({ url: DEFAULT_GITHUB_MCP_URL, timeout: 30000 })),
    cancelAll: vi.fn(),
  })),
  parseServerURL: vi.fn((url) => ({ isHTTP: url.startsWith('http'), url })),
}));

describe('GitHubAdapter', () => {
  describe('createGitHubAdapter', () => {
    it('should create adapter with default config', () => {
      const adapter = createGitHubAdapter({ url: DEFAULT_GITHUB_MCP_URL });
      expect(adapter).toBeDefined();
      expect(adapter.serverId).toBe('github');
      expect(adapter.serverName).toBe('GitHub MCP');
    });

    it('should create adapter with custom serverId', () => {
      const adapter = createGitHubAdapter({ 
        url: DEFAULT_GITHUB_MCP_URL,
        serverId: 'custom-server',
      });
      expect(adapter.serverId).toBe('custom-server');
    });

    it('should create adapter with custom serverName', () => {
      const adapter = createGitHubAdapter({ 
        url: DEFAULT_GITHUB_MCP_URL,
        serverName: 'Custom GitHub',
      });
      expect(adapter.serverName).toBe('Custom GitHub');
    });

    it('should start disconnected', () => {
      const adapter = createGitHubAdapter({ url: DEFAULT_GITHUB_MCP_URL });
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('getTools', () => {
    it('should return empty array when not connected', () => {
      const adapter = createGitHubAdapter({ url: DEFAULT_GITHUB_MCP_URL });
      const tools = adapter.getTools();
      // Tools are only populated after connect()
      expect(tools).toEqual([]);
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect when not connected', () => {
      const adapter = createGitHubAdapter({ url: DEFAULT_GITHUB_MCP_URL });
      // Should not throw
      adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });
});

describe('DEFAULT_GITHUB_MCP_URL', () => {
  it('should be a valid HTTPS URL', () => {
    expect(DEFAULT_GITHUB_MCP_URL.startsWith('https://')).toBe(true);
  });
});

describe('GitHub types', () => {
  it('should have correct GitHubSearchResult shape', () => {
    const result: GitHubSearchResult = {
      id: 123,
      name: 'test-repo',
      full_name: 'owner/test-repo',
      description: 'A test repository',
      html_url: 'https://github.com/owner/test-repo',
      stargazers_count: 100,
      forks_count: 10,
      language: 'TypeScript',
      topics: ['ai', 'machine-learning'],
      updated_at: '2024-01-01T00:00:00Z',
      created_at: '2023-01-01T00:00:00Z',
      pushed_at: '2024-01-15T00:00:00Z',
    };
    expect(result.name).toBe('test-repo');
    expect(result.full_name).toBe('owner/test-repo');
    expect(result.stargazers_count).toBe(100);
  });

  it('should have correct GitHubRepoInfo shape', () => {
    const info: GitHubRepoInfo = {
      id: 123,
      name: 'test-repo',
      full_name: 'owner/test-repo',
      description: 'A test repository',
      html_url: 'https://github.com/owner/test-repo',
      stargazers_count: 100,
      forks_count: 10,
      watchers_count: 50,
      open_issues_count: 5,
      language: 'TypeScript',
      topics: ['ai'],
      license: { name: 'MIT' },
      homepage: 'https://example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      pushed_at: '2024-01-15T00:00:00Z',
    };
    expect(info.full_name).toBe('owner/test-repo');
    expect(info.license?.name).toBe('MIT');
  });
});
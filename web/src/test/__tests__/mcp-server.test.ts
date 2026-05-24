/**
 * MCP Server Tests
 * Unit tests for MCP Server functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { JSONRPCRequest, JSONRPCResponse } from '../../services/mcp-server/types';

// Mock the storage module
vi.mock('../../services/storage', () => ({
  getSubscriptions: vi.fn(),
  saveSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  getArticles: vi.fn(),
  saveSummary: vi.fn(),
}));

// Mock the MCP Server
import { MCPServer, createMCPServer, allToolDefs, allToolHandlers } from '../../services/mcp-server';
import { getSubscriptions, saveSubscription, deleteSubscription, getArticles, saveSummary } from '../../services/storage';

describe('MCP Server', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = createMCPServer();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create server instance', () => {
      expect(server).toBeDefined();
      expect(server.isInitialized()).toBe(false);
    });

    it('should handle initialize request', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('1');
      expect(response.result).toBeDefined();
      expect((response.result as any).protocolVersion).toBe('2024-11-05');
      expect((response.result as any).serverInfo.name).toBe('ai-subscription-mcp-server');
      expect(server.isInitialized()).toBe(true);
    });

    it('should handle initialized notification', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '2',
        method: 'initialized',
        params: {},
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('2');
      expect(response.result).toEqual({ acknowledged: true });
    });
  });

  describe('Tools List', () => {
    it('should return all 6 tools', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '3',
        method: 'tools/list',
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      const result = response.result as { tools: any[] };
      expect(result.tools).toHaveLength(6);
      
      const toolNames = result.tools.map(t => t.name);
      expect(toolNames).toContain('list_subscriptions');
      expect(toolNames).toContain('add_subscription');
      expect(toolNames).toContain('remove_subscription');
      expect(toolNames).toContain('fetch_articles');
      expect(toolNames).toContain('search_articles');
      expect(toolNames).toContain('summarize_article');
    });
  });

  describe('list_subscriptions', () => {
    it('should list all subscriptions', async () => {
      const mockSubscriptions = [
        { id: '1', name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss' as const, category: 'Tech', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60, createdAt: '2024-01-01', updatedAt: '2024-01-01', useCustomInterval: false },
        { id: '2', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', type: 'rss' as const, category: 'Tech', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60, createdAt: '2024-01-01', updatedAt: '2024-01-01', useCustomInterval: false },
      ];
      
      (getSubscriptions as any).mockResolvedValue(mockSubscriptions);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '4',
        method: 'tools/call',
        params: {
          name: 'list_subscriptions',
          arguments: {},
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('4');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.subscriptions).toHaveLength(2);
      expect(parsed.total).toBe(2);
    });
  });

  describe('add_subscription', () => {
    it('should add a new subscription', async () => {
      const mockSubscription = {
        id: 'new-1',
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        type: 'rss' as const,
        category: 'General',
        enabled: true,
        aiSummaryEnabled: true,
        fetchIntervalMinutes: 60,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        useCustomInterval: false,
      };
      
      (saveSubscription as any).mockResolvedValue(mockSubscription);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '5',
        method: 'tools/call',
        params: {
          name: 'add_subscription',
          arguments: {
            url: 'https://example.com/feed.xml',
            name: 'Test Feed',
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('5');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      expect(result.content).toBeDefined();
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.subscription.name).toBe('Test Feed');
    });

    it('should reject invalid params', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '6',
        method: 'tools/call',
        params: {
          name: 'add_subscription',
          arguments: {
            url: '', // Invalid - empty
            name: 'Test Feed',
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('url is required');
    });
  });

  describe('remove_subscription', () => {
    it('should remove existing subscription', async () => {
      const mockSubscriptions = [
        { id: '1', name: 'Test', url: 'https://example.com', type: 'rss' as const, category: 'Test', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60, createdAt: '2024-01-01', updatedAt: '2024-01-01', useCustomInterval: false },
      ];
      
      (getSubscriptions as any).mockResolvedValue(mockSubscriptions);
      (deleteSubscription as any).mockResolvedValue(undefined);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '7',
        method: 'tools/call',
        params: {
          name: 'remove_subscription',
          arguments: {
            id: '1',
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('7');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.removedId).toBe('1');
    });

    it('should return error for non-existent subscription', async () => {
      (getSubscriptions as any).mockResolvedValue([]);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '8',
        method: 'tools/call',
        params: {
          name: 'remove_subscription',
          arguments: {
            id: 'non-existent-id',
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('Subscription not found');
    });
  });

  describe('fetch_articles', () => {
    it('should fetch articles with pagination', async () => {
      const mockArticles = [
        { id: 'a1', subscriptionId: '1', title: 'Test Article 1', link: 'https://example.com/1', description: 'Description 1', pubDate: '2024-01-01', fetchedAt: '2024-01-01', isRead: false, isStarred: false, isReadLater: false },
        { id: 'a2', subscriptionId: '1', title: 'Test Article 2', link: 'https://example.com/2', description: 'Description 2', pubDate: '2024-01-02', fetchedAt: '2024-01-02', isRead: false, isStarred: false, isReadLater: false },
      ];
      
      (getArticles as any).mockResolvedValue(mockArticles);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '9',
        method: 'tools/call',
        params: {
          name: 'fetch_articles',
          arguments: {
            limit: 10,
            offset: 0,
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.articles).toHaveLength(2);
      expect(parsed.total).toBe(2);
    });
  });

  describe('search_articles', () => {
    it('should search articles by keyword', async () => {
      const mockArticles = [
        { id: 'a1', subscriptionId: '1', title: 'React Tutorial', link: 'https://example.com/1', description: 'Learn React', pubDate: '2024-01-01', fetchedAt: '2024-01-01', isRead: false, isStarred: false, isReadLater: false },
        { id: 'a2', subscriptionId: '1', title: 'Vue Guide', link: 'https://example.com/2', description: 'Learn Vue', pubDate: '2024-01-02', fetchedAt: '2024-01-02', isRead: false, isStarred: false, isReadLater: false },
      ];
      
      (getArticles as any).mockResolvedValue(mockArticles);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '10',
        method: 'tools/call',
        params: {
          name: 'search_articles',
          arguments: {
            keyword: 'React',
            limit: 10,
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.articles).toHaveLength(1);
      expect(parsed.articles[0].title).toBe('React Tutorial');
    });
  });

  describe('summarize_article', () => {
    it('should generate summary for existing article', async () => {
      const mockArticles = [
        { id: 'a1', subscriptionId: '1', title: 'Test Article', link: 'https://example.com/1', description: 'This is a test article with some content for summarization.', content: 'Full article content here.', pubDate: '2024-01-01', fetchedAt: '2024-01-01', isRead: false, isStarred: false, isReadLater: false },
      ];
      
      (getArticles as any).mockResolvedValue(mockArticles);
      (saveSummary as any).mockResolvedValue({
        id: 's1',
        articleId: 'a1',
        subscriptionId: '1',
        content: 'This is a test article with some content for summarization.',
        keywords: ['test', 'article'],
        modelId: 'local-summarizer',
        tokenUsed: 50,
        tags: [],
        isStarred: false,
        createdAt: '2024-01-01',
      });

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '11',
        method: 'tools/call',
        params: {
          name: 'summarize_article',
          arguments: {
            articleId: 'a1',
            length: 'medium',
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.content).toBeDefined();
      expect(parsed.article.title).toBe('Test Article');
    });

    it('should return error for non-existent article', async () => {
      (getArticles as any).mockResolvedValue([]);

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '12',
        method: 'tools/call',
        params: {
          name: 'summarize_article',
          arguments: {
            articleId: 'non-existent-id',
          },
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
      const result = response.result as any;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toContain('Article not found');
    });
  });

  describe('Error Handling', () => {
    it('should return METHOD_NOT_FOUND for unknown method', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '13',
        method: 'unknown/method',
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('13');
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601);
    });

    it('should return METHOD_NOT_FOUND for unknown tool', async () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: '14',
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {},
        },
      };

      const response = await server.handleRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('14');
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601);
    });
  });
});
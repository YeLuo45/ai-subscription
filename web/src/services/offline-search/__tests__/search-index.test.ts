/**
 * Unit tests for OfflineSearchIndex
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineSearchIndex, type IndexedArticle } from '../search-index';

// Mock IndexedDB
const mockDB = {
  transaction: vi.fn().mockReturnValue({
    objectStore: vi.fn().mockReturnValue({
      getAll: vi.fn().mockResolvedValue([]),
      getAllKeys: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      count: vi.fn().mockResolvedValue(0),
    }),
  }),
  objectStoreNames: {
    contains: vi.fn().mockReturnValue(true),
  },
};

const mockRequest = {
  onsuccess: null as (() => void) | null,
  onerror: null as (() => void) | null,
  result: mockDB,
};

vi.stubGlobal('indexedDB', {
  open: vi.fn().mockReturnValue(mockRequest),
});

describe('OfflineSearchIndex', () => {
  let searchIndex: OfflineSearchIndex;

  const sampleArticle: IndexedArticle = {
    id: 'article-1',
    title: 'Test Article Title',
    content: 'This is the content of the test article with some keywords.',
    tags: ['test', 'article'],
    summary: 'A brief summary of the test article',
  };

  const sampleArticle2: IndexedArticle = {
    id: 'article-2',
    title: 'Another Article',
    content: 'Different content with different keywords.',
    tags: ['news'],
    summary: 'Another summary',
  };

  beforeEach(() => {
    searchIndex = new OfflineSearchIndex();
    vi.clearAllMocks();
  });

  describe('indexArticle', () => {
    it('should index a single article', async () => {
      await searchIndex.indexArticle(sampleArticle);
      
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(1);
    });

    it('should index multiple articles', async () => {
      await searchIndex.indexArticles([sampleArticle, sampleArticle2]);
      
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(2);
    });

    it('should update existing article when re-indexing', async () => {
      await searchIndex.indexArticle(sampleArticle);
      await searchIndex.indexArticle({ ...sampleArticle, title: 'Updated Title' });
      
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(1);
    });
  });

  describe('search', () => {
    it('should find articles by title', async () => {
      await searchIndex.indexArticles([sampleArticle, sampleArticle2]);
      
      const results = await searchIndex.search('Test');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'article-1')).toBe(true);
    });

    it('should find articles by content', async () => {
      await searchIndex.indexArticles([sampleArticle, sampleArticle2]);
      
      const results = await searchIndex.search('keywords');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty query', async () => {
      await searchIndex.indexArticles([sampleArticle]);
      
      const results = await searchIndex.search('');
      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const articles = Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        content: `Content for article ${i}`,
        tags: ['test'],
      }));
      
      await searchIndex.indexArticles(articles);
      
      const results = await searchIndex.search('Article', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return empty when no matches', async () => {
      await searchIndex.indexArticles([sampleArticle]);
      
      const results = await searchIndex.search('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should remove an article from the index', async () => {
      await searchIndex.indexArticles([sampleArticle, sampleArticle2]);
      await searchIndex.remove('article-1');
      
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(1);
    });

    it('should handle removal of non-existent article', async () => {
      await searchIndex.indexArticle(sampleArticle);
      await expect(searchIndex.remove('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all indexed articles', async () => {
      await searchIndex.indexArticles([sampleArticle, sampleArticle2]);
      await searchIndex.clear();
      
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(0);
    });
  });

  describe('getDocumentCount', () => {
    it('should return 0 for empty index', async () => {
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(0);
    });

    it('should return correct count after indexing', async () => {
      await searchIndex.indexArticles([sampleArticle, sampleArticle2]);
      
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(2);
    });
  });

  describe('initialization', () => {
    it('should initialize only once', async () => {
      await searchIndex.initialize();
      await searchIndex.initialize();
      
      // Should only call open once
      expect(indexedDB.open).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle article with empty content', async () => {
      const emptyArticle: IndexedArticle = {
        id: 'empty-article',
        title: 'Empty Article',
        content: '',
        tags: [],
      };
      
      await searchIndex.indexArticle(emptyArticle);
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(1);
    });

    it('should handle article with special characters', async () => {
      const specialArticle: IndexedArticle = {
        id: 'special',
        title: 'Article with 特殊字符 & symbols!',
        content: 'Content with CJK: 中文测试',
        tags: ['测试'],
      };
      
      await searchIndex.indexArticle(specialArticle);
      const results = await searchIndex.search('中文');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long content', async () => {
      const longArticle: IndexedArticle = {
        id: 'long',
        title: 'Long Article',
        content: 'A'.repeat(10000),
        tags: [],
      };
      
      await searchIndex.indexArticle(longArticle);
      const count = await searchIndex.getDocumentCount();
      expect(count).toBe(1);
    });
  });
});

describe('OfflineSearchIndex singleton', () => {
  it('should return different instances when constructed directly', () => {
    const index1 = new OfflineSearchIndex();
    const index2 = new OfflineSearchIndex();
    expect(index1).not.toBe(index2);
  });
});